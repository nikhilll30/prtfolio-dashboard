# models.py — Request/Response Schemas

**File:** `app/models.py`

## What This File Does

Defines the **shape of every request and response** in the API using Pydantic models. FastAPI uses these to:
1. **Validate** incoming requests (reject bad data with clear error messages)
2. **Serialize** responses (convert Python objects to JSON)
3. **Generate API docs** (the Swagger UI at `/docs` reads these schemas)

## Line-by-Line Explanation

```python
from pydantic import BaseModel
```
**Line 1:** `BaseModel` is the foundation for all Pydantic data models. Any class that extends it gets automatic validation, serialization, and documentation.

---

### UploadResponse

```python
class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    num_chunks: int
    num_pages: int | None
    message: str
```
**Lines 4-9:** What the API returns after a successful file upload.
- `doc_id: str` — A UUID that uniquely identifies this document. Used for deletion and chunk inspection.
- `filename: str` — The original filename the user uploaded.
- `num_chunks: int` — How many pieces the document was split into. Gives the user a sense of document size.
- `num_pages: int | None` — Page count for PDFs. `None` for TXT/DOCX (they don't have "pages"). The `int | None` syntax (Python 3.10+) means "this can be an integer OR null in JSON."
- `message: str` — Human-readable summary like "Successfully processed 'report.pdf' into 12 chunks."

---

### DocumentInfo

```python
class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    num_chunks: int
    num_pages: int | None
```
**Lines 12-16:** A lighter version of UploadResponse used when listing all documents. Same fields minus the `message` — when listing 10 documents, you don't need 10 success messages.

---

### SourceReference

```python
class SourceReference(BaseModel):
    filename: str
    page: int | None
    chunk_index: int
    snippet: str
```
**Lines 19-23:** Represents one source citation in an answer. This is what makes our RAG system trustworthy — users can verify the answer against the original text.
- `filename` — Which document this chunk came from.
- `page` — Which page (1-indexed, human-friendly). `None` for non-PDF files.
- `chunk_index` — Which chunk within the document (0-indexed).
- `snippet` — First 200 characters of the chunk, so the user gets a preview without seeing the full text.

---

### QueryRequest

```python
class QueryRequest(BaseModel):
    question: str
    chat_history: list[dict[str, str]] = []
```
**Lines 26-28:** What the user sends to ask a question.
- `question: str` — The natural language question. Pydantic ensures this is present — a request without `question` returns a 422 error automatically.
- `chat_history: list[dict[str, str]] = []` — Previous conversation turns for follow-up questions. Each dict has `{"role": "user"|"assistant", "content": "..."}`. Defaults to empty list (no history), so this field is optional.

---

### QueryResponse

```python
class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceReference]
    time_taken_seconds: float
```
**Lines 31-35:** The full answer returned to the user.
- `question` — Echoed back for logging/display purposes.
- `answer` — Claude's generated answer with inline citations.
- `sources: list[SourceReference]` — The structured source references (see above). This is a **nested model** — Pydantic automatically serializes the list of `SourceReference` objects into JSON arrays.
- `time_taken_seconds` — How long the query took. Useful for monitoring performance.

---

### DeleteResponse

```python
class DeleteResponse(BaseModel):
    doc_id: str
    message: str
```
**Lines 38-40:** Confirmation after deleting a document and its chunks.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Pydantic BaseModel** | Data validation and serialization class |
| **Type Hints** | Python type annotations (`str`, `int`, `list[dict]`) that Pydantic enforces at runtime |
| **Optional Types** | `int \| None` means the field can be null in JSON |
| **Default Values** | `chat_history = []` makes the field optional in requests |
| **Nested Models** | `list[SourceReference]` — models inside models, auto-serialized |
| **Request/Response Pattern** | Separate models for input vs output, a REST API best practice |

## Why This Matters for Interviews

"I defined strict schemas for every API endpoint. This gives us three things for free: request validation (bad data is rejected with clear error messages), automatic JSON serialization, and auto-generated Swagger documentation. The nested `SourceReference` model shows how Pydantic handles complex response structures cleanly."
