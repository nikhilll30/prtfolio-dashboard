# RAG Document Q&A

Upload documents and ask questions in plain English — powered by Claude AI, semantic search, and hybrid retrieval.

## What It Does

RAG Document Q&A lets you upload PDF, TXT, or DOCX files, then ask natural language questions about their content. The system finds the most relevant passages using **hybrid search** (semantic + keyword), feeds them to Claude, and returns answers with **source citations** pointing to exact pages.

**Example questions:**
- "What are the key findings in this report?"
- "Summarize the methodology section"
- "What does the document say about revenue growth?"

## Architecture

```
Document Upload Flow:
  File → Document Loader → Text Chunker → Embedding Model → ChromaDB

Query Flow:
  Question → Hybrid Search (Semantic + BM25) → Top-k Chunks → Claude → Cited Answer
```

```
┌──────────────────┐      ┌───────────────────────────────────┐
│  Streamlit UI    │ HTTP │  FastAPI Backend                  │
│  - Chat interface├─────►│  /documents/upload                │
│  - Doc sidebar   │      │  /documents/ (list/delete)        │
│  - Source display│◄─────┤  /query                           │
│  - Chunk insights│      │                                   │
└──────────────────┘      │  ┌─────────────────────────────┐  │
                          │  │ Services                     │  │
                          │  │ ┌─────────────┐             │  │
                          │  │ │ Doc Processor│ chunk+embed │  │
                          │  │ └──────┬──────┘             │  │
                          │  │        ▼                     │  │
                          │  │ ┌─────────────┐             │  │
                          │  │ │  ChromaDB   │ vector store │  │
                          │  │ └──────┬──────┘             │  │
                          │  │        ▼                     │  │
                          │  │ ┌─────────────┐             │  │
                          │  │ │  Retriever  │ hybrid RRF  │  │
                          │  │ └──────┬──────┘             │  │
                          │  │        ▼                     │  │
                          │  │ ┌─────────────┐             │  │
                          │  │ │  QA Chain   │ Claude + cit.│  │
                          │  │ └─────────────┘             │  │
                          │  └─────────────────────────────┘  │
                          └───────────────────────────────────┘
```

## Key Features

- **Hybrid search** — combines semantic similarity (sentence-transformers) with keyword matching (BM25) via Reciprocal Rank Fusion
- **Source citations** — every answer cites the exact filename and page number
- **Multi-file support** — upload, manage, and query across multiple documents
- **Chunk insights** — inspect how documents are split and stored
- **Conversation memory** — ask follow-up questions within a session
- **Open-source embeddings** — uses `all-MiniLM-L6-v2` locally, no extra API keys needed

## Tech Stack

| Tool | Purpose |
|------|---------|
| Python | Core language |
| FastAPI | REST API backend |
| LangChain | Document loading, text splitting |
| Claude (Anthropic) | Answer generation with citations |
| sentence-transformers | Local text embeddings |
| ChromaDB | Vector database with persistence |
| BM25 (rank_bm25) | Keyword search for hybrid retrieval |
| Streamlit | Chat UI with document management |
| Docker Compose | Multi-service containerization |

## Run Locally

**1. Clone and set up**
```bash
git clone https://github.com/nikhilll30/rag-doc-qa.git
cd rag-doc-qa
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

**3. Run the API**
```bash
uvicorn app.main:app --reload
```

**4. Run the UI (separate terminal)**
```bash
streamlit run ui/streamlit_app.py
```

## Run with Docker

```bash
docker-compose up --build
```
- API: http://localhost:8000
- UI: http://localhost:8501
- API Docs: http://localhost:8000/docs

## API Usage

**Upload a document:**
```bash
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@your-document.pdf"
```

**Ask a question:**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main findings?"}'
```

**Response:**
```json
{
  "question": "What are the main findings?",
  "answer": "According to the document, the main findings are... [Source: report.pdf, Page 3]",
  "sources": [
    {"filename": "report.pdf", "page": 3, "chunk_index": 5, "snippet": "The study found that..."}
  ],
  "time_taken_seconds": 4.2
}
```

## Design Decisions

- **Hybrid search over pure semantic** — keyword search catches exact terms (names, acronyms) that semantic search misses; RRF combines both without needing score calibration
- **Open-source embeddings** — `all-MiniLM-L6-v2` runs locally with no API cost, produces 384-dim vectors, and is the industry standard for lightweight semantic search
- **ChromaDB over FAISS** — provides metadata filtering (needed for citations), built-in persistence, and a clean Python API
- **Chunking with overlap** — 1000-char chunks with 200-char overlap balances retrieval precision against context preservation
- **Modular project structure** — routers, services, and config separated to demonstrate production-grade organization

## Project Structure

```
rag-doc-qa/
├── app/
│   ├── main.py              # FastAPI app with CORS
│   ├── config.py            # Centralized settings
│   ├── models.py            # Pydantic schemas
│   ├── routers/
│   │   ├── documents.py     # Upload, list, delete, chunk inspection
│   │   └── query.py         # Question answering endpoint
│   └── services/
│       ├── document_processor.py  # Load → chunk → embed → store
│       ├── embeddings.py          # sentence-transformers wrapper
│       ├── vector_store.py        # ChromaDB operations
│       ├── retriever.py           # Hybrid search with RRF
│       └── qa_chain.py            # Claude RAG chain with citations
├── ui/
│   └── streamlit_app.py     # Chat UI + document management
├── tests/                   # Chunking, retrieval, and API tests
├── Dockerfile               # API container
├── Dockerfile.ui            # UI container
└── docker-compose.yml       # Multi-service orchestration
```
