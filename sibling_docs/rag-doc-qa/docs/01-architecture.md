# Architecture Deep Dive

## The Big Picture

This project is a **RAG (Retrieval-Augmented Generation)** system. Instead of asking an LLM to answer from its training data (which can hallucinate), we:

1. **Store** your documents as searchable chunks
2. **Retrieve** the most relevant chunks for a given question
3. **Generate** an answer using only those chunks as context

This is the most common pattern in production AI applications today.

## Two Entry Points

The system has two independent processes that communicate over HTTP:

```
┌─────────────────────┐         HTTP          ┌─────────────────────────┐
│   Streamlit UI      │ ◄──────────────────►  │   FastAPI Backend       │
│   (Port 8501)       │                       │   (Port 8000)           │
│                     │                       │                         │
│   - Chat interface  │   POST /upload        │   routers/              │
│   - File upload     │ ─────────────────►    │     documents.py        │
│   - Doc sidebar     │                       │     query.py            │
│   - Source display   │  POST /query         │                         │
│                     │ ─────────────────►    │   services/             │
│                     │                       │     document_processor  │
│                     │   JSON response       │     embeddings          │
│                     │ ◄─────────────────    │     vector_store        │
│                     │                       │     retriever           │
└─────────────────────┘                       │     qa_chain            │
                                              └─────────────────────────┘
```

**Why separate them?** This is how production apps work. The frontend and backend can be deployed independently, scaled independently, and developed independently. The Streamlit UI could be replaced with a React app without touching the backend.

## Document Upload Flow (What happens when you upload a file)

```
Step 1: User uploads PDF/TXT/DOCX via Streamlit
        │
        ▼
Step 2: Streamlit sends file to FastAPI  →  POST /documents/upload
        │
        ▼
Step 3: document_processor.py receives raw file bytes
        │
        ├── Detects file type (.pdf, .txt, .docx)
        ├── Writes to a temporary file (loaders need file paths)
        ├── Loads with appropriate LangChain loader:
        │     PyPDFLoader   → extracts text per page
        │     TextLoader    → reads as plain text
        │     Docx2txtLoader → extracts text from Word docs
        │
        ▼
Step 4: Text Chunking
        │
        ├── RecursiveCharacterTextSplitter breaks text into ~1000 char pieces
        ├── Each chunk overlaps the previous by ~200 chars
        ├── WHY? An LLM can't process a 50-page PDF at once. Smaller chunks
        │   allow precise retrieval — you find the exact paragraph that answers
        │   the question, not the entire document.
        │
        ▼
Step 5: Embedding
        │
        ├── sentence-transformers model (all-MiniLM-L6-v2) converts each
        │   chunk into a 384-dimensional vector (list of 384 numbers)
        ├── These vectors capture the MEANING of the text, not just keywords
        ├── Similar meanings → vectors that are close together in 384D space
        │
        ▼
Step 6: Storage in ChromaDB
        │
        ├── Each chunk is stored with:
        │     - The vector (for similarity search)
        │     - The original text (to show to the LLM)
        │     - Metadata: {doc_id, filename, page_number, chunk_index}
        ├── ChromaDB persists to disk at ./chroma_db/
        │
        ▼
Step 7: Response sent back with summary (doc_id, num_chunks, etc.)
```

## Query Flow (What happens when you ask a question)

```
Step 1: User types question in Streamlit chat
        │
        ▼
Step 2: Streamlit sends question to FastAPI  →  POST /query
        │
        ▼
Step 3: retriever.py runs HYBRID SEARCH (two searches in parallel)
        │
        ├── SEMANTIC SEARCH (ChromaDB):
        │     1. Embed the question into a 384D vector
        │     2. Find chunks whose vectors are closest (cosine similarity)
        │     3. Good at: "What are the findings?" matching "The results show..."
        │     4. Bad at: exact names like "ISM001-055"
        │
        ├── KEYWORD SEARCH (BM25):
        │     1. Tokenize the question into words
        │     2. Score chunks by term frequency / inverse document frequency
        │     3. Good at: exact matches like "Recursion Pharmaceuticals"
        │     4. Bad at: paraphrased questions
        │
        ├── RECIPROCAL RANK FUSION (RRF):
        │     1. Both searches return ranked lists
        │     2. RRF combines them: score = weight / (60 + rank)
        │     3. Semantic gets 70% weight, BM25 gets 30%
        │     4. Chunks that appear in BOTH lists get boosted
        │     5. Take top 5 chunks
        │
        ▼
Step 4: qa_chain.py builds a prompt for Claude
        │
        ├── Formats the 5 retrieved chunks with source labels
        ├── Adds the prompt template:
        │     "Answer ONLY from the context. Cite sources as [Source: file, Page X]"
        ├── Includes chat history for follow-up questions
        │
        ▼
Step 5: Claude generates an answer with citations
        │
        ▼
Step 6: Response sent back: {answer, sources[], time_taken}
        │
        ▼
Step 7: Streamlit displays the answer with expandable source references
```

## Why This Architecture Matters

| Design Choice | Why |
|---------------|-----|
| Separate frontend/backend | Production pattern, independently deployable |
| Lazy-loaded models | Embedding model only loads on first use, not at import time |
| Hybrid search | Covers both semantic understanding AND exact keyword matching |
| Metadata on every chunk | Enables citations, filtering, and document management |
| ChromaDB with cosine similarity | Industry standard for RAG vector search |
| Chunk overlap | Prevents losing context at chunk boundaries |
