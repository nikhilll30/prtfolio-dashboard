# agents/rag_agent/agent.py — RAG Agent

## What this file does

Implements the **RAG Agent** — a FastAPI A2A server on port 8002 that queries the
`rag-doc-qa` knowledge base and returns a cited answer.

This agent is a **thin wrapper**: it doesn't contain any retrieval or generation logic.
Instead, it reuses the production `answer_question()` function from the sibling
`rag-doc-qa` project by injecting that project's root onto `sys.path`.

---

## The Reuse Strategy — sys.path Surgery

```python
_THIS_FILE       = Path(__file__).resolve()
_AGENTS_DIR      = _THIS_FILE.parent.parent        # .../multi-agent-researcher/agents
_PROJECT_ROOT    = _AGENTS_DIR.parent              # .../multi-agent-researcher
_RAG_PROJECT_ROOT = _PROJECT_ROOT.parent / "rag-doc-qa"
```

Path tree:
```
portfolio_projects/
├── multi-agent-researcher/
│   └── agents/
│       └── rag_agent/
│           └── agent.py      ← _THIS_FILE
└── rag-doc-qa/               ← _RAG_PROJECT_ROOT
    └── app/
        └── services/
            └── qa_chain.py
```

```python
if not _RAG_PROJECT_ROOT.exists():
    raise RuntimeError(
        f"rag-doc-qa project not found at expected path: {_RAG_PROJECT_ROOT}\n"
        "Make sure both projects are siblings inside the same portfolio_projects/ folder."
    )
```

Fail fast with a clear error message if the folder structure doesn't match. This is
much better than getting an obscure `ModuleNotFoundError` 10 lines later.

```python
if str(_RAG_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_RAG_PROJECT_ROOT))
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))
```

**Two path injections:**
1. `_RAG_PROJECT_ROOT` — so `from app.services.qa_chain import answer_question` works
   (rag-doc-qa uses `app/` as the top-level package).
2. `_PROJECT_ROOT` — so `from agents.base_a2a_server import create_a2a_app` works.

---

## Why Reuse Instead of Duplicate?

The RAG pipeline (ChromaDB + BM25 + Claude) involves:
- ~500 lines across 5 service files
- Embedded models (sentence-transformers, 90MB)
- A persisted ChromaDB vector store

Duplicating this would mean:
- Maintaining two copies of the same code
- Keeping two separate ChromaDB databases in sync when documents are uploaded
- Double the disk space for models

By injecting `sys.path`, the RAG Agent uses the **exact same database and models**
as rag-doc-qa. Any document uploaded through the Orchestrator's `/upload` endpoint
immediately becomes searchable by the RAG Agent.

---

## `_format_sources()`

```python
def _format_sources(sources: list[dict]) -> str:
    if not sources:
        return "No sources retrieved."

    lines: list[str] = ["Sources:"]
    for i, src in enumerate(sources[:MAX_SOURCES_DISPLAYED], start=1):
        filename = src.get("filename", "unknown")
        page     = src.get("page")
        snippet  = src.get("snippet", "")
        page_label = f", page {page}" if page else ""
        lines.append(f"  {i}. {filename}{page_label} — {snippet}")

    return "\n".join(lines)
```

Takes the `sources` list from `answer_question()` (list of dicts with filename, page,
snippet keys) and formats it as readable text.

`page_label = f", page {page}" if page else ""` — conditional expression. If the page
number is available, include it; for TXT files without pages, omit it gracefully.

`sources[:MAX_SOURCES_DISPLAYED]` — caps at 5 sources. More than 5 citations in the
synthesis prompt adds noise without improving quality.

---

## `process_task()` — Core Logic

```python
async def process_task(message: str) -> str:
    logger.info("RAG query: %r", message)

    import asyncio
    result = await asyncio.to_thread(answer_question, message, [])
```

`asyncio.to_thread(answer_question, message, [])` — this is critical.

`answer_question()` from rag-doc-qa is a **synchronous** function that:
1. Calls `hybrid_search()` — synchronous ChromaDB + BM25 query
2. Calls Claude via the Anthropic SDK — synchronous HTTP call

Both operations block the current thread. If called directly inside `async def
process_task()`, they would block the entire asyncio event loop, preventing any
other task (including the Web Search Agent's polling loop) from progressing.

`asyncio.to_thread()` solves this by:
1. Picking a thread from Python's `ThreadPoolExecutor`
2. Running `answer_question(message, [])` in that thread
3. Awaiting the thread's completion without blocking the event loop

The second argument `[]` is the chat history — empty because each RAG query is
standalone (no conversation memory in this pipeline).

```python
    answer  = result.get("answer", "No answer generated.")
    sources = result.get("sources", [])

    sources_text = _format_sources(sources)

    return f"Answer: {answer}\n\n{sources_text}"
```

`answer_question()` returns `{"answer": str, "sources": list[dict]}`. We extract
both fields and format them into a single string for the Synthesis Agent.

**Output format example:**
```
Answer: RAG systems in 2024 have focused on hybrid retrieval combining dense
        vector search with sparse BM25 for improved precision. Key advances
        include GraphRAG and ColBERT-based late interaction retrieval.

Sources:
  1. rag_overview.pdf, page 3 — Dense retrieval methods have evolved to incorporate...
  2. rag_benchmarks.pdf, page 7 — BM25 combined with semantic search via RRF shows...
```

---

## App Registration

```python
app = create_a2a_app(
    agent_name="RAG Agent",
    agent_description=(
        "Queries an uploaded document knowledge base using hybrid semantic + BM25 "
        "retrieval and generates citation-backed answers via Claude."
    ),
    agent_version="1.0.0",
    capabilities=["document_qa", "hybrid_retrieval", "citation_generation"],
    port=PORT,
    process_task=process_task,
)
```

Same pattern as the Web Search Agent — one call to the factory, everything else
is handled by `base_a2a_server.py`.

---

## Dependency Chain

```
RAG Agent: process_task(message)
    └── asyncio.to_thread(answer_question, message, [])
            └── rag-doc-qa/app/services/qa_chain.py::answer_question()
                    ├── retriever.hybrid_search(message, k=5)
                    │       ├── ChromaDB semantic search (cosine similarity)
                    │       └── BM25 keyword search + RRF fusion
                    └── Claude (via Anthropic SDK) → answer with citations
```

Everything below `asyncio.to_thread()` runs in a background thread and is borrowed
entirely from the rag-doc-qa project. The RAG Agent adds only:
- A2A protocol wrapping (via base_a2a_server)
- `_format_sources()` for readable text output
- `asyncio.to_thread()` to keep the event loop unblocked
