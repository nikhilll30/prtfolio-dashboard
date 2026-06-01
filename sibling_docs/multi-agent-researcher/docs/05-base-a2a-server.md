# agents/base_a2a_server.py — Shared A2A Server Factory

## What this file does

Provides a **factory function** `create_a2a_app()` that builds a complete A2A-compliant
FastAPI application. Every specialist agent (web search, RAG, synthesis) calls this
function rather than writing the same boilerplate three times.

This is the server-side counterpart to `a2a_client.py`.

---

## What the Factory Creates

For every agent, the returned FastAPI app exposes:

```
GET  /.well-known/agent.json   →  Agent Card (agent identity + capabilities)
POST /tasks/send               →  Submit a task, returns task_id immediately
GET  /tasks/{task_id}          →  Poll for task status + result
GET  /health                   →  Health check (for Docker, load balancers)
```

---

## Data Models

```python
class TaskRequest(BaseModel):
    id: str
    message: str
```

The body accepted by `POST /tasks/send`. `id` is the client-generated request UUID
(for idempotency/tracing). `message` is the task payload — a plain-English query or
a JSON string depending on the agent.

```python
class TaskSubmittedResponse(BaseModel):
    task_id: str
    status: str = "submitted"
```

Returned immediately when a task is accepted. `task_id` is the server's internal ID
used for polling. The client doesn't reuse its submitted `id` for polling.

```python
class TaskStatusResponse(BaseModel):
    task_id: str
    status: str          # "submitted" | "working" | "completed" | "failed"
    result: str | None = None
```

Returned by the poll endpoint. `result` is `None` until the task completes or fails,
then it holds the agent's output (or error message).

---

## `create_a2a_app()` — Parameter by Parameter

```python
def create_a2a_app(
    *,
    agent_name: str,
    agent_description: str,
    agent_version: str,
    capabilities: list[str],
    port: int,
    process_task: Callable[[str], Coroutine[Any, Any, str]],
) -> FastAPI:
```

- `*` — forces all parameters to be keyword-only. You can't call this as
  `create_a2a_app("Web Search Agent", ...)` — you must write
  `create_a2a_app(agent_name="Web Search Agent", ...)`. This prevents parameter
  order mistakes.
- `process_task: Callable[[str], Coroutine[Any, Any, str]]` — a type annotation
  saying "a callable that takes a string and returns a coroutine that resolves to
  a string." In plain English: an async function `async def process_task(msg: str) -> str`.
  This is the plug-in point where each agent injects its specific logic.

---

## In-Memory Task Store

```python
tasks: dict[str, dict[str, Any]] = {}
```

A plain Python dict defined inside the factory function closure. Each entry:
```python
tasks["some-uuid"] = {"status": "submitted", "result": None}
```

**Why a plain dict?** For a portfolio agent running on a single process, this is
sufficient. In production you'd use Redis or a database so tasks survive restarts and
scale across multiple workers.

**Closure note:** `tasks` is captured by the three endpoint functions below. Each call
to `create_a2a_app()` creates a new, independent `tasks` dict — so each agent has its
own isolated task store.

---

## Agent Card Endpoint

```python
agent_card: dict[str, Any] = {
    "name": agent_name,
    "description": agent_description,
    "version": agent_version,
    "url": f"http://localhost:{port}",
    "capabilities": capabilities,
    "protocol": "a2a/1.0",
}

@app.get("/.well-known/agent.json", tags=["A2A"])
async def get_agent_card() -> dict[str, Any]:
    return agent_card
```

`/.well-known/` is a standardised URL path (RFC 8615) for machine-readable service
metadata. `agent.json` is the A2A Agent Card — a self-description that lets
orchestrators and registries discover what this agent does without reading source code.

Example response for the Web Search Agent:
```json
{
  "name": "Web Search Agent",
  "description": "Searches the live web using the Tavily API...",
  "version": "1.0.0",
  "url": "http://localhost:8001",
  "capabilities": ["web_search", "real_time_information"],
  "protocol": "a2a/1.0"
}
```

---

## POST /tasks/send

```python
@app.post("/tasks/send", response_model=TaskSubmittedResponse)
async def send_task(request: TaskRequest) -> TaskSubmittedResponse:
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "submitted", "result": None}
```

A new UUID is generated server-side for every task. This is independent of the
client's `request.id` — two different IDs on purpose: the client's ID is for its own
tracking; the server's `task_id` is the key in the server's `tasks` dict.

```python
    async def _run() -> None:
        tasks[task_id]["status"] = "working"
        try:
            result = await process_task(request.message)
            tasks[task_id]["status"] = "completed"
            tasks[task_id]["result"] = result
        except Exception as exc:
            tasks[task_id]["status"] = "failed"
            tasks[task_id]["result"] = f"Error: {exc}"

    asyncio.create_task(_run())
    return TaskSubmittedResponse(task_id=task_id, status="submitted")
```

**`asyncio.create_task(_run())`** — this is the core of the non-blocking design.
- `_run()` is a coroutine (inner async function).
- `asyncio.create_task()` schedules it to run on the event loop but does NOT await it.
- The outer `send_task` endpoint returns the `TaskSubmittedResponse` **immediately**,
  before `_run()` even starts.
- `_run()` executes in the background concurrently with future requests.

**Why not `await _run()` directly?** If we awaited it, the POST endpoint would block
for 10–30 seconds before responding. The A2A protocol requires immediate acknowledgment
so the client can poll separately.

**`noqa: BLE001`** in the except clause — suppresses the "blind exception" linter
warning. Catching bare `Exception` is intentional here: we don't want any agent
failure to crash the server; instead we capture the error as a task result.

---

## GET /tasks/{task_id}

```python
@app.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task(task_id: str) -> TaskStatusResponse:
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    task = tasks[task_id]
    return TaskStatusResponse(
        task_id=task_id,
        status=task["status"],
        result=task["result"],
    )
```

Simple dict lookup. If the `task_id` doesn't exist (e.g., wrong ID, server restart,
expired), returns HTTP 404. FastAPI automatically converts `HTTPException` to the
appropriate JSON error response.

---

## Task Lifecycle State Machine

```
                    POST /tasks/send received
                            │
                            ▼
                       "submitted"
                            │
                    asyncio.create_task() fires
                            │
                            ▼
                        "working"
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
          "completed"                "failed"
       result = "..."         result = "Error: ..."
```

The `status` field transitions through these four states. The A2A client polls
until it sees `"completed"` or `"failed"`.

---

## Factory Pattern — Why Not Subclassing?

An alternative design would be an `A2AAgent` base class with a `process_task` abstract
method. The factory pattern was chosen instead because:

1. **Simplicity** — each agent is just a module with a `process_task` function and
   a call to `create_a2a_app()`. No class inheritance needed.
2. **Testability** — `create_a2a_app()` can be called in tests with a mock
   `process_task` function.
3. **No shared state between agents** — each call to `create_a2a_app()` creates a
   new independent `tasks` dict via closure.
