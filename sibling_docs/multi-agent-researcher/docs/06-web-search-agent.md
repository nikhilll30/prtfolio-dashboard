# agents/web_search/agent.py — Web Search Agent

## What this file does

Implements the **Web Search Agent** — a FastAPI A2A server on port 8001 that:
1. Receives a search query from the orchestrator
2. Calls the Tavily API to search the live web
3. Formats and returns the top 5 results (title, URL, snippet)

---

## Imports and Path Setup

```python
import logging
import os
import sys
import textwrap
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from tavily import TavilyClient

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))
load_dotenv(_PROJECT_ROOT / ".env")

from agents.base_a2a_server import create_a2a_app
```

**Path resolution:**
```
agents/web_search/agent.py
    .parent       → agents/web_search/
    .parent.parent → agents/
    .parent.parent.parent → multi-agent-researcher/   ← _PROJECT_ROOT
```

`sys.path.insert(0, str(_PROJECT_ROOT))` adds the project root to Python's module
search path, making `from agents.base_a2a_server import ...` work regardless of where
you run the script from.

`load_dotenv(_PROJECT_ROOT / ".env")` reads the `.env` file to load `TAVILY_API_KEY`
into the environment before any code tries to use it.

The check `if str(_PROJECT_ROOT) not in sys.path` prevents adding the same path twice
if the module is imported multiple times.

---

## Constants

```python
PORT = 8001
MAX_RESULTS = 5
SNIPPET_MAX_CHARS = 300
```

- `MAX_RESULTS = 5` — limit Tavily results to 5. More results = larger payload sent to
  the synthesis agent, which uses more tokens.
- `SNIPPET_MAX_CHARS = 300` — each snippet is truncated to 300 characters. Without
  this, a single web result could be several paragraphs, bloating the synthesis prompt.

---

## `_get_tavily_client()`

```python
def _get_tavily_client() -> TavilyClient:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError(
            "TAVILY_API_KEY is not set. ..."
        )
    return TavilyClient(api_key=api_key)
```

The client is created on every call to `process_task()` rather than at module load
time. This is intentional: if `TAVILY_API_KEY` is missing, the error surfaces at
request time with a clear message, rather than crashing the entire server at startup.

This also makes testing easier — you can patch `os.getenv` to inject a test key.

---

## `process_task()` — Core Logic

```python
async def process_task(message: str) -> str:
    logger.info("Web search query: %r", message)
    client = _get_tavily_client()
```

`%r` in the log format uses `repr()` on the value — it quotes strings, making
it clear in logs that the message is a string and showing any special characters.

```python
    response = client.search(
        query=message,
        search_depth="basic",
        max_results=MAX_RESULTS,
        include_answer=False,
        include_raw_content=False,
    )
```

**Tavily `search()` parameters:**
- `search_depth="basic"` — faster and cheaper than `"advanced"`. Advanced gives
  richer, full-page content; basic gives snippets from search result pages.
- `include_answer=False` — Tavily can optionally synthesize its own answer from
  results. We skip this because our Synthesis Agent will do the synthesis.
- `include_raw_content=False` — raw HTML/full text of pages. Too large; we only need
  the snippet Tavily already extracts.

The `TavilyClient.search()` method is **synchronous** (it blocks). The base A2A server
calls `process_task` inside `asyncio.create_task(_run())`, which runs it in an async
context. For a portfolio project this is fine since the task is already in a background
coroutine. For high throughput you'd wrap it with `asyncio.to_thread()`.

```python
    results = response.get("results", [])
    if not results:
        return f"No web results found for query: {message!r}"
```

Defensive: Tavily might return empty results for very obscure queries. Return a
useful message rather than an empty string so the synthesis agent has something to
work with.

```python
    lines: list[str] = [f"Web search results for: {message!r}\n"]

    for i, item in enumerate(results[:MAX_RESULTS], start=1):
        title   = item.get("title", "No title").strip()
        url     = item.get("url", "").strip()
        content = item.get("content", "").strip()

        snippet = textwrap.shorten(content, width=SNIPPET_MAX_CHARS, placeholder="…")

        lines.append(
            f"{i}. {title}\n"
            f"   URL: {url}\n"
            f"   {snippet}"
        )

    return "\n\n".join(lines)
```

**`textwrap.shorten(content, width=300, placeholder="…")`:**
- Truncates `content` to at most 300 characters at a word boundary.
- Appends `"…"` if truncation occurred.
- Unlike `content[:300]`, `shorten` never cuts a word in half.

**Output format example:**
```
Web search results for: 'latest RAG systems 2024'

1. Advances in Retrieval-Augmented Generation
   URL: https://example.com/rag-advances
   RAG systems have evolved significantly in 2024, with new approaches…

2. Graph RAG: Knowledge Graph + Vector Retrieval
   URL: https://example.com/graph-rag
   GraphRAG combines entity extraction with vector search to improve…
```

This format is human-readable and works well as context for the Synthesis Agent's
prompt.

---

## App Registration

```python
app = create_a2a_app(
    agent_name="Web Search Agent",
    agent_description=(
        "Searches the live web using the Tavily API and returns the top 5 results "
        "(title, URL, snippet) for any research query."
    ),
    agent_version="1.0.0",
    capabilities=["web_search", "real_time_information"],
    port=PORT,
    process_task=process_task,
)
```

One line for the entire A2A server setup. The factory creates the FastAPI app with
all four A2A endpoints wired up. `process_task` is the single injection point for
this agent's specific logic.

---

## Entry Point

```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
```

`host="0.0.0.0"` — listens on all network interfaces. Required in Docker (if you
used `127.0.0.1`, the container would only be accessible to itself).

`if __name__ == "__main__"` — this block only runs when the file is executed directly
(`python agents/web_search/agent.py`). When imported as a module (e.g., in tests),
uvicorn is not started.

---

## Tavily API

Tavily is a search API built specifically for LLM applications. Unlike raw Google/Bing
APIs:
- Results come pre-cleaned (no HTML to parse)
- Snippets are formatted for use as LLM context
- Free tier: 1000 API calls/month
- `search_depth="basic"` is ~2× faster than `"advanced"` and uses half the quota

Sign up at https://app.tavily.com to get `TAVILY_API_KEY`.
