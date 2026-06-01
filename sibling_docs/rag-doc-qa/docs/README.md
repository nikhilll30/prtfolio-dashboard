# Deep Documentation — RAG Document Q&A

This documentation provides a **line-by-line explanation** of every file in the project, the concepts behind each decision, and interview-ready talking points.

## Table of Contents

1. [Architecture Deep Dive](01-architecture.md) — How data flows from upload to answer
2. [config.py](02-config.md) — Centralized settings with Pydantic
3. [models.py](03-models.md) — Request/response schemas
4. [embeddings.py](04-embeddings.md) — Text-to-vector conversion
5. [vector_store.py](05-vector-store.md) — ChromaDB operations
6. [document_processor.py](06-document-processor.md) — The ingestion pipeline
7. [retriever.py](07-retriever.md) — Hybrid search with BM25 + semantic + RRF
8. [qa_chain.py](08-qa-chain.md) — Claude RAG chain with citations
9. [routers/documents.py](09-router-documents.md) — Document management API
10. [routers/query.py](10-router-query.md) — Query API endpoint
11. [main.py](11-main.md) — FastAPI app assembly
12. [streamlit_app.py](12-streamlit-app.md) — Chat UI frontend
13. [Concepts Glossary](13-concepts.md) — Every concept used in this project
14. [Interview Prep](14-interview-prep.md) — Questions and talking points
