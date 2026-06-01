# vector_store.py — ChromaDB Operations

**File:** `app/services/vector_store.py`

## What This File Does

Wraps all interactions with **ChromaDB**, our vector database. ChromaDB stores text chunks alongside their vector embeddings and metadata, enabling fast similarity search.

Think of it as a specialized database where instead of `SELECT * WHERE name = 'John'`, you say `"find the 5 chunks most similar to this vector"`.

## Line-by-Line Explanation

```python
import chromadb

from app.config import settings
```
**Lines 1-3:** Import the ChromaDB client and our settings.

```python
_client = None
_collection = None
```
**Lines 5-6:** Module-level singletons for the database client and collection. Same lazy-loading pattern as `embeddings.py`.

```python
def get_collection() -> chromadb.Collection:
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        _collection = _client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection
```
**Lines 9-17:** Gets (or creates) the ChromaDB collection.
- `PersistentClient(path=...)` — Stores data on disk at `./chroma_db/`. Data survives server restarts. The alternative, `Client()`, is in-memory only (data lost on restart).
- `get_or_create_collection(...)` — If the collection "documents" exists, return it. If not, create it. This is **idempotent** — safe to call multiple times.
- `metadata={"hnsw:space": "cosine"}` — **This is critical.** Tells ChromaDB to use **cosine similarity** to compare vectors.
  - **Cosine similarity** measures the angle between two vectors (0 = identical direction, 1 = completely different).
  - Alternative: Euclidean distance (measures straight-line distance). Cosine is preferred for text embeddings because it's invariant to vector magnitude — a longer document's embedding isn't penalized.
  - **HNSW** = Hierarchical Navigable Small World graph. This is the algorithm ChromaDB uses internally for fast approximate nearest-neighbor search. It's O(log n) instead of O(n), making it fast even with millions of vectors.

---

### Adding Chunks

```python
def add_chunks(
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    collection = get_collection()
    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
```
**Lines 20-32:** Stores chunks in ChromaDB. Each chunk gets four things:
- `ids` — Unique identifiers like `"abc123_0"`, `"abc123_1"` (doc_id + chunk_index).
- `documents` — The actual text of each chunk.
- `embeddings` — Pre-computed vectors (we compute them in `embeddings.py` rather than letting ChromaDB compute them, because we use our own model).
- `metadatas` — Dictionaries with `{doc_id, source_filename, page_number, chunk_index, ...}`. This metadata is what enables citations — when we retrieve a chunk, we know which file and page it came from.

---

### Querying Similar Chunks

```python
def query_similar(
    query_embedding: list[float], k: int = settings.max_retrieval_k
) -> dict:
    collection = get_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )
    return results
```
**Lines 35-44:** The core **semantic search** operation.
- `query_embeddings=[query_embedding]` — The vector of the user's question. Wrapped in a list because ChromaDB supports batch queries.
- `n_results=k` — Return the top `k` (default 5) most similar chunks.
- `include=["documents", "metadatas", "distances"]` — What to return alongside the IDs. `distances` tells us how close each result was (lower = more similar with cosine).
- **What happens internally:** ChromaDB's HNSW index finds the `k` vectors closest to the query vector in 384-dimensional space. This is an approximate search — it's incredibly fast (milliseconds) but might miss the absolute closest vector in rare cases. The trade-off is worth it.
- **Return format:** `{"ids": [[...]], "documents": [[...]], "metadatas": [[...]], "distances": [[...]]}`. Everything is double-nested because ChromaDB supports batch queries.

---

### Deleting a Document

```python
def delete_by_doc_id(doc_id: str) -> int:
    collection = get_collection()
    existing = collection.get(where={"doc_id": doc_id})
    count = len(existing["ids"])
    if count > 0:
        collection.delete(ids=existing["ids"])
    return count
```
**Lines 47-53:** Deletes all chunks belonging to a document.
- `collection.get(where={"doc_id": doc_id})` — **Metadata filtering.** This is why we stored `doc_id` in every chunk's metadata — it lets us find all chunks from a specific document.
- `collection.delete(ids=existing["ids"])` — ChromaDB requires deleting by ID, not by metadata filter. So we first find all matching IDs, then delete them.
- Returns the count of deleted chunks (used in the API response).

---

### Getting Chunks for a Document

```python
def get_all_by_doc_id(doc_id: str) -> dict:
    collection = get_collection()
    return collection.get(where={"doc_id": doc_id}, include=["documents", "metadatas"])
```
**Lines 56-58:** Returns all chunks for a specific document. Used by the "View Chunks" feature in the UI.

---

### Listing All Documents

```python
def get_all_documents_info() -> list[dict]:
    """Get summary info for all unique documents in the store."""
    collection = get_collection()
    all_data = collection.get(include=["metadatas"])

    docs = {}
    for metadata in all_data["metadatas"]:
        doc_id = metadata["doc_id"]
        if doc_id not in docs:
            docs[doc_id] = {
                "doc_id": doc_id,
                "filename": metadata["source_filename"],
                "num_chunks": 0,
                "num_pages": metadata.get("total_pages") if metadata.get("total_pages", -1) != -1 else None,
            }
        docs[doc_id]["num_chunks"] += 1

    return list(docs.values())
```
**Lines 61-78:** Aggregates chunk-level data into document-level summaries.
- ChromaDB stores data per-chunk, not per-document. So to list documents, we iterate all chunks and group by `doc_id`.
- `num_chunks` is counted by incrementing for each chunk with that `doc_id`.
- `num_pages` handles the `-1` sentinel: we stored `-1` for non-PDF files (ChromaDB metadata must be strings, ints, or floats — not `None`), so we convert it back to `None` here.

---

### Getting All Chunks (for BM25)

```python
def get_all_chunks() -> dict:
    """Get all chunks with documents and metadata (for BM25 index)."""
    collection = get_collection()
    return collection.get(include=["documents", "metadatas"])
```
**Lines 81-84:** Returns every chunk in the database. Used by `retriever.py` to build the BM25 keyword search index.

**Performance note:** This loads ALL chunks into memory on every query. For a portfolio project with a few documents, this is fine. In production with millions of chunks, you'd want a dedicated BM25 index (like Elasticsearch) that doesn't require loading everything.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Vector Database** | A database optimized for storing and searching high-dimensional vectors |
| **ChromaDB** | An open-source, lightweight vector database with Python-native API |
| **Cosine Similarity** | Measures angle between vectors — standard metric for text embeddings |
| **HNSW Algorithm** | Fast approximate nearest-neighbor search (what powers ChromaDB internally) |
| **Metadata Filtering** | Querying by stored attributes (doc_id, filename, etc.) |
| **Persistent Storage** | Data saved to disk, survives restarts |
| **Idempotent Operations** | `get_or_create_collection` is safe to call repeatedly |

## Why This Matters for Interviews

"I chose ChromaDB over FAISS because ChromaDB gives me metadata filtering — which I need for source citations — plus built-in persistence and a clean Python API. FAISS is a raw index without metadata support. I configured cosine similarity because it's invariant to vector magnitude, which matters when chunks have different lengths."
