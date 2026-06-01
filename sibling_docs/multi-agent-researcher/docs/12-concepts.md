# Concepts Glossary

Every concept used in this project, explained in one place.

---

## Multi-Agent Systems

A pattern where multiple specialized AI agents collaborate to complete a task that
would be too complex for a single agent. Each agent:
- Has a narrow, well-defined responsibility
- Communicates with other agents via a defined protocol
- Can be developed, tested, and replaced independently

**In this project:** The orchestrator delegates to web search, RAG, and synthesis
agents. Each agent is a separate process with its own API.

**Why not one big agent?**
- Separation of concerns — each agent can be specialized for its task
- Parallel execution — web search and RAG run simultaneously, cutting wall-clock time
- Reliability — if one agent fails, only that step is retried, not the whole pipeline
- Composability — agents can be reused in other pipelines

---

## LangGraph

A Python library (part of the LangChain ecosystem) for building stateful multi-actor
applications with LLMs. Key concepts:

**StateGraph** — a directed graph where nodes are Python functions and edges define
execution flow. State is a TypedDict shared across all nodes.

**Nodes** — async Python functions that accept state and return a partial state update.

**Edges** — define what runs after each node. Can be:
- Fixed: `add_edge("node_a", "node_b")` — always goes to node_b
- Conditional: `add_conditional_edges("node_a", func, [...])` — func returns the next node

**`Send`** — LangGraph's parallel dispatch primitive. An edge function can return
`[Send("node_x", state), Send("node_y", state)]` to run both nodes concurrently.

**Fan-out / Fan-in** — `Send` creates the fan-out (multiple nodes start). LangGraph
automatically waits for all branches before advancing (fan-in).

**`ainvoke()`** — runs the compiled graph asynchronously, returns the final state.

**Why LangGraph instead of plain asyncio?**
LangGraph manages state, handles partial updates from parallel nodes, provides
checkpointing (human-in-the-loop), and visualizes the graph. Plain asyncio would
require manual state management and error handling.

---

## A2A Protocol (Agent-to-Agent)

Google's 2025 draft standard for inter-agent HTTP communication. Three core endpoints:

```
GET  /.well-known/agent.json   Agent Card — self-description
POST /tasks/send               Submit a task, returns task_id immediately
GET  /tasks/{task_id}          Poll for task status + result
```

**Agent Card** — a JSON document (inspired by OpenAPI) at the well-known URL that
describes the agent's name, capabilities, and version. Enables agent discovery.

**Task lifecycle:** `submitted → working → completed | failed`

**Why submit-then-poll instead of blocking POST?**
LLM operations take 5–30 seconds. A blocking POST that long is fragile. Submit-then-poll
lets the server return quickly and the client poll asynchronously.

**In this project:** We implement A2A manually with FastAPI — no external SDK needed.
The protocol is just JSON-RPC 2.0 over HTTP.

---

## MCP (Model Context Protocol)

Anthropic's 2024 open standard for connecting LLM clients to external tools and data.
Analogous to USB for AI tools — any MCP client connects to any MCP server.

**Transport:** stdio (local subprocess), HTTP+SSE (remote), WebSocket.

**Protocol:**
1. Client sends `list_tools()` — server returns tool definitions with JSON schemas
2. Client sends `call_tool(name, args)` — server runs the tool and returns `TextContent`

**Tool schema** — a JSON Schema object describing the tool's input parameters.
Claude (and other LLMs) use this to know what arguments to provide.

**In this project:** The MCP server exposes rag-doc-qa tools to Claude Desktop.
The main research pipeline does NOT use MCP at runtime (the RAG agent imports directly).

---

## TypedDict

A Python type from the `typing` module. A dict where every key has a declared type.
Used instead of a Pydantic model for LangGraph state because:
- Nodes return partial dicts (only changed keys) — LangGraph merges them
- TypedDict allows this naturally; Pydantic models would require returning all fields

```python
class ResearchState(TypedDict):
    query: str
    web_results: str
    # ...
```

At runtime, `ResearchState` is just a regular dict. The TypedDict annotation only
affects static type checkers (mypy, pyright) and LangGraph's internal validation.

---

## `asyncio.to_thread()`

Runs a synchronous (blocking) function in a thread pool executor without blocking
the asyncio event loop.

```python
result = await asyncio.to_thread(blocking_function, arg1, arg2)
```

**Why this matters:** Python's asyncio event loop is single-threaded. If you call
a blocking function directly inside an `async def`, you block the entire event loop
— no other coroutines can run until it returns. `asyncio.to_thread()` offloads the
blocking work to a separate thread, freeing the event loop.

**Used for:** ChromaDB queries, Anthropic SDK calls, document processing — any
function that makes synchronous network calls or disk I/O.

**Alternative:** `asyncio.get_event_loop().run_in_executor(None, func, *args)` —
older equivalent. `asyncio.to_thread()` is the modern (Python 3.9+) shorthand.

---

## `asyncio.create_task()`

Schedules a coroutine to run on the event loop without waiting for it.

```python
asyncio.create_task(_run())    # starts _run() in background, returns immediately
```

**Used in:** `base_a2a_server.py` — the POST `/tasks/send` endpoint fires off the
background task with `create_task()` and returns the `task_id` immediately.

**vs `await coroutine()`:** `await` blocks until the coroutine completes.
`create_task()` schedules it and continues executing immediately.

---

## httpx

A Python HTTP client with both sync and async interfaces. Used instead of `requests`
in the A2A client because:
- `requests` is synchronous — calling it in async code blocks the event loop
- `httpx.AsyncClient` is natively async — `await client.get(...)` yields to the event loop
- Similar API to `requests` — easy to learn

**`httpx.Timeout`** — allows different timeouts for connect, read, write, and pool
phases of an HTTP request.

---

## Tavily API

A web search API built specifically for LLM applications. Returns pre-cleaned,
snippet-ready results — no HTML parsing required. Free tier: 1000 searches/month.

**`search_depth="basic"`** — faster and cheaper, returns snippets from search result
pages. `"advanced"` fetches and parses full page content.

---

## RAG (Retrieval-Augmented Generation)

A pattern where relevant documents are retrieved and given to an LLM as context
for answering a question. Prevents hallucination by grounding the answer in source material.

Full explanation in [rag-doc-qa docs](../../rag-doc-qa/docs/13-concepts.md).

---

## Hybrid Search

Combining semantic (embedding-based) search with keyword (BM25) search. Results from
both are merged using Reciprocal Rank Fusion. See rag-doc-qa docs for full details.

---

## Structured Outputs

Getting an LLM to return machine-parseable JSON instead of free-form text.
The `plan_node` uses this: the system prompt instructs Claude to return `{"web_search_query": ..., "rag_query": ...}` and nothing else. The response is parsed with `json.loads()`.

**Challenges:**
- LLMs sometimes add markdown code fences (` ```json ... ``` `) — must strip them
- Field names must match exactly — the prompt specifies the exact JSON structure

---

## Microservices Pattern

Breaking an application into small, independently deployable services. Each service
in this project:
- Has a single responsibility (web search, RAG, synthesis)
- Communicates over HTTP (A2A protocol)
- Can be replaced without affecting other services
- Runs as its own process on its own port

**Trade-off:** More complex to set up (5 terminals/processes) vs. simpler monolith.
Worth it here because it demonstrates real-world production patterns.

---

## Factory Function Pattern

A function that creates and returns another object (typically a class instance or
configured object). `create_a2a_app()` is a factory — it takes configuration parameters
and returns a fully configured FastAPI app.

**Advantages over a base class:**
- Simpler — no class hierarchy
- More flexible — behavior is injected via `process_task` callable
- Each call creates an isolated instance with its own task store (closure)

---

## Closure

A function that "closes over" variables from its enclosing scope. In `create_a2a_app()`:

```python
def create_a2a_app(...):
    tasks = {}           # ← this variable

    @app.post("/tasks/send")
    async def send_task(request):
        tasks[new_id] = ...  # ← is captured by these inner functions
```

The inner endpoint functions (`send_task`, `get_task`) capture `tasks` from the outer
scope. Each call to `create_a2a_app()` creates a new `tasks` dict that is independent
for each agent.

---

## Pydantic `Field`

A Pydantic utility for adding metadata to model fields:

```python
query: str = Field(..., min_length=3, max_length=2000, description="...", examples=["..."])
```

- `...` (Ellipsis) — required field (no default)
- `min_length`, `max_length` — validation constraints
- `description` — shown in FastAPI's auto-generated Swagger UI
- `examples` — sample values shown in Swagger UI

---

## `/.well-known/` URL Path

RFC 8615 defines `/.well-known/` as a standardised namespace for service-level
metadata URLs. Examples:
- `/.well-known/agent.json` — A2A Agent Card (this project)
- `/.well-known/openid-configuration` — OAuth/OIDC server metadata
- `/.well-known/security.txt` — security disclosure contact

Using the standard path means any A2A-aware tool knows exactly where to find agent
metadata without documentation.

---

## `ensure_ascii=False` in `json.dumps()`

By default, `json.dumps()` escapes all non-ASCII characters:
```python
json.dumps({"text": "café"})  →  '{"text": "caf\\u00e9"}'
```

With `ensure_ascii=False`:
```python
json.dumps({"text": "café"}, ensure_ascii=False)  →  '{"text": "café"}'
```

Used throughout this project when JSON payloads may contain non-English text from
web search results or uploaded documents. The resulting strings are more readable
and slightly smaller.
