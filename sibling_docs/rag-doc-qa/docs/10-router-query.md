# routers/query.py — Query API Endpoint

**File:** `app/routers/query.py`

## What This File Does

Defines the single most important endpoint in the entire API: `POST /query`. This is where users ask questions and get answers. It's intentionally simple — all the complexity is in the services it calls.

## Line-by-Line Explanation

```python
import time

from fastapi import APIRouter, HTTPException

from app.models import QueryRequest, QueryResponse, SourceReference
from app.services import qa_chain
```
**Lines 1-6:**
- `time` — For measuring query duration.
- `QueryRequest` — Validates the incoming question and optional chat history.
- `QueryResponse` — Structures the answer with sources and timing.
- `SourceReference` — Individual source citation model.
- `qa_chain` — The service that does the actual retrieval + generation.

```python
router = APIRouter(tags=["Query"])
```
**Line 8:** Router without a prefix — the endpoint will be at `/query` (not `/query/query`). Tagged "Query" for Swagger docs grouping.

```python
@router.post("/query", response_model=QueryResponse)
def query_documents(request: QueryRequest):
    """Ask a question about your uploaded documents."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
```
**Lines 11-15:**
- `request: QueryRequest` — FastAPI automatically parses the JSON body into a `QueryRequest` object. If the JSON is malformed or missing `question`, FastAPI returns 422 automatically.
- `.strip()` — Catches questions that are only whitespace (like `"   "`). The Pydantic model ensures `question` exists, but we additionally check it's not blank.

```python
    start_time = time.time()

    try:
        result = qa_chain.answer_question(request.question, request.chat_history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

    time_taken = round(time.time() - start_time, 2)
```
**Lines 17-24:**
- `time.time()` — Records the start time in seconds.
- `qa_chain.answer_question(...)` — Calls the full RAG pipeline: hybrid search → context formatting → Claude generation.
- `round(..., 2)` — Rounds to 2 decimal places (e.g., `4.23` seconds).
- The timing includes: embedding the query, searching ChromaDB, running BM25, fusing results, and waiting for Claude's response. Typically 2-5 seconds, mostly spent waiting for Claude.

```python
    sources = [SourceReference(**s) for s in result["sources"]]

    return QueryResponse(
        question=request.question,
        answer=result["answer"],
        sources=sources,
        time_taken_seconds=time_taken,
    )
```
**Lines 26-33:**
- `[SourceReference(**s) for s in result["sources"]]` — Converts raw dictionaries from `qa_chain` into validated Pydantic models. This ensures the response schema is exactly what we promised in `QueryResponse`.
- The response includes everything the frontend needs: the question (echoed back), the answer, structured sources, and timing.

## Design Note: Why This File Is So Small

This router is intentionally thin. It handles only HTTP concerns:
- Input validation (empty question check)
- Error handling (try/except → HTTPException)
- Response formatting (dict → Pydantic model)
- Timing

All business logic lives in `qa_chain.py`. This separation is called the **"thin controller" pattern** — routers handle HTTP, services handle logic. Benefits:
- You can test `qa_chain.answer_question()` directly without HTTP.
- You could add a CLI interface that calls `qa_chain` without any router changes.
- The router stays readable at a glance.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Thin Controller** | Router handles HTTP only; logic lives in services |
| **Request Body Parsing** | FastAPI auto-parses JSON body into Pydantic model |
| **Response Timing** | Measuring end-to-end query performance |
| **Error Propagation** | Service exceptions → HTTP 500 with error message |

## Why This Matters for Interviews

"The query router follows the thin controller pattern — it only handles HTTP concerns like validation, error mapping, and timing. All the RAG logic lives in the service layer. This means I can test the retrieval pipeline independently and could easily add other interfaces (CLI, WebSocket) without duplicating business logic."
