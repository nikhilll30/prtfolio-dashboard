# Interview Prep — Multi-Agent Research Assistant

25 questions covering LangGraph, A2A, MCP, async Python, and system design.
Every answer is grounded in this project's actual code.

---

## LangGraph

**Q1: What is LangGraph and why did you use it instead of plain asyncio?**

LangGraph is a library for building stateful multi-actor applications. I used it
because it provides:
- A TypedDict-based state that all nodes share and update
- First-class parallel fan-out with the `Send` API
- Automatic fan-in — it waits for all parallel branches before continuing
- Conditional edges for routing decisions

With plain asyncio I'd need to manually manage the shared state dict, handle concurrent
writes, and implement the fan-in with `asyncio.gather()`. LangGraph handles all of that.

---

**Q2: How does the parallel fan-out work in your LangGraph graph?**

After `plan_node` finishes, I use `add_conditional_edges()` with a function that
returns a list of `Send` objects:

```python
def dispatch_parallel_searches(state):
    return [
        Send("web_search_node", state),
        Send("rag_search_node", state),
    ]
```

Each `Send` tells LangGraph to schedule that node with the given state snapshot.
LangGraph runs both concurrently in the asyncio event loop. After both complete,
it merges their partial state updates before advancing to `synthesize_node`.

---

**Q3: Why do your parallel nodes not update the `status` field?**

If both `web_search_node` and `rag_search_node` return `{"status": "..."}` simultaneously,
LangGraph sees two concurrent writes to the same state key and raises
`INVALID_CONCURRENT_GRAPH_UPDATE`. Each parallel node must write to different keys.
I resolved this by removing `status` from the parallel nodes' return dicts — only
`plan_node` and `synthesize_node` update it.

---

**Q4: What's the difference between `add_edge` and `add_conditional_edges`?**

- `add_edge("a", "b")` — always routes from node a to node b
- `add_conditional_edges("a", func, [possible_nodes])` — calls `func(state)` after
  node a, which can return a node name (string) OR a list of `Send` objects for
  parallel dispatch. The third argument declares valid destinations for graph validation.

---

**Q5: What does `graph.ainvoke(initial_state)` return?**

The final `ResearchState` dict after all nodes have executed. It contains the
fully populated state: `final_report`, `web_results`, `rag_results`, `status`, etc.
`ainvoke` is the async version of `invoke` — it must be awaited in an async context.

---

## A2A Protocol

**Q6: What is the A2A protocol and why use it for inter-service communication?**

A2A (Agent-to-Agent) is Google's 2025 draft standard for HTTP communication between
AI agents. Three endpoints: Agent Card at `/.well-known/agent.json`, task submission
at `POST /tasks/send`, and polling at `GET /tasks/{task_id}`.

I used it because:
- It's a real emerging standard — shows awareness of the ecosystem
- The submit-then-poll pattern handles long-running LLM operations gracefully
- Each agent is independently discoverable via its Agent Card
- Standard protocol means any agent can be swapped without changing the orchestrator

---

**Q7: Why does the A2A task submission return immediately rather than blocking?**

LLM operations (web search + parsing, ChromaDB + Claude) take 10–30 seconds.
A blocking POST of that duration would tie up HTTP connections and is fragile.
The submit-then-poll pattern lets the server respond immediately (task submitted) and
the client check progress asynchronously. This is also more resilient — if the client
disconnects and reconnects, it can resume polling.

---

**Q8: How did you implement the A2A server without an external SDK?**

With FastAPI. The `base_a2a_server.py` factory creates a FastAPI app with three
endpoints. `POST /tasks/send` uses `asyncio.create_task()` to run `process_task()`
in the background without blocking the response. Task state is stored in an in-memory
dict. The `GET /tasks/{task_id}` endpoint looks up status from that dict.

---

**Q9: What happens if an agent fails while processing a task?**

The inner `_run()` coroutine in `base_a2a_server.py` has a broad `except Exception`
handler. Any failure sets `tasks[task_id]["status"] = "failed"` and stores the error
message in `result`. When the orchestrator polls and sees `status == "failed"`, it
raises `A2AError`, which propagates to `api/main.py` and becomes an HTTP 500 response.

---

## MCP Protocol

**Q10: What is MCP and what does your MCP server expose?**

Model Context Protocol is Anthropic's 2024 open standard for connecting LLM clients
to tools. My MCP server exposes three tools:
- `search_documents(query, k)` — hybrid search over the knowledge base
- `answer_with_rag(question)` — full RAG answer with citations
- `list_documents()` — enumerate indexed documents

It uses stdio transport, so Claude Desktop can spawn it as a subprocess.

---

**Q11: Does the main pipeline use the MCP server?**

No — the MCP server is a standalone tool for connecting Claude Desktop to the same
knowledge base. The RAG Agent imports `rag-doc-qa` directly via `sys.path` injection.
I built the MCP server to demonstrate the protocol; the direct import is simpler and
faster for the pipeline.

---

**Q12: Why does the MCP server log to stderr instead of stdout?**

The MCP stdio transport uses stdout for the JSON protocol messages. Any text written
to stdout would corrupt the protocol framing. Logging must go to stderr.

---

## Async Python

**Q13: Why do you use `asyncio.to_thread()` in multiple places?**

The Anthropic Python SDK, ChromaDB, and `process_upload` are all synchronous. Calling
them directly inside an `async def` would block the asyncio event loop — no other
coroutines could run while they execute. `asyncio.to_thread()` runs them in a thread
pool, so the event loop stays responsive.

**Q14: What's the difference between `asyncio.create_task()` and `await coroutine()`?**

- `await coroutine()` — suspends the current coroutine until the awaited one completes
- `asyncio.create_task(coroutine())` — schedules the coroutine to run concurrently and
  returns immediately

Used in `base_a2a_server.py`: we `create_task(_run())` so the POST endpoint returns
the `task_id` without waiting for the task to finish.

**Q15: What would happen if you called `time.sleep(1)` instead of `await asyncio.sleep(1)` in the A2A polling loop?**

`time.sleep(1)` blocks the entire OS thread — the asyncio event loop cannot run any
other coroutines during that second. If both `web_search_node` and `rag_search_node`
are polling simultaneously, they'd each block for 1 second alternately rather than
truly running in parallel. The fix is `await asyncio.sleep(1)`, which suspends only
the current coroutine while the event loop processes other work.

---

## System Design

**Q16: How does the orchestrator pass context to the synthesis agent?**

`synthesize_node` builds a JSON string:
```python
synthesis_input = json.dumps({
    "query": state["query"],
    "web_results": state["web_results"],
    "rag_results": state["rag_results"],
})
```
This JSON is sent as the `message` field in the A2A task request. The Synthesis Agent
parses it with `json.loads()`. Using JSON (rather than concatenated plain text) ensures
the three fields are cleanly separated and parseable.

**Q17: Why does each agent do `sys.path.insert(0, str(_PROJECT_ROOT))`?**

Python resolves imports relative to `sys.path`. When you run
`python agents/web_search/agent.py`, the working directory may not be
`multi-agent-researcher/`, so `from agents.base_a2a_server import ...` would fail.
Inserting `_PROJECT_ROOT` at position 0 ensures it's checked first.

**Q18: Why use `sys.path` injection to reuse rag-doc-qa instead of copying the code?**

Copying would create two independent codebases that can drift. More importantly, the
RAG pipeline uses a shared `chroma_db/` directory — copying the code would still
require a shared database. The `sys.path` approach means:
- One codebase, zero duplication
- One ChromaDB — documents uploaded via the orchestrator are immediately available
- Changes to rag-doc-qa (new models, prompt tweaks) automatically apply to this project

**Q19: How would you scale this system if it needed to handle 100 concurrent research requests?**

- Replace the in-memory task store with Redis
- Deploy each agent as a horizontally scaled service (multiple instances behind a load balancer)
- Use a proper task queue (Celery, RQ, or Cloud Tasks) instead of `asyncio.create_task()`
- Add database persistence for LangGraph state (LangGraph has built-in PostgreSQL checkpointing)
- Use `uvicorn --workers N` for the FastAPI services

**Q20: What would you change to add a new specialist agent (e.g., a code search agent)?**

1. Create `agents/code_search/agent.py` with a `process_task()` function and call `create_a2a_app()`
2. Add `code_search_results: str` to `ResearchState` in `state.py`
3. Add `code_search_node` to `graph.py`
4. Add another `Send("code_search_node", state)` to `dispatch_parallel_searches()`
5. Update `synthesize_node` to include `code_search_results` in the payload

Everything else (the A2A client, base server, UI) works unchanged.

---

## Debugging & Errors

**Q21: You encountered `INVALID_CONCURRENT_GRAPH_UPDATE`. What caused it and how did you fix it?**

Both `web_search_node` and `rag_search_node` were returning `{"status": "web_searching"}`
and `{"status": "rag_searching"}` simultaneously. LangGraph tried to merge both updates
into the `status` field and detected a conflict. Fix: removed `status` from both parallel
nodes' return dicts. Only the sequential nodes (`plan_node`, `synthesize_node`) update it.

**Q22: You hit `httpx.ReadTimeout` on the synthesis POST. What caused it and how did you fix it?**

The Synthesis Agent's `process_task()` called `client.messages.create()` (synchronous
Anthropic SDK) directly inside an `async def`. This blocked the asyncio event loop for
10–15 seconds — the event loop couldn't send the HTTP response back to the A2A client,
causing a read timeout. Fix: wrapped the Claude call in `asyncio.to_thread(_call_claude)`.

**Q23: What's the Pydantic `"extra": "ignore"` fix you needed for rag-doc-qa?**

`rag-doc-qa`'s `Settings` class (Pydantic BaseSettings) had strict field validation.
When `TAVILY_API_KEY` was in the environment (loaded from multi-agent-researcher's `.env`),
Pydantic rejected it as an unexpected field. Fix: added `"extra": "ignore"` to
rag-doc-qa's `model_config`, telling Pydantic to silently ignore unknown environment variables.

---

## Design Decisions

**Q24: Why did you choose `claude-haiku-4-5-20251001` for the planner and `claude-sonnet-4-6` for synthesis?**

The planner task is simple: decompose a question into two sub-queries and return valid JSON.
Haiku is 3× faster and much cheaper than Sonnet, and JSON generation is well within its
capability.

Synthesis requires reading two large result sets, identifying contradictions, and writing
a structured 400-word report — a genuine reasoning task where Sonnet's quality advantage
is worth the cost.

**Q25: The chroma_db/ folder is gitignored. How do users get it populated?**

The database is populated by uploading documents through the UI. It's gitignored because:
- Binary files don't diff meaningfully in git
- The database is machine-specific (paths, embeddings model version)
- Users will want their own documents, not test documents from the developer

Users upload files via the Streamlit "Upload document to Knowledge Base" expander, which
calls `POST /upload` on the orchestrator, which calls rag-doc-qa's `process_upload()`
to chunk, embed, and index the document into ChromaDB.
