# orchestrator/state.py — ResearchState

## What this file does

Defines the **shared state** that flows through every node in the LangGraph graph.
Think of it as the "clipboard" the entire pipeline reads from and writes to.

---

## Full File: `orchestrator/state.py`

```python
from typing import TypedDict, Optional


class ResearchState(TypedDict):
    query: str
    sub_tasks: list[str]
    web_results: str
    rag_results: str
    synthesis_input: str
    final_report: str
    status: str
    error: Optional[str]
```

---

## Line-by-Line Explanation

### `from typing import TypedDict, Optional`

- `TypedDict` — a special dict subclass from Python's `typing` module where every key
  has a declared type. The dict is still a regular Python dict at runtime, but type
  checkers (mypy, pyright) and LangGraph's internal validation treat the types as
  contracts.
- `Optional[str]` — shorthand for `str | None`. Used for the `error` field because it
  only has a value when something goes wrong; it's `None` during normal execution.

---

### `class ResearchState(TypedDict):`

Inheriting from `TypedDict` tells Python (and LangGraph) that every instance of this
class must be a dict with exactly these keys and their declared types.

**Why TypedDict instead of a Pydantic model or a dataclass?**

LangGraph requires state to be a `TypedDict`. Internally, LangGraph merges partial
state updates from each node (e.g., `{"web_results": "..."}`) into the shared state
dict. TypedDict allows that partial-update pattern naturally — you don't need to
provide all fields when a node returns, just the ones it changed.

If you used a Pydantic model you'd need to return the entire model every time; that
breaks the parallel fan-out pattern where two nodes each write different fields
simultaneously.

---

### Field-by-Field

#### `query: str`
The original research question submitted by the user. Set once in `api/main.py` when
the initial state is built. Never modified after that — it's the "source of truth" for
all downstream nodes.

#### `sub_tasks: list[str]`
Populated by `plan_node`. A two-element list:
- `sub_tasks[0]` — the web search query (sent to the Web Search Agent)
- `sub_tasks[1]` — the RAG query (sent to the RAG Agent)

Using a list (rather than two separate fields) keeps the plan extensible — a future
planner could decompose into 3 or 4 sub-tasks without changing the state schema.

#### `web_results: str`
Raw text returned by the Web Search Agent. Contains the formatted snippets from
Tavily. Populated by `web_search_node`, read by `synthesize_node`.

#### `rag_results: str`
Raw text returned by the RAG Agent. Contains the answer + source citations from
ChromaDB + Claude. Populated by `rag_search_node`, read by `synthesize_node`.

**Critical design note:** `web_results` and `rag_results` are SEPARATE fields on
purpose. Both `web_search_node` and `rag_search_node` run in parallel — if they both
wrote to a single `results` field, LangGraph would see two simultaneous writes to the
same key and raise:

```
INVALID_CONCURRENT_GRAPH_UPDATE
```

By assigning each node its own output key, the parallel writes never conflict.

#### `synthesis_input: str`
A JSON string that bundles `query + web_results + rag_results` into a single payload
for the Synthesis Agent. Built by `synthesize_node` before calling the agent. Stored
in state for debugging — you can inspect what was actually sent to the synthesis agent
if the report looks wrong.

#### `final_report: str`
The finished markdown research report returned by the Synthesis Agent. This is the
field the API and UI care about most. Populated by `synthesize_node`.

#### `status: str`
A human-readable label for the current execution phase. Updated by `plan_node`
("planning") and `synthesize_node` ("synthesizing"). In the UI, if `status != "completed"`,
the value is shown as an info banner.

Note: parallel nodes (`web_search_node`, `rag_search_node`) do NOT update `status`
— updating the same field from two concurrent nodes would cause the same
`INVALID_CONCURRENT_GRAPH_UPDATE` error.

#### `error: Optional[str]`
Populated only if an unhandled exception occurs. `None` during normal execution.
Not currently used in the graph nodes directly — the API layer catches exceptions
and raises HTTP 500 — but it's a forward-compatible slot for per-node error reporting.

---

## How State Flows Through the Graph

```
Initial state (set in api/main.py):
{
  "query": "What are the latest advances in RAG?",
  "sub_tasks": [],
  "web_results": "",
  "rag_results": "",
  "synthesis_input": "",
  "final_report": "",
  "status": "starting",
  "error": None,
}

After plan_node:
{
  ...
  "sub_tasks": ["latest RAG systems 2024", "RAG retrieval techniques"],
  "status": "planning",
}

After web_search_node (runs in parallel with rag_search_node):
{
  ...
  "web_results": "Web search results for: ...\n\n1. Title\n   URL: ...",
}

After rag_search_node (runs in parallel with web_search_node):
{
  ...
  "rag_results": "Answer: ...\n\nSources:\n  1. ...",
}

After synthesize_node:
{
  ...
  "synthesis_input": "{\"query\": ..., \"web_results\": ..., \"rag_results\": ...}",
  "final_report": "## Summary\n...\n## Key Findings\n...",
  "status": "synthesizing",
}
```

LangGraph merges each node's return dict into the shared state automatically.
Nodes return only the fields they changed — LangGraph handles the merge.
