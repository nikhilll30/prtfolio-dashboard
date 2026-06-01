# retriever.py — Hybrid Search (BM25 + Semantic + RRF)

**File:** `app/services/retriever.py`

## What This File Does

This is the **most technically interesting file** in the project. It implements **hybrid search** — combining two fundamentally different search strategies and merging their results using Reciprocal Rank Fusion (RRF).

This is a real production pattern used by Google, Bing, and enterprise search systems. Most RAG tutorials only use semantic search, making this a strong differentiator.

## Why Hybrid Search?

| Query | Semantic Search | BM25 Keyword Search |
|-------|----------------|-------------------|
| "What are the findings?" | Matches "The results show..." (understands paraphrase) | Misses (no word overlap) |
| "ISM001-055 drug" | Might miss (it's a code, not a semantic concept) | Finds it (exact match) |
| "How does AI help doctors?" | Matches "AI assists physicians..." | Partial match only |

**Neither search is complete alone.** Semantic search understands meaning but misses exact terms. Keyword search finds exact terms but misses paraphrases. Combining them gives the best of both worlds.

## Line-by-Line Explanation

```python
from rank_bm25 import BM25Okapi

from app.config import settings
from app.services import embeddings, vector_store
```
**Lines 1-4:**
- `BM25Okapi` — Implementation of the **BM25 algorithm** (Best Match 25), the gold standard for keyword search. "Okapi" refers to the Okapi information retrieval system where BM25 was first developed.
- We import both `embeddings` (for semantic search) and `vector_store` (for ChromaDB operations).

```python
def _tokenize(text: str) -> list[str]:
    """Simple whitespace tokenization with lowercasing."""
    return text.lower().split()
```
**Lines 7-9:** Converts text into tokens (words) for BM25.
- `.lower()` — Makes search case-insensitive ("AI" matches "ai").
- `.split()` — Splits on whitespace. This is simple but effective. Production systems might use stemming (reducing "running" to "run") or lemmatization, but for a portfolio project, whitespace tokenization demonstrates the concept clearly.

---

### The Main Hybrid Search Function

```python
def hybrid_search(query: str, k: int = settings.max_retrieval_k) -> dict:
```
**Line 12:** Entry point. Takes a question and returns the top `k` chunks.

#### Step 1: Semantic Search

```python
    # --- Semantic search ---
    query_embedding = embeddings.embed_query(query)
    semantic_results = vector_store.query_similar(query_embedding, k=k * 2)

    semantic_ids = semantic_results["ids"][0] if semantic_results["ids"] else []
    semantic_docs = semantic_results["documents"][0] if semantic_results["documents"] else []
    semantic_metas = semantic_results["metadatas"][0] if semantic_results["metadatas"] else []
```
**Lines 17-23:**
1. Convert the question into a vector.
2. Find the `k * 2` most similar chunks in ChromaDB. **Why `k * 2`?** We retrieve more candidates than needed because after merging with BM25, some semantic results might be pushed out. Having extra candidates gives RRF more data to work with.
3. Extract the IDs, documents, and metadata from ChromaDB's nested response format.

#### Step 2: BM25 Keyword Search

```python
    # --- BM25 keyword search ---
    all_chunks = vector_store.get_all_chunks()
    all_ids = all_chunks["ids"]
    all_docs = all_chunks["documents"]
    all_metas = all_chunks["metadatas"]

    if not all_docs:
        return {"documents": [[]], "metadatas": [[]], "ids": [[]]}
```
**Lines 25-32:** Load all chunks from ChromaDB for BM25 scoring.
- BM25 needs access to the entire corpus to calculate term frequency and inverse document frequency. There's no shortcut — it must see all documents.
- Empty check: if no documents exist, return empty results.

```python
    tokenized_corpus = [_tokenize(doc) for doc in all_docs]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(_tokenize(query))
```
**Lines 34-36:** Build and query the BM25 index.
- `tokenized_corpus` — Each document becomes a list of words: `[["chapter", "1", "introduction", ...], ...]`
- `BM25Okapi(tokenized_corpus)` — Builds the BM25 index. Internally, it calculates:
  - **TF (Term Frequency):** How often each word appears in each document.
  - **IDF (Inverse Document Frequency):** How rare each word is across ALL documents. Rare words (like "pharmaceuticals") score higher than common words (like "the").
  - **Document Length Normalization:** Longer documents are penalized to avoid bias.
- `bm25.get_scores(...)` — Returns a score for EVERY document in the corpus. Higher score = more relevant keywords.

```python
    # Get top BM25 results
    bm25_ranked = sorted(
        enumerate(bm25_scores), key=lambda x: x[1], reverse=True
    )[:k * 2]

    bm25_ids = [all_ids[idx] for idx, _ in bm25_ranked]
```
**Lines 39-43:** Sort all chunks by BM25 score and take the top `k * 2`.
- `enumerate(bm25_scores)` — Pairs each score with its index: `[(0, 0.5), (1, 2.3), (2, 0.1), ...]`
- `sorted(..., reverse=True)` — Highest scores first.
- `[:k * 2]` — Take the top candidates (same number as semantic search).

#### Step 3: Reciprocal Rank Fusion (RRF)

```python
    # --- Reciprocal Rank Fusion ---
    rrf_constant = 60  # Standard RRF constant
    scores = {}
```
**Lines 45-47:**
- `rrf_constant = 60` — The standard constant from the [original RRF paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf). It prevents top-ranked results from dominating too aggressively. A value of 60 means that rank 1 gets a score of `1/61 = 0.0164`, while rank 10 gets `1/70 = 0.0143` — a smooth decay rather than a cliff.

```python
    # Score semantic results
    for rank, chunk_id in enumerate(semantic_ids):
        scores[chunk_id] = scores.get(chunk_id, 0) + (
            settings.semantic_weight / (rrf_constant + rank + 1)
        )
```
**Lines 49-53:** Score each semantic result.
- **RRF formula:** `score = weight / (k + rank + 1)`
  - Rank 0 (best match): `0.7 / (60 + 0 + 1) = 0.7 / 61 = 0.01148`
  - Rank 1: `0.7 / (60 + 1 + 1) = 0.7 / 62 = 0.01129`
  - Rank 9: `0.7 / (60 + 9 + 1) = 0.7 / 70 = 0.01000`
- `settings.semantic_weight` is `0.7` — semantic search gets 70% influence.

```python
    # Score BM25 results
    for rank, chunk_id in enumerate(bm25_ids):
        scores[chunk_id] = scores.get(chunk_id, 0) + (
            settings.keyword_weight / (rrf_constant + rank + 1)
        )
```
**Lines 55-59:** Same formula for BM25 results, but with `keyword_weight = 0.3`.
- **The magic of RRF:** If a chunk appears in BOTH semantic AND BM25 results, its scores ADD UP. A chunk ranked #1 in both lists gets:
  - Semantic: `0.7 / 61 = 0.01148`
  - BM25: `0.3 / 61 = 0.00492`
  - **Total: 0.01640** (much higher than a chunk in only one list)
- This naturally boosts chunks that both search strategies agree are relevant.

```python
    # Sort by fused score and take top k
    top_ids = sorted(scores, key=scores.get, reverse=True)[:k]
```
**Line 62:** Final ranking. The `k` chunks with the highest combined RRF scores win.

#### Step 4: Assemble Results

```python
    # Build a lookup from all available data
    id_to_doc = {}
    id_to_meta = {}

    for i, chunk_id in enumerate(semantic_ids):
        id_to_doc[chunk_id] = semantic_docs[i]
        id_to_meta[chunk_id] = semantic_metas[i]

    for i, chunk_id in enumerate(all_ids):
        if chunk_id not in id_to_doc:
            id_to_doc[chunk_id] = all_docs[i]
            id_to_meta[chunk_id] = all_metas[i]

    # Assemble final results in ChromaDB return format
    final_docs = [id_to_doc[cid] for cid in top_ids if cid in id_to_doc]
    final_metas = [id_to_meta[cid] for cid in top_ids if cid in id_to_meta]
    final_ids = [cid for cid in top_ids if cid in id_to_doc]

    return {
        "documents": [final_docs],
        "metadatas": [final_metas],
        "ids": [final_ids],
    }
```
**Lines 64-86:** Maps the winning IDs back to their full text and metadata.
- We build lookup dictionaries from both the semantic results and the full corpus (some BM25 winners might not be in the semantic results).
- Return format matches ChromaDB's output format (double-nested lists) so `qa_chain.py` doesn't need to know whether results came from simple or hybrid search.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Hybrid Search** | Combining multiple search strategies for better results |
| **BM25 (Okapi)** | The standard algorithm for keyword-based document retrieval |
| **Term Frequency (TF)** | How often a word appears in a document |
| **Inverse Document Frequency (IDF)** | How rare a word is across all documents (rare = more important) |
| **Semantic Search** | Finding documents by meaning similarity using vector embeddings |
| **Reciprocal Rank Fusion (RRF)** | A method to combine ranked lists from different search systems |
| **Weighted Scoring** | Giving different importance to different search methods (70/30) |
| **Candidate Over-retrieval** | Fetching `k*2` candidates from each method before fusing to `k` |

## Why This Matters for Interviews

"I implemented hybrid search because pure semantic search fails on exact terms — product names, acronyms, codes — while pure keyword search fails on paraphrased questions. I combine them using Reciprocal Rank Fusion with a 70/30 weighting. RRF is elegant because it doesn't need score normalization — it works purely on rank positions. Chunks that both methods agree on get naturally boosted. This is the same approach Google and other production search systems use."
