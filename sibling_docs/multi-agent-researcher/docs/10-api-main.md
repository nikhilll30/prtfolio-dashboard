# api/main.py — FastAPI Orchestrator Entry Point

## What this file does

The **HTTP entry point** for the entire multi-agent system. Runs on port 8000 and
exposes three endpoints:
- `POST /research` — accepts a query, runs the full LangGraph pipeline, returns the report
- `POST /upload` — uploads a document to the knowledge base
- `GET /documents` — lists all indexed documents

The Streamlit UI talks exclusively to this service.

---

## Startup: Environment and Path Setup

```python
from pathlib import Path
from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")
```

`Path(__file__).resolve().parent.parent` — resolves to `multi-agent-researcher/` 
(two levels up from `api/main.py`).

`load_dotenv(...)` is called **before** any other import that might use environment
variables. This is critical — if you import `orchestrator.graph` before loading `.env`,
the `ChatAnthropic` constructor won't find `ANTHROPIC_API_KEY` and will raise an
authentication error.

```python
_RAG_ROOT = _PROJECT_ROOT.parent / "rag-doc-qa"
if str(_RAG_ROOT) not in sys.path:
    sys.path.insert(0, str(_RAG_ROOT))
```

Injects the `rag-doc-qa` project root so the `/upload` and `/documents` endpoints can
import `process_upload` and `get_all_documents_info` from rag-doc-qa.

---

## FastAPI Application

```python
app = FastAPI(
    title="Multi-Agent Research Orchestrator",
    description="...",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`CORSMiddleware` — the Streamlit UI runs on port 8501 and this API is on port 8000.
A browser would block this cross-origin request without CORS headers. `allow_origins=["*"]`
allows any origin during development. In production you'd restrict to your domain.

`allow_credentials=True` — allows cookies/auth headers in cross-origin requests.

---

## Request/Response Schemas

```python
class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000, ...)
```

- `...` (Ellipsis) as the first argument — makes `query` required (no default).
- `min_length=3` — rejects one- or two-character inputs that can't be real questions.
- `max_length=2000` — prevents massive prompts from being passed in.

FastAPI validates incoming request bodies against this model automatically. If `query`
is missing or fails validation, FastAPI returns HTTP 422 before your handler runs.

```python
class ResearchResponse(BaseModel):
    query: str
    final_report: str
    status: str
    web_results: str
    rag_results: str
```

Defines the exact shape of the JSON response. FastAPI serializes the returned
`ResearchResponse` object to JSON and validates it before sending.

---

## `POST /research` — Main Endpoint

```python
@app.post("/research", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
```

`async def` — FastAPI runs async endpoints on the event loop, allowing other requests
to be handled concurrently while `graph.ainvoke()` is running.

```python
    initial_state: ResearchState = {
        "query": request.query,
        "sub_tasks": [],
        "web_results": "",
        "rag_results": "",
        "synthesis_input": "",
        "final_report": "",
        "status": "starting",
        "error": None,
    }
```

Every field in `ResearchState` must be explicitly initialized — LangGraph validates
the TypedDict from the first node. If any required field is missing, LangGraph raises
a validation error before executing any node.

```python
    try:
        result: ResearchState = await graph.ainvoke(initial_state)
    except Exception as exc:
        logger.error(...)
        raise HTTPException(status_code=500, detail=f"Research pipeline failed: {exc}")
```

`await graph.ainvoke(initial_state)` — runs the entire LangGraph pipeline asynchronously
and returns the final `ResearchState` dict when all nodes have completed.

If any node raises an unhandled exception (network error, Claude API failure, etc.),
it propagates here as a Python exception. We catch it and convert to HTTP 500 with a
human-readable detail string.

```python
    if not result.get("final_report"):
        raise HTTPException(
            status_code=500,
            detail="Research pipeline completed but produced no final report.",
        )
```

Double-check: the graph could theoretically "succeed" (no exceptions) but still produce
an empty report if the synthesis agent returned an empty string. Guard against this edge
case explicitly.

```python
    return ResearchResponse(
        query=result["query"],
        final_report=result["final_report"],
        status=result["status"],
        web_results=result["web_results"],
        rag_results=result["rag_results"],
    )
```

Maps fields from `ResearchState` (the graph's TypedDict) to `ResearchResponse` (the
API's Pydantic model). FastAPI serializes this to JSON automatically.

---

## `POST /upload` — Document Upload

```python
@app.post("/upload", tags=["knowledge-base"])
async def upload_document(file: UploadFile = File(...)):
```

`UploadFile` — FastAPI's type for multipart file uploads. Provides:
- `file.filename` — original filename
- `file.read()` — async read of file bytes
- `file.type` — MIME type (e.g., "application/pdf")

`File(...)` — the `...` ellipsis makes the file required.

```python
    from app.services.document_processor import process_upload

    contents = await file.read()
    result = await asyncio.to_thread(process_upload, file.filename, contents)
```

**Why import inside the function?**
The `app.services.document_processor` module imports sentence-transformers and other
heavy libraries at import time. Importing it at the module level would slow down API
startup even for requests that never use the upload feature.

`asyncio.to_thread(process_upload, ...)` — `process_upload` is synchronous (it writes
files, loads models, builds ChromaDB indexes). Running it in a thread keeps the event
loop responsive.

```python
    return {
        "message": f"Document '{file.filename}' uploaded successfully.",
        "doc_id": result["doc_id"],
        "num_chunks": result["num_chunks"],
        "num_pages": result.get("num_pages"),
    }
```

`result.get("num_pages")` — uses `.get()` (returns `None` if key missing) because
TXT files don't have pages; only PDFs provide a page count.

---

## `GET /documents` — List Knowledge Base

```python
@app.get("/documents", tags=["knowledge-base"])
async def list_documents():
    from app.services.vector_store import get_all_documents_info
    docs = await asyncio.to_thread(get_all_documents_info)
    return {"documents": docs}
```

Same pattern: lazy import + `asyncio.to_thread`. Called by the Streamlit UI to show
the "X document(s) in knowledge base" list below the upload form.

---

## `GET /health` — Liveness Probe

```python
@app.get("/health", tags=["ops"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

Returns immediately without checking external dependencies (ChromaDB, agent URLs).
Used by Docker health checks to know when the container is ready to serve traffic.

---

## Module-Level Graph Import

```python
from orchestrator.graph import graph
```

This import happens when the module is first loaded by uvicorn. `graph.py`'s module-
level `graph = build_graph()` runs at this point — the LangGraph state machine is
compiled once at startup, not once per request.

**Startup sequence:**
1. uvicorn loads `api.main`
2. `load_dotenv()` runs — `.env` is loaded
3. `from orchestrator.graph import graph` triggers graph compilation
4. FastAPI app is ready — all `/research` requests share the same compiled graph

---

## Running in Development

```bash
uvicorn api.main:app --reload
```

`--reload` — uvicorn watches for file changes and restarts automatically. Useful during
development. Remove in production.

The `api.main:app` syntax means: module `api.main`, attribute `app` (the FastAPI instance).
