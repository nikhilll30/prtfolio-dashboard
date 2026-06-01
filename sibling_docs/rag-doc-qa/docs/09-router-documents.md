# routers/documents.py — Document Management API

**File:** `app/routers/documents.py`

## What This File Does

Defines all API endpoints for managing documents: uploading, listing, deleting, and inspecting chunks. This is a **FastAPI Router** — a way to group related endpoints and mount them under a URL prefix.

## Line-by-Line Explanation

```python
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models import UploadResponse, DocumentInfo, DeleteResponse
from app.services import document_processor, vector_store
```
**Lines 1-4:**
- `APIRouter` — Groups endpoints under a shared prefix and tag.
- `UploadFile` — FastAPI's abstraction for uploaded files. Provides `.filename`, `.read()`, `.content_type`, etc.
- `File(...)` — A dependency that tells FastAPI this parameter comes from a `multipart/form-data` upload.
- `HTTPException` — Raises HTTP error responses with status codes and messages.

```python
router = APIRouter(prefix="/documents", tags=["Documents"])
```
**Line 6:** Creates a router where all endpoints start with `/documents`.
- `prefix="/documents"` — A `@router.post("/upload")` becomes `POST /documents/upload`.
- `tags=["Documents"]` — Groups these endpoints in the Swagger UI under a "Documents" section.

---

### Upload Endpoint

```python
@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF, TXT, or DOCX file to the document store."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
```
**Lines 9-13:**
- `response_model=UploadResponse` — FastAPI validates the return value against this Pydantic model and generates the response schema in Swagger docs.
- `async def` — The function is asynchronous because `file.read()` is an async operation (reading from a network stream).
- `file: UploadFile = File(...)` — FastAPI parses the multipart upload and provides the file object. `File(...)` means it's required.
- Validates that a filename exists (edge case: some HTTP clients might send empty filenames).

```python
    try:
        file_bytes = await file.read()
        result = document_processor.process_upload(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
```
**Lines 15-21:**
- `await file.read()` — Reads the entire uploaded file into memory as `bytes`. The `await` is necessary because `UploadFile.read()` is async.
- `document_processor.process_upload(...)` — Calls our ingestion pipeline (load → chunk → embed → store).
- **Error handling:** `ValueError` (unsupported file type) → 400 Bad Request. Any other error → 500 Internal Server Error.

```python
    return UploadResponse(
        doc_id=result["doc_id"],
        filename=result["filename"],
        num_chunks=result["num_chunks"],
        num_pages=result["num_pages"],
        message=f"Successfully processed '{result['filename']}' into {result['num_chunks']} chunks",
    )
```
**Lines 23-29:** Returns a structured response. FastAPI automatically serializes this Pydantic model to JSON.

---

### List Documents Endpoint

```python
@router.get("/", response_model=list[DocumentInfo])
def list_documents():
    """List all uploaded documents."""
    docs = vector_store.get_all_documents_info()
    return [DocumentInfo(**doc) for doc in docs]
```
**Lines 32-36:**
- `response_model=list[DocumentInfo]` — Returns a JSON array of document summaries.
- `DocumentInfo(**doc)` — The `**` unpacks the dictionary into keyword arguments: `DocumentInfo(doc_id="abc", filename="report.pdf", ...)`. This is called **dictionary unpacking**.
- `def` (not `async def`) — No async operations needed here.

---

### Delete Document Endpoint

```python
@router.delete("/{doc_id}", response_model=DeleteResponse)
def delete_document(doc_id: str):
    """Delete a document and all its chunks from the store."""
    deleted_count = vector_store.delete_by_doc_id(doc_id)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    return DeleteResponse(
        doc_id=doc_id,
        message=f"Deleted {deleted_count} chunks",
    )
```
**Lines 39-49:**
- `"/{doc_id}"` — **Path parameter.** The URL `DELETE /documents/abc-123` extracts `doc_id="abc-123"`.
- Returns 404 if no chunks were found with that `doc_id`. This handles the case where someone tries to delete an already-deleted or non-existent document.

---

### Chunk Inspection Endpoint

```python
@router.get("/{doc_id}/chunks")
def get_document_chunks(doc_id: str):
    """Get chunk details for a specific document (for the insights panel)."""
    data = vector_store.get_all_by_doc_id(doc_id)
    if not data["ids"]:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    chunks = []
    for i, (doc, metadata) in enumerate(zip(data["documents"], data["metadatas"])):
        chunks.append({
            "chunk_index": metadata.get("chunk_index", i),
            "page_number": metadata.get("page_number", -1),
            "text": doc,
            "length": len(doc),
        })

    return {
        "doc_id": doc_id,
        "filename": data["metadatas"][0]["source_filename"],
        "total_chunks": len(chunks),
        "chunks": sorted(chunks, key=lambda c: c["chunk_index"]),
    }
```
**Lines 52-73:** Returns all chunks for a document — used by the "View Chunks" feature in the Streamlit sidebar.
- `zip(data["documents"], data["metadatas"])` — Iterates documents and metadata in parallel.
- `sorted(..., key=lambda c: c["chunk_index"])` — Returns chunks in order (ChromaDB doesn't guarantee ordering).
- Each chunk includes its full text and character length, so the UI can show chunk size distribution.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **FastAPI Router** | Groups related endpoints under a prefix with shared tags |
| **Path Parameters** | URL segments like `/{doc_id}` extracted as function arguments |
| **File Upload** | `UploadFile` + `File(...)` for handling multipart form data |
| **Async/Await** | Non-blocking I/O for reading uploaded files |
| **HTTP Status Codes** | 200 (success), 400 (bad request), 404 (not found), 500 (server error) |
| **Response Models** | Pydantic models that validate and document API responses |
| **REST Conventions** | POST for create, GET for read, DELETE for delete |
| **Dictionary Unpacking** | `**dict` to pass dictionary values as keyword arguments |

## Why This Matters for Interviews

"I structured the API following REST conventions — POST for upload, GET for listing, DELETE for removal. The router groups all document operations under `/documents` with proper error handling: 400 for bad input, 404 for missing resources, 500 for server errors. The chunk inspection endpoint lets users see exactly how their document was processed, which builds transparency and trust."
