# orchestrator/graph.py — LangGraph State Machine

## What this file does

Defines and compiles the **LangGraph research pipeline** — the state machine that
decomposes a user question, dispatches to specialist agents, and synthesises the
final report.

---

## Execution Flow

```
START
  │
  ▼
plan_node          → Claude Haiku decomposes query → 2 sub-tasks
  │
  │ dispatch_parallel_searches() returns [Send(...), Send(...)]
  ├─────────────────────────────────────┐
  ▼                                     ▼
web_search_node                    rag_search_node
(A2A → :8001)                      (A2A → :8002)
  │                                     │
  └────────────────┬────────────────────┘
                   │ fan-in (LangGraph waits for both)
                   ▼
           synthesize_node       → A2A → :8003 → Claude Sonnet
                   │
                   ▼
                  END
```

---

## Imports

```python
import json
import logging
import os
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.constants import END, START, Send
from langgraph.graph import StateGraph

from orchestrator.a2a_client import send_task
from orchestrator.state import ResearchState
```

- `ChatAnthropic` — LangChain wrapper around the Anthropic Python SDK. Provides a
  `.ainvoke()` async method that returns a LangChain `AIMessage`.
- `HumanMessage`, `SystemMessage` — LangChain message types. These map to the
  `{"role": "user"/"system", "content": "..."}` format Claude expects.
- `END`, `START` — LangGraph's sentinel constants for the graph entry and exit nodes.
- `Send` — LangGraph's parallel dispatch primitive. Returns a `Send` object from an
  edge function to tell LangGraph to run a specific node with a specific state snapshot.
- `StateGraph` — the main class for building LangGraph graphs.

---

## Constants

```python
WEB_SEARCH_AGENT_URL = os.getenv("WEB_SEARCH_AGENT_URL", "http://localhost:8001")
RAG_AGENT_URL        = os.getenv("RAG_AGENT_URL",        "http://localhost:8002")
SYNTHESIS_AGENT_URL  = os.getenv("SYNTHESIS_AGENT_URL",  "http://localhost:8003")
PLANNER_MODEL        = os.getenv("PLANNER_MODEL",        "claude-haiku-4-5-20251001")
```

Agent URLs are read from environment variables with localhost defaults. In Docker,
you'd set `WEB_SEARCH_AGENT_URL=http://web_search:8001` to use Docker's internal DNS.

`claude-haiku-4-5-20251001` is used for planning because it's the fastest and cheapest
Claude model — the planning task only needs to produce a small JSON object, not a
long answer.

---

## Planner System Prompt

```python
PLANNER_SYSTEM_PROMPT = """You are a research planning assistant.
Your job is to decompose a user's research question into exactly two targeted sub-queries:

1. A web search query — designed to find recent, factual, publicly-available information.
2. A RAG (Retrieval-Augmented Generation) query — designed to retrieve relevant passages
   from an internal document knowledge base.

Respond with ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "web_search_query": "<query for live web search>",
  "rag_query": "<query for internal knowledge base>"
}"""
```

**Why "no markdown, no extra text"?** LLMs sometimes wrap JSON in code fences like
` ```json ... ``` `. The prompt explicitly forbids this, and the parser has a fallback
that strips code fences anyway (defensive programming).

**Why two separate query types?** The web search query should be phrased for a search
engine ("latest RAG 2024 benchmarks"), while the RAG query should be phrased for
semantic similarity ("retrieval augmented generation techniques methods").

---

## `plan_node`

```python
async def plan_node(state: ResearchState) -> dict[str, Any]:
```

An `async` function — LangGraph calls `await plan_node(state)` when executing.

```python
    llm = ChatAnthropic(model=PLANNER_MODEL, temperature=0)
```

`temperature=0` — deterministic output. For a planning task you want the same
decomposition every time, not creative variation.

```python
    messages = [
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        HumanMessage(content=f"Research question: {state['query']}"),
    ]
    response = await llm.ainvoke(messages)
    raw_content: str = response.content.strip()
```

`llm.ainvoke()` is the async version of `llm.invoke()`. It sends the messages to
Claude and awaits the response without blocking the event loop.

`response.content` is the raw text returned by Claude — should be a JSON string.

```python
    try:
        plan = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        if "```" in raw_content:
            inner = raw_content.split("```")[1]
            if inner.startswith("json"):
                inner = inner[4:]
            plan = json.loads(inner.strip())
        else:
            raise ValueError(...) from exc
```

**Two-pass JSON parser:**
- First try: `json.loads(raw_content)` — works if Claude followed instructions.
- Fallback: If `json.JSONDecodeError` is raised AND the response contains backticks,
  split on ` ``` ` and take the middle piece (the code block content). Strip the `json`
  language identifier if present, then parse again.
- If neither works, raise `ValueError` to let LangGraph mark the run as failed.

```python
    return {
        "sub_tasks": [web_search_query, rag_query],
        "status": "planning",
    }
```

Nodes return a **partial state dict** — only the keys being updated. LangGraph merges
this into the full `ResearchState`. Any key not in the return dict keeps its old value.

---

## `web_search_node`

```python
async def web_search_node(state: ResearchState) -> dict[str, Any]:
    query = state["sub_tasks"][0]
    result = await send_task(WEB_SEARCH_AGENT_URL, query)
    return {"web_results": result}
```

Simple: reads `sub_tasks[0]`, calls the A2A client, returns only `web_results`.

Does NOT return `status` — updating the same `status` field from both parallel nodes
simultaneously would cause `INVALID_CONCURRENT_GRAPH_UPDATE`.

---

## `rag_search_node`

```python
async def rag_search_node(state: ResearchState) -> dict[str, Any]:
    query = state["sub_tasks"][1]
    result = await send_task(RAG_AGENT_URL, query)
    return {"rag_results": result}
```

Mirror of `web_search_node` — reads `sub_tasks[1]`, returns only `rag_results`.

---

## `synthesize_node`

```python
async def synthesize_node(state: ResearchState) -> dict[str, Any]:
    synthesis_input = json.dumps(
        {
            "query":       state["query"],
            "web_results": state["web_results"],
            "rag_results": state["rag_results"],
        },
        ensure_ascii=False,
    )
```

Bundles the three key pieces into a JSON string for the Synthesis Agent.

`ensure_ascii=False` — allows non-ASCII characters (e.g., accented letters in source
snippets) to pass through as-is rather than being escaped as `\uXXXX`.

```python
    result = await send_task(SYNTHESIS_AGENT_URL, synthesis_input)
    return {
        "synthesis_input": synthesis_input,
        "final_report": result,
        "status": "synthesizing",
    }
```

Returns three fields: the input (for debugging), the final report, and a status label.

---

## `dispatch_parallel_searches` — Fan-Out Edge

```python
def dispatch_parallel_searches(state: ResearchState) -> list[Send]:
    return [
        Send("web_search_node", state),
        Send("rag_search_node", state),
    ]
```

This is the most important function in the file. It is an **edge function** —
called by LangGraph after `plan_node` completes to determine what happens next.

Instead of returning a string (the name of the next node, normal edges), it returns
a **list of `Send` objects**. Each `Send(node_name, state)` tells LangGraph:
"schedule this node to run with this state snapshot."

**What `Send` does internally:**
1. LangGraph enqueues both nodes in its async event loop.
2. Both run concurrently via `asyncio` (not threads — truly async Python).
3. LangGraph collects both return dicts and merges them into the shared state.
4. Only after BOTH complete does it advance to the next edge.

This gives us the fan-out/fan-in pattern for free — no locks, no queues, no
manual `asyncio.gather()`.

---

## `build_graph` — Graph Assembly

```python
def build_graph() -> Any:
    builder = StateGraph(ResearchState)
```

`StateGraph(ResearchState)` creates a new graph builder that validates every node's
return dict against the `ResearchState` TypedDict.

```python
    builder.add_node("plan_node",      plan_node)
    builder.add_node("web_search_node", web_search_node)
    builder.add_node("rag_search_node", rag_search_node)
    builder.add_node("synthesize_node", synthesize_node)
```

Registers the four node functions with string labels. The string labels are what
`Send("web_search_node", ...)` refers to.

```python
    builder.add_edge(START, "plan_node")
```

Normal edge: graph always starts at `plan_node`.

```python
    builder.add_conditional_edges(
        "plan_node",
        dispatch_parallel_searches,
        ["web_search_node", "rag_search_node"],
    )
```

**Conditional edge with `Send`:**
- After `plan_node`, call `dispatch_parallel_searches(state)`.
- The third argument declares which nodes the function might route to — LangGraph
  uses this to validate the graph topology at compile time.
- The function returns `[Send(...), Send(...)]` — so both are scheduled in parallel.

```python
    builder.add_edge("web_search_node", "synthesize_node")
    builder.add_edge("rag_search_node", "synthesize_node")
```

Both parallel branches converge at `synthesize_node`. LangGraph waits for
both before proceeding — this is the automatic fan-in.

```python
    builder.add_edge("synthesize_node", END)
    compiled = builder.compile()
    return compiled
```

`builder.compile()` validates the graph (checks for unreachable nodes, invalid edges)
and returns a `CompiledGraph` object with an `ainvoke()` method.

---

## Module-Level Execution

```python
graph = build_graph()
```

The graph is built once when the module is first imported by `api/main.py`. All
subsequent `/research` requests reuse the same compiled graph — no re-compilation
overhead per request.

---

## Why LangGraph?

| Alternative | Problem |
|-------------|---------|
| Manual `asyncio.gather()` | No state management, error handling must be hand-coded |
| LangChain Chains | Linear only, no branching or parallel fan-out |
| Celery/task queues | Heavyweight, separate broker needed, overkill for 4 nodes |
| LangGraph | State is a TypedDict, parallel branches are first-class, human-in-the-loop ready |
