# Concepts Glossary

Every concept used in this project, explained in one place.

---

## RAG (Retrieval-Augmented Generation)

A pattern where you first **retrieve** relevant information, then **generate** an answer using that information as context. Instead of trusting the LLM's training data (which can hallucinate), you give it the exact source material to work with.

**Analogy:** Instead of asking someone to answer from memory (hallucination risk), you hand them the textbook opened to the right page and ask them to answer from that.

**In this project:** Documents are uploaded → chunked → embedded → stored. At query time, relevant chunks are retrieved and fed to Claude as context.

---

## Embeddings / Vectors

A **vector** is a list of numbers (e.g., `[0.12, -0.34, 0.56, ...]`) that represents the **meaning** of a piece of text in mathematical space. An **embedding model** converts text into these vectors.

**Key property:** Similar meanings produce similar vectors. "The cat sat on the mat" and "A feline rested on the rug" have vectors close together. "Quantum physics" has a vector far away from both.

**In this project:** We use `all-MiniLM-L6-v2` which produces 384-dimensional vectors. Each dimension captures some aspect of meaning.

---

## Vector Database

A database optimized for storing vectors and finding the **nearest neighbors** — the vectors most similar to a query vector. Regular databases search by exact matches (`WHERE name = 'John'`). Vector databases search by similarity (`find vectors closest to this one`).

**In this project:** ChromaDB stores chunk vectors and supports cosine similarity search.

---

## Cosine Similarity

Measures the **angle** between two vectors. Values range from -1 (opposite) to 1 (identical direction). Preferred over Euclidean distance for text embeddings because it's invariant to vector magnitude — a longer text chunk isn't penalized for having a larger vector.

**Formula:** `cos(θ) = (A · B) / (|A| × |B|)`

---

## HNSW (Hierarchical Navigable Small World)

The algorithm ChromaDB uses internally for fast vector search. Instead of comparing the query against every single vector (slow), HNSW builds a graph structure that allows jumping to the approximate nearest neighbors in O(log n) time.

**Trade-off:** Slightly approximate (might miss the absolute closest vector) but dramatically faster.

---

## Text Chunking

Splitting large documents into smaller pieces. Essential because:
1. **Retrieval precision** — find the specific paragraph, not the whole chapter.
2. **Token limits** — LLMs can only process so much text at once.
3. **Lost in the middle** — LLMs underweight information in the middle of long contexts.

**In this project:** `RecursiveCharacterTextSplitter` splits on paragraph boundaries first, then sentences, then words. 1000-char chunks with 200-char overlap.

---

## Chunk Overlap

Adjacent chunks share characters at their boundaries. If chunk 1 ends with "...the patient was diagnosed with" and chunk 2 starts with "a rare condition called...", the overlap ensures both chunks contain the complete sentence.

**In this project:** 200 characters of overlap. This is ~20% of the chunk size, a common ratio.

---

## BM25 (Best Match 25)

A **keyword-based** ranking algorithm. It scores documents based on:
- **Term Frequency (TF):** How often the search terms appear in a document.
- **Inverse Document Frequency (IDF):** How rare the search terms are across all documents. Rare words (like "pharmaceuticals") score higher than common words (like "the").
- **Document Length:** Normalizes for document length so longer documents aren't unfairly favored.

**In this project:** Used alongside semantic search in hybrid retrieval. BM25 catches exact term matches that semantic search might miss.

---

## Hybrid Search

Combining **semantic search** (meaning-based) with **keyword search** (term-based). Neither is perfect alone:
- Semantic: understands "What are the findings?" matching "The results show..." but might miss exact codes like "ISM001-055".
- Keyword: finds "ISM001-055" perfectly but doesn't understand paraphrases.

Hybrid search uses both and combines their results.

---

## Reciprocal Rank Fusion (RRF)

A method to merge ranked lists from different search systems.

**Formula:** `score(d) = Σ weight / (k + rank(d))`

Where `k` is a constant (typically 60) and `rank(d)` is the item's position in a ranked list.

**Why RRF?** It doesn't need the raw scores from each system — just the rank positions. This avoids the problem of normalizing wildly different score scales (BM25 scores might be 0-15, while cosine distances are 0-1).

**Bonus:** Items that appear in BOTH ranked lists get their scores ADDED, naturally boosting results that both systems agree on.

---

## LangChain

A Python framework for building LLM applications. Provides:
- **Document loaders** (PyPDF, Docx, Text)
- **Text splitters** (RecursiveCharacterTextSplitter)
- **LLM wrappers** (ChatAnthropic for Claude)
- **LCEL (LangChain Expression Language)** for composing chains with `|` pipe syntax

**In this project:** Used for document loading, text splitting, and the prompt → LLM chain.

---

## LCEL (LangChain Expression Language)

A composable syntax for building LLM chains:
```python
chain = prompt_template | llm
response = chain.invoke({"question": "..."})
```
The `|` operator pipes the output of one component into the next, like Unix pipes.

---

## Prompt Engineering

Designing the instructions given to an LLM to control its behavior. Key techniques used in this project:
- **Grounding:** "Answer based ONLY on the provided context" — prevents hallucination.
- **Format specification:** "Cite using [Source: filename, Page X]" — ensures consistent, parseable output.
- **Honesty instruction:** "If context doesn't contain the answer, say so" — prevents fabrication.

---

## FastAPI

A modern Python web framework for building APIs. Key features used:
- **Automatic validation** via Pydantic models.
- **Auto-generated docs** at `/docs` (Swagger UI).
- **Async support** for file uploads.
- **Routers** for organizing endpoints.

---

## Pydantic

A data validation library. Define a class with type annotations, and Pydantic:
- Validates incoming data matches the types.
- Converts compatible types (string "123" → int 123).
- Generates JSON schemas (used by FastAPI for Swagger docs).
- Serializes to JSON automatically.

---

## CORS (Cross-Origin Resource Sharing)

A browser security mechanism that blocks requests between different origins (protocol + domain + port). `localhost:8501` (Streamlit) → `localhost:8000` (API) is a cross-origin request. CORS middleware tells the browser "this is allowed."

---

## Streamlit Session State

Streamlit reruns the entire script on every user interaction. `st.session_state` is a dictionary that persists across reruns, used to maintain chat history and message display.

---

## Singleton Pattern / Lazy Loading

Creating a single shared instance of an expensive resource (embedding model, DB connection) on first use, then reusing it. Avoids:
- Loading the model multiple times (wasteful).
- Loading at import time (slows startup, breaks tests).

```python
_model = None
def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(...)  # Only runs once
    return _model
```

---

## UUID (Universally Unique Identifier)

A 128-bit identifier that's virtually guaranteed unique. We use UUID v4 (random) for document IDs. With 122 bits of randomness, the probability of a collision is astronomically low — you'd need to generate ~2.7 quintillion UUIDs to have a 50% chance of one duplicate.
