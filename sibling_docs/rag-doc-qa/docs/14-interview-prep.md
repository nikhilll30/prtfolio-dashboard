# Interview Prep — Questions & Talking Points

Questions you should be ready to answer about this project, organized by topic.

---

## RAG Architecture

**Q: What is RAG and why did you use it?**

RAG stands for Retrieval-Augmented Generation. Instead of relying on the LLM's training data (which can be outdated or hallucinated), I retrieve relevant passages from actual uploaded documents and provide them as context. This grounds the answer in real sources and enables citation. It's the dominant pattern in enterprise AI applications because it combines the LLM's reasoning ability with trustworthy source data.

**Q: Why not just put the entire document into Claude's context window?**

Three reasons:
1. **Cost** — Claude charges per token. Sending a 50-page PDF on every query is expensive.
2. **Precision** — The "lost in the middle" problem: research shows LLMs pay less attention to information in the middle of long contexts. By retrieving only the 5 most relevant chunks, the LLM focuses on what matters.
3. **Scale** — Context windows have limits. If someone uploads 20 documents, they won't fit. RAG scales to any number of documents.

**Q: Walk me through what happens when a user asks a question.**

1. The question is sent to the FastAPI backend.
2. The question is embedded into a 384-dimensional vector using sentence-transformers.
3. Two parallel searches run: semantic search (ChromaDB cosine similarity) and keyword search (BM25).
4. Results are merged using Reciprocal Rank Fusion, keeping the top 5 chunks.
5. Those chunks are formatted with source labels and sent to Claude with a citation-enforcing prompt.
6. Claude generates an answer citing specific files and pages.
7. The response includes the answer, structured source references, and timing.

---

## Embeddings

**Q: What embedding model did you use and why?**

`all-MiniLM-L6-v2` from sentence-transformers. It produces 384-dimensional vectors, runs locally with no API cost, and is the most popular lightweight embedding model (90M+ downloads). I chose it over OpenAI's embeddings to demonstrate that I understand the embedding layer itself — not just API calls — and to avoid requiring a second API key.

**Q: What does a 384-dimensional vector mean?**

Each dimension captures some learned aspect of the text's meaning. We can't interpret individual dimensions, but the model learned (through training on millions of sentence pairs) that similar texts should have similar vectors. The 384 dimensions are enough to encode nuanced meaning differences while keeping computation fast.

**Q: How do you compare two vectors?**

Cosine similarity — it measures the angle between vectors. A value of 1.0 means identical direction (same meaning), 0 means unrelated, -1 means opposite. I chose cosine over Euclidean distance because cosine is invariant to vector magnitude, so longer chunks aren't penalized.

---

## Chunking

**Q: Why chunk size 1000 with overlap 200?**

Chunk size 1000 (~150-200 words) is the sweet spot for RAG. Smaller chunks (200 chars) lose context — a chunk might just say "it increased by 40%" without saying what "it" refers to. Larger chunks (5000 chars) dilute retrieval precision — you'd retrieve an entire section when only one sentence is relevant.

The 200-char overlap (20% of chunk size) prevents information loss at boundaries. If an important sentence is split between chunks, the overlap ensures both adjacent chunks contain it.

**Q: Why RecursiveCharacterTextSplitter specifically?**

It tries to split at natural boundaries in this order: paragraph breaks → line breaks → spaces → characters. So a 1000-char chunk is more likely to end at a paragraph boundary than in the middle of a word. Other splitters (like fixed-size or sentence-based) either cut awkwardly or produce uneven chunks.

---

## Hybrid Search

**Q: Why not just use semantic search?**

Semantic search fails on exact terms. If a document mentions the drug code "ISM001-055" and someone asks about it, semantic search might not find it because "ISM001-055" doesn't have a clear semantic meaning — it's just a code. BM25 keyword search finds it instantly because it's an exact token match.

Conversely, keyword search fails on paraphrases. "What were the outcomes?" won't match a chunk that says "The results indicate..." because the words are different. Semantic search understands they mean the same thing.

Hybrid search combines both, getting the best of each.

**Q: Explain Reciprocal Rank Fusion.**

RRF merges ranked lists from different search systems using only rank positions, not raw scores. The formula is `score = weight / (k + rank + 1)` where k=60 is a constant.

The beauty is that items appearing in BOTH lists get their scores added. If a chunk is ranked #1 in semantic search AND #2 in BM25, it gets a higher combined score than a chunk that's #1 in one but absent from the other. This naturally rewards consensus between the two systems.

I weighted it 70/30 favoring semantic search because semantic generally performs better for natural language questions. BM25 is the safety net for exact-match cases.

**Q: Why rebuild the BM25 index on every query? Isn't that slow?**

For a portfolio project with a few documents, it's fast enough (milliseconds). In production with millions of chunks, I'd use a persistent BM25 index like Elasticsearch or a dedicated keyword search service. The trade-off here is simplicity — no extra infrastructure to manage.

---

## Prompt Engineering

**Q: How did you prevent hallucination?**

The prompt says "Answer based ONLY on the provided context excerpts." This grounds Claude's answer in the retrieved chunks. I also instruct it to explicitly say "the documents don't contain this information" rather than guessing. And I set `temperature=0` for deterministic, conservative output.

**Q: Why did you include the citation format in the prompt?**

By specifying the exact format `[Source: filename, Page X]` and labeling each chunk with the same format in the context, Claude can directly copy the citation. This is more reliable than asking Claude to "cite your sources" without a format — ambiguity leads to inconsistent output.

---

## Architecture & Design

**Q: Why separate the frontend and backend?**

This mirrors production architecture. The API can be consumed by multiple clients (Streamlit, mobile app, CLI tool). They can be deployed, scaled, and updated independently. It also makes testing easier — I can test the API without the UI.

**Q: Why FastAPI over Flask or Django?**

FastAPI gives me automatic request validation (via Pydantic), auto-generated Swagger docs, async support for file uploads, and type safety — all with less boilerplate than Django and more features than Flask.

**Q: What's the thin controller pattern you used?**

Routers only handle HTTP concerns (validation, error codes, timing). All business logic lives in the service layer (document_processor, retriever, qa_chain). This means I can test the RAG pipeline directly by calling `qa_chain.answer_question()` without HTTP, and I could add a CLI interface without duplicating logic.

---

## Tools & Libraries

**Q: Why ChromaDB over FAISS/Pinecone?**

- **vs FAISS:** FAISS is a raw index without metadata support. I need metadata (filename, page number) for citations. ChromaDB provides metadata filtering, persistence, and a clean Python API.
- **vs Pinecone:** Pinecone requires an account, has vendor lock-in, and costs money at scale. ChromaDB runs locally and is free.

**Q: Why sentence-transformers over OpenAI embeddings?**

No extra API cost, runs offline for faster development, and demonstrates I understand the model layer rather than just API calls. In production, I'd benchmark both — OpenAI's ada-002 might be better for specific domains.

**Q: How does Docker Compose help here?**

It orchestrates two services (API on port 8000, Streamlit on port 8501) with one command. The services can communicate via Docker's internal network (`http://api:8000` instead of localhost). This is the standard way to run multi-service applications.

---

## Growth & Production Readiness

**Q: What would you change for a production deployment?**

1. **Persistent BM25 index** — Use Elasticsearch instead of rebuilding per query.
2. **Async processing** — Upload processing on a background task queue (Celery) so the API doesn't block.
3. **Authentication** — API keys or OAuth for access control.
4. **Rate limiting** — Prevent abuse of the Claude API.
5. **Persistent storage** — S3 for uploaded files, a managed vector DB like Pinecone or Weaviate.
6. **Evaluation** — Automated RAG evaluation with metrics like faithfulness, relevance, and answer correctness.
7. **Restrict CORS** — Replace `allow_origins=["*"]` with the actual frontend domain.

**Q: What would you do differently if you built this again?**

I'd add a **reranker** between retrieval and generation. After hybrid search returns the top 5 chunks, a cross-encoder model (like `ms-marco-MiniLM`) would rescore them based on the actual question-chunk pair. This typically improves answer quality by 10-20% because cross-encoders consider the full interaction between question and passage, not just vector similarity.
