# orchestrator/a2a_client.py — A2A HTTP Client

## What this file does

Implements the **client side of the A2A (Agent-to-Agent) protocol** — the code that
submits a task to a remote agent and polls for the result.

Every call from the orchestrator to a specialist agent goes through `send_task()`.

---

## A2A Protocol in 30 Seconds

```
Client (orchestrator)              Server (agent)
        │                                 │
        │── POST /tasks/send ────────────►│
        │   body: {id: "uuid", message: "query"}
        │◄──────────────────── 200 ───────│
        │   body: {task_id: "uuid"}        │
        │                                 │  [agent runs process_task() in background]
        │── GET /tasks/{task_id} ─────────►│  (after 1s)
        │◄──────────────────── 200 ───────│
        │   body: {status: "working"}      │
        │── GET /tasks/{task_id} ─────────►│  (after 2s)
        │◄──────────────────── 200 ───────│
        │   body: {status: "completed",    │
        │          result: "..."}          │
```

**Why submit-then-poll instead of a blocking POST?**
The agent's work can take 10–30 seconds (web searches, LLM calls). A blocking HTTP
request that long would tie up connections and is fragile on network boundaries. The
submit-then-poll pattern lets both sides stay responsive.

---

## Full File: `orchestrator/a2a_client.py`

### Imports

```python
import asyncio
import logging
from uuid import uuid4

import httpx
```

- `asyncio` — for `asyncio.sleep()` between polls (non-blocking wait).
- `uuid4` — generates a random UUID for each task submission (unique identifier).
- `httpx` — async-native HTTP client. Unlike `requests`, it works inside an async
  event loop without blocking.

---

### Constants

```python
POLL_INTERVAL_SECONDS: float = 1.0
TIMEOUT_SECONDS:       float = 60.0
HTTP_CONNECT_TIMEOUT:  float = 5.0
HTTP_READ_TIMEOUT:     float = 10.0
```

Two distinct timeout concepts:
- **`HTTP_CONNECT_TIMEOUT` / `HTTP_READ_TIMEOUT`** — per-request timeouts. Each
  individual HTTP call (POST or GET) must complete within these limits. 5s to
  establish a TCP connection, 10s to read the response body.
- **`TIMEOUT_SECONDS`** — overall task timeout. The total time we're willing to wait
  for the agent to finish. 60 seconds covers even slow Tavily + LLM calls.

If `HTTP_READ_TIMEOUT` fires, `httpx` raises `httpx.ReadTimeout`. If `TIMEOUT_SECONDS`
is exceeded, `A2AError` is raised by the polling loop.

---

### `A2AError`

```python
class A2AError(Exception):
    """Raised when an A2A agent returns a failed status or cannot be reached."""
```

A custom exception class so callers can catch A2A-specific failures separately from
other `Exception` types. The orchestrator lets this bubble up to `api/main.py`, which
converts it to an HTTP 500 response.

---

### `send_task()` — Step by Step

```python
async def send_task(agent_url: str, message: str) -> str:
```

`async def` — this function is a coroutine. It can be awaited and yields control back
to the event loop during `asyncio.sleep()` and `await client.post/get()`.

```python
    task_id_request = str(uuid4())
    send_url = f"{agent_url}/tasks/send"
    poll_url_template = f"{agent_url}/tasks/{{task_id}}"
```

- `task_id_request` — a UUID we generate on the client side and send in the POST body.
  The server uses this as the request ID (idempotency), but generates its own internal
  `task_id` for the task store.
- The double braces `{{task_id}}` in the template string are escaped braces — they
  produce literal `{task_id}` in the string so we can `.format(task_id=...)` later.

```python
    timeout_cfg = httpx.Timeout(
        connect=HTTP_CONNECT_TIMEOUT,
        read=HTTP_READ_TIMEOUT,
        write=HTTP_CONNECT_TIMEOUT,
        pool=HTTP_CONNECT_TIMEOUT,
    )
```

`httpx.Timeout` lets you set different timeouts for different phases of an HTTP request:
- `connect` — time to establish the TCP connection
- `read` — time to read the response body after the connection is open
- `write` — time to send the request body
- `pool` — time to acquire a connection from the connection pool

```python
    async with httpx.AsyncClient(timeout=timeout_cfg) as client:
```

`async with` — creates the HTTP client and guarantees the underlying connection pool
is closed when the block exits (even on exception). `httpx.AsyncClient` reuses TCP
connections for multiple requests, which is efficient for the submit + multiple polls.

```python
        send_response = await client.post(
            send_url,
            json={"id": task_id_request, "message": message},
        )
        send_response.raise_for_status()
        task_id: str = send_response.json()["task_id"]
```

- `await client.post(...)` — sends the HTTP POST without blocking the event loop.
- `raise_for_status()` — raises `httpx.HTTPStatusError` if the status code is 4xx or
  5xx. This is the httpx equivalent of `requests.Response.raise_for_status()`.
- The server returns `{"task_id": "...", "status": "submitted"}`. We extract `task_id`
  for polling.

---

### Polling Loop

```python
        elapsed: float = 0.0

        while elapsed < TIMEOUT_SECONDS:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            elapsed += POLL_INTERVAL_SECONDS
```

`await asyncio.sleep(1.0)` — pauses this coroutine for 1 second but does NOT block
the event loop. Other coroutines (including the OTHER parallel agent call) continue
running during this pause. This is the key difference from `time.sleep(1.0)`.

```python
            poll_response = await client.get(poll_url)
            poll_response.raise_for_status()
            payload = poll_response.json()
            status: str = payload.get("status", "unknown")
```

Polls the task status endpoint. The server returns:
```json
{"task_id": "...", "status": "working", "result": null}
```
or, when done:
```json
{"task_id": "...", "status": "completed", "result": "...full text..."}
```

```python
            if status == "completed":
                result: str | None = payload.get("result")
                if result is None:
                    raise A2AError(...)
                return result
```

On `"completed"`, validate that `result` is not null (defensive: the server should
always set result on completion, but we guard against bugs), then return the string.

```python
            if status == "failed":
                error_detail = payload.get("result") or payload.get("error") or "no detail"
                raise A2AError(...)
```

If the agent marked the task as `"failed"`, raise immediately — no point continuing
to poll.

```python
        raise A2AError(f"Timeout after {TIMEOUT_SECONDS}s ...")
```

If we exit the while loop naturally (elapsed ≥ 60s) without a terminal status,
the task took too long.

---

## Why httpx Instead of aiohttp or requests?

| Library | Issue |
|---------|-------|
| `requests` | Synchronous — blocks the event loop. Would freeze all other async tasks. |
| `aiohttp` | Async but more complex API. httpx has a nearly identical API to `requests`. |
| `httpx` | Async + sync, familiar API, excellent timeout handling, actively maintained. |

---

## Timeline During Parallel Execution

When both `web_search_node` and `rag_search_node` call `send_task()` in parallel:

```
Time 0.0s  web_search_node: POST /tasks/send to :8001
           rag_search_node: POST /tasks/send to :8002
Time 1.0s  web_search_node: await sleep(1)
           rag_search_node: await sleep(1)
           (both sleeping simultaneously — event loop handles other work)
Time 1.0s  web_search_node: GET /tasks/{id} → status "working"
           rag_search_node: GET /tasks/{id} → status "working"
Time 2.0s  web_search_node: GET /tasks/{id} → status "completed"
           (returns immediately)
Time 3.0s  rag_search_node: GET /tasks/{id} → status "completed"
           (returns)
Time 3.0s  LangGraph: both branches done, advance to synthesize_node
```

Total wall-clock time ≈ time of the SLOWER agent, not the SUM of both.
