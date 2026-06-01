# document_processor.py — The Ingestion Pipeline

**File:** `app/services/document_processor.py`

## What This File Does

This is the **ingestion pipeline** — the complete journey from raw uploaded file to searchable chunks in ChromaDB. It handles file type detection, text extraction, chunking, embedding, and storage.

## Line-by-Line Explanation

```python
import os
import uuid
import tempfile
```
**Lines 1-3:** Standard library imports.
- `os` — File path manipulation and temp file cleanup.
- `uuid` — Generates unique document IDs (UUID v4 = random, no collisions).
- `tempfile` — Creates temporary files for document loaders that need file paths.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
```
**Lines 5-6:** LangChain's document loading and splitting tools.
- `RecursiveCharacterTextSplitter` — The most popular text splitter. It tries to split on paragraph boundaries first, then sentences, then words, then characters — preserving natural text boundaries.
- `PyPDFLoader` — Extracts text from PDFs, page by page.
- `TextLoader` — Reads plain text files.
- `Docx2txtLoader` — Extracts text from Microsoft Word documents.

```python
from app.config import settings
from app.services import embeddings, vector_store
```
**Lines 8-9:** Our own modules — settings for chunk size/overlap, and the services to embed and store chunks.

```python
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx"}
```
**Line 12:** A set of allowed file types. Using a set instead of a list gives O(1) lookup for the `in` check below. This is also our single source of truth for supported formats.

---

### The Main Processing Function

```python
def process_upload(filename: str, file_bytes: bytes) -> dict:
    """Process an uploaded file: load, chunk, embed, store. Returns summary."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Supported: {SUPPORTED_EXTENSIONS}")
```
**Lines 15-19:** Validates the file type.
- `os.path.splitext("report.pdf")` returns `("report", ".pdf")` — we take `[1]` for the extension.
- `.lower()` — Handles `"REPORT.PDF"` gracefully.
- Raises `ValueError` for unsupported types — the router catches this and returns HTTP 400.

```python
    # Write to temp file for loaders that need a file path
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
```
**Lines 21-24:** Writes the uploaded bytes to a temporary file.
- **Why?** LangChain's document loaders expect file paths, not raw bytes. FastAPI gives us bytes from the upload.
- `delete=False` — We'll delete the file manually in the `finally` block (not automatically when the `with` block exits).
- `suffix=ext` — The temp file gets the right extension (`.pdf`), which some loaders need to detect format.

```python
    try:
        # Load document
        if ext == ".pdf":
            loader = PyPDFLoader(tmp_path)
        elif ext == ".docx":
            loader = Docx2txtLoader(tmp_path)
        else:
            loader = TextLoader(tmp_path, encoding="utf-8")

        pages = loader.load()
```
**Lines 26-35:** Selects the right loader based on file type and extracts text.
- **PyPDFLoader** — Returns one `Document` object per page, with `metadata={"page": 0}`, `{"page": 1}`, etc. This is how we get page numbers for citations.
- **TextLoader** — Returns one `Document` for the entire file. `encoding="utf-8"` handles international characters.
- **Docx2txtLoader** — Returns one `Document` with all the text from the Word document.
- `pages = loader.load()` — Each loader returns a list of `Document` objects. Each `Document` has `.page_content` (the text) and `.metadata` (a dict with source info).

```python
        # Chunk
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        chunks = splitter.split_documents(pages)
```
**Lines 37-42:** Splits the loaded documents into smaller chunks.
- `RecursiveCharacterTextSplitter` works by trying these separators IN ORDER:
  1. `"\n\n"` (paragraph breaks)
  2. `"\n"` (line breaks)
  3. `" "` (spaces/words)
  4. `""` (individual characters — last resort)
- It tries to make each chunk ≤ `chunk_size` characters while splitting at the most natural boundary possible.
- `split_documents(pages)` — Takes the list of `Document` objects and returns a NEW list of smaller `Document` objects. Each chunk inherits the metadata from its parent page (including `page` number).

**Why chunk at all?** Three reasons:
1. **Precision** — Find the specific paragraph that answers the question, not a 10-page chapter.
2. **Token limits** — LLMs have context windows. Sending 5 small chunks is more efficient than 1 huge document.
3. **"Lost in the middle"** — Research shows LLMs pay less attention to information in the middle of long contexts. Shorter, focused chunks avoid this.

```python
        # Determine page count
        num_pages = len(pages) if ext == ".pdf" else None
```
**Line 45:** PDFs have pages, text files don't. We track this for the API response.

```python
        # Prepare data for vector store
        doc_id = str(uuid.uuid4())
        chunk_ids = []
        chunk_texts = []
        chunk_metadatas = []
```
**Lines 47-51:** Initializes the data structures for batch storage.
- `uuid.uuid4()` — Generates a random UUID like `"1e50be8d-77b5-414c-97f2-b19a04ed0b35"`. Virtually guaranteed unique (122 bits of randomness).

```python
        for i, chunk in enumerate(chunks):
            chunk_ids.append(f"{doc_id}_{i}")
            chunk_texts.append(chunk.page_content)
            chunk_metadatas.append({
                "doc_id": doc_id,
                "source_filename": filename,
                "page_number": chunk.metadata.get("page", -1),
                "chunk_index": i,
                "total_chunks": len(chunks),
                "total_pages": num_pages if num_pages else -1,
            })
```
**Lines 53-63:** Builds parallel lists for ChromaDB.
- `chunk_ids` — Format: `"uuid_0"`, `"uuid_1"`, etc. Unique across all documents.
- `chunk.page_content` — The actual text of this chunk.
- **Metadata** — This is what enables all our features:
  - `doc_id` — Groups chunks by document (for listing, deleting).
  - `source_filename` — Shows in citations: `[Source: report.pdf, Page 3]`.
  - `page_number` — From the PDF loader's metadata. `-1` for non-PDF files (ChromaDB doesn't support `None` in metadata).
  - `chunk_index` — Ordering within the document.
  - `total_chunks` / `total_pages` — Summary stats for the UI.

```python
        # Embed and store
        chunk_embeddings = embeddings.embed_texts(chunk_texts)
        vector_store.add_chunks(chunk_ids, chunk_texts, chunk_embeddings, chunk_metadatas)
```
**Lines 65-67:** The final two steps.
1. `embed_texts(chunk_texts)` — Converts all chunk texts into vectors in one batch. For 10 chunks, this produces 10 vectors of 384 floats each.
2. `add_chunks(...)` — Stores everything in ChromaDB: the IDs, texts, vectors, and metadata.

```python
        return {
            "doc_id": doc_id,
            "filename": filename,
            "num_chunks": len(chunks),
            "num_pages": num_pages,
        }

    finally:
        os.unlink(tmp_path)
```
**Lines 69-77:** Returns a summary and cleans up.
- `finally: os.unlink(tmp_path)` — Deletes the temporary file WHETHER OR NOT an error occurred. This prevents temp file buildup on disk.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Document Loading** | Extracting text from different file formats (PDF, TXT, DOCX) |
| **Text Chunking** | Splitting documents into smaller pieces for precise retrieval |
| **RecursiveCharacterTextSplitter** | Splits at natural boundaries (paragraphs > sentences > words) |
| **Chunk Overlap** | Shared characters between adjacent chunks to prevent information loss |
| **UUID** | Universally Unique Identifier for collision-free document IDs |
| **Temp Files** | Bridging between in-memory bytes and file-path-based loaders |
| **Batch Processing** | Embedding all chunks at once for efficiency |
| **Metadata Attachment** | Storing source info alongside each chunk for citations |

## Why This Matters for Interviews

"The ingestion pipeline is the foundation of any RAG system. I chose `RecursiveCharacterTextSplitter` because it preserves natural text boundaries — splitting on paragraphs first, then sentences, then words. The 200-character overlap prevents losing context at chunk boundaries. Each chunk carries metadata (filename, page number) which is what makes source citations possible."
