# embeddings.py — Text-to-Vector Conversion

**File:** `app/services/embeddings.py`

## What This File Does

Converts text into **vectors** (lists of numbers) that capture meaning. This is the core of semantic search — similar texts produce similar vectors, allowing us to find relevant chunks even when the exact words don't match.

## The Key Concept: What Are Embeddings?

Imagine you could represent any sentence as a point in space. Sentences with similar meanings would be close together, and unrelated sentences would be far apart.

```
"The cat sat on the mat"       → [0.12, -0.34, 0.56, ...]  (384 numbers)
"A cat was sitting on a rug"   → [0.13, -0.33, 0.55, ...]  (very close!)
"Quantum physics is complex"   → [-0.87, 0.45, -0.12, ...]  (very far away)
```

The `all-MiniLM-L6-v2` model was trained on millions of sentence pairs to learn this mapping. It converts any text into a 384-dimensional vector.

## Line-by-Line Explanation

```python
from sentence_transformers import SentenceTransformer
```
**Line 1:** Imports the `SentenceTransformer` class from the `sentence-transformers` library. This library wraps Hugging Face transformer models and optimizes them specifically for generating embeddings (as opposed to text generation).

```python
from app.config import settings
```
**Line 3:** Imports our centralized settings to get the model name (`all-MiniLM-L6-v2`).

```python
_model = None
```
**Line 5:** Module-level variable to hold the loaded model. The underscore prefix (`_model`) is a Python convention meaning "private — don't import this directly."

```python
def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model
```
**Lines 8-12:** **Lazy Singleton** pattern.
- `global _model` — Tells Python we're modifying the module-level `_model`, not creating a local variable.
- `if _model is None` — Only load the model on the FIRST call. Loading downloads weights (~80MB) and takes a few seconds. After that, it's cached in memory.
- `SentenceTransformer(settings.embedding_model)` — Loads the `all-MiniLM-L6-v2` model. On first run, it downloads from Hugging Face. After that, it loads from a local cache.
- **Why lazy?** If we loaded the model at import time (`_model = SentenceTransformer(...)`), it would slow down app startup and break tests that don't need embeddings.

```python
def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()
```
**Lines 15-18:** Converts multiple texts into vectors (used during document upload to embed all chunks at once).
- `texts: list[str]` — Input: a list of text chunks like `["Chapter 1...", "Chapter 2..."]`
- `model.encode(texts, ...)` — The model processes all texts in a single batch. This is much faster than encoding one at a time because the GPU/CPU can parallelize.
- `show_progress_bar=False` — Suppresses the tqdm progress bar (we're running in a server, not a notebook).
- `.tolist()` — Converts from NumPy array to plain Python list. ChromaDB expects Python lists, not NumPy arrays.
- **Return type:** `list[list[float]]` — A list of vectors. Each vector is a list of 384 floats.

```python
def embed_query(query: str) -> list[float]:
    model = get_model()
    embedding = model.encode(query, show_progress_bar=False)
    return embedding.tolist()
```
**Lines 21-24:** Converts a single query into a vector (used at search time).
- Same logic as `embed_texts`, but for a single string.
- Returns a single vector: `list[float]` (384 numbers).
- **Why a separate function?** Clarity. `embed_texts` is for batch processing during upload, `embed_query` is for single queries during search. The underlying model call is the same.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Text Embeddings** | Converting text into numerical vectors that capture semantic meaning |
| **Sentence Transformers** | Library for generating high-quality text embeddings |
| **all-MiniLM-L6-v2** | A lightweight, fast embedding model producing 384-dim vectors |
| **Lazy Loading** | Model loads on first use, not at import time |
| **Singleton Pattern** | One model instance shared across all requests |
| **Batch Encoding** | Processing multiple texts at once for efficiency |
| **Vector Dimensions** | Each text becomes 384 numbers — the "coordinates" in meaning-space |

## Why This Matters for Interviews

"I chose open-source embeddings over OpenAI's API for three reasons: no extra API cost, works offline, and it demonstrates I understand the embedding layer rather than just making API calls. The lazy singleton ensures the model is only loaded once, since loading a transformer model takes several seconds."
