# config.py — Centralized Settings

**File:** `app/config.py`

## What This File Does

This is the **single source of truth** for all configurable values in the project. Instead of scattering `os.getenv()` calls across every file, we define all settings in one place using Pydantic's `BaseSettings`.

## Line-by-Line Explanation

```python
from pydantic_settings import BaseSettings
```
**Line 1:** Imports `BaseSettings` from the `pydantic-settings` library. This is a special class that automatically reads values from environment variables and `.env` files. It also validates types — if you accidentally set `chunk_size="abc"`, it will throw an error at startup rather than failing silently later.

```python
class Settings(BaseSettings):
```
**Line 4:** Defines our settings class. By inheriting from `BaseSettings`, every field becomes an environment variable. For example, `chunk_size` can be overridden by setting `CHUNK_SIZE=500` in your `.env` file.

```python
    anthropic_api_key: str = ""
```
**Line 5:** The API key for Claude. Defaults to empty string so the app can start without it (needed for tests that don't call Claude). The actual validation happens in `qa_chain.py` when the key is first used.

**Why not make it required?** Originally it was `anthropic_api_key: str` (required). But this broke unit tests for embeddings and chunking — tests that never call Claude would crash because Pydantic couldn't find the API key. By defaulting to `""` and validating at point-of-use, we keep tests fast and isolated.

```python
    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200
```
**Lines 8-9:** Controls how documents are split into pieces.
- `chunk_size=1000`: Each chunk is roughly 1000 characters (~150-200 words). This is the industry-standard sweet spot. Too small (200) = chunks lack context. Too large (5000) = retrieval becomes imprecise.
- `chunk_overlap=200`: Adjacent chunks share 200 characters. This prevents losing information that spans a chunk boundary. If a sentence is split between chunk 3 and chunk 4, the overlap ensures both chunks contain the full sentence.

```python
    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"
```
**Line 12:** The sentence-transformers model used to convert text into vectors.
- `all-MiniLM-L6-v2` produces 384-dimensional vectors
- It's the most popular lightweight embedding model (90M+ downloads)
- Runs locally, no API call needed
- Good balance of speed and quality for a portfolio project

```python
    # Vector store
    chroma_persist_dir: str = "./chroma_db"
    chroma_collection_name: str = "documents"
```
**Lines 15-16:** Where ChromaDB stores its data on disk, and the name of the collection (like a "table" in a database). Persisting to disk means your uploaded documents survive server restarts.

```python
    # Retrieval
    max_retrieval_k: int = 5
    semantic_weight: float = 0.7
    keyword_weight: float = 0.3
```
**Lines 19-21:** Controls the hybrid search behavior.
- `max_retrieval_k=5`: Return the top 5 most relevant chunks. More chunks = more context for Claude but higher cost and potential "lost in the middle" issues.
- `semantic_weight=0.7`: Semantic (meaning-based) search gets 70% influence.
- `keyword_weight=0.3`: BM25 (keyword-based) search gets 30% influence.
- **Why 70/30?** Semantic search is generally more useful (understands paraphrasing), but keyword search catches exact terms that semantic misses. The 70/30 ratio is a well-tested default in information retrieval research.

```python
    # LLM
    llm_model: str = "claude-sonnet-4-20250514"
    llm_temperature: float = 0
```
**Lines 24-25:**
- `llm_model`: Which Claude model to use for answer generation.
- `llm_temperature=0`: Makes Claude's output deterministic — the same question with the same context always gives the same answer. For a Q&A system, you want consistency, not creativity.

```python
    # File storage
    upload_dir: str = "./data"
```
**Line 28:** Directory for uploaded files (currently unused — we process files in memory via temp files — but available for future features like file previews).

```python
    model_config = {"env_file": ".env"}
```
**Line 30:** Tells Pydantic to look for a `.env` file in the current directory. Any variable in `.env` (like `ANTHROPIC_API_KEY=sk-...`) automatically populates the corresponding field.

```python
settings = Settings()
```
**Line 33:** Creates a single global instance. Every other file imports this one instance: `from app.config import settings`. This is the **Singleton pattern** — one settings object shared across the entire app.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Pydantic Settings** | Type-safe configuration management that reads from env vars and `.env` files |
| **Singleton Pattern** | One shared instance (`settings`) used everywhere |
| **Environment Variables** | External configuration that keeps secrets out of code |
| **Configuration as Code** | All tuneable parameters in one place, with sensible defaults |

## Why This Matters for Interviews

"I centralized all configuration using Pydantic Settings, which gives me type validation, environment variable binding, and `.env` file support in one class. This means if someone deploys the app with `CHUNK_SIZE=abc`, it fails fast at startup with a clear error instead of crashing at runtime."
