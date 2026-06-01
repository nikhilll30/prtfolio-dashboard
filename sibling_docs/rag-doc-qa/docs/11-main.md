# main.py — FastAPI App Assembly

**File:** `app/main.py`

## What This File Does

The entry point for the entire backend. Creates the FastAPI application, adds middleware, and mounts the routers. This is what `uvicorn app.main:app` points to.

## Line-by-Line Explanation

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, query
```
**Lines 1-4:**
- `FastAPI` — The main application class.
- `CORSMiddleware` — Handles Cross-Origin Resource Sharing (explained below).
- We import our two routers to mount them on the app.

```python
app = FastAPI(
    title="RAG Document Q&A",
    description="Upload documents and ask questions — powered by Claude AI and semantic search",
    version="1.0.0",
)
```
**Lines 6-10:** Creates the app instance.
- `title`, `description`, `version` — These appear in the auto-generated Swagger documentation at `/docs`. They make the API self-documenting.
- This is the object that `uvicorn` looks for when you run `uvicorn app.main:app`.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Lines 12-18:** Adds **CORS (Cross-Origin Resource Sharing)** middleware.

**What is CORS?** Browsers block requests from one domain to another by default. If your Streamlit UI runs on `localhost:8501` and the API runs on `localhost:8000`, the browser considers these different "origins" and blocks the request.

CORS middleware tells the browser "it's okay, these origins are allowed to talk to me."

- `allow_origins=["*"]` — Allow requests from ANY origin. In production, you'd restrict this to your actual frontend domain.
- `allow_methods=["*"]` — Allow all HTTP methods (GET, POST, DELETE, etc.).
- `allow_headers=["*"]` — Allow all headers (including `Content-Type`).
- **Why add it?** Without CORS, the Streamlit UI's `requests.post()` would be blocked by the browser's security policy.

```python
app.include_router(documents.router)
app.include_router(query.router)
```
**Lines 20-21:** Mounts the routers on the app.
- `documents.router` — Adds all `/documents/*` endpoints.
- `query.router` — Adds the `/query` endpoint.
- This is why routers exist — you can organize endpoints in separate files and mount them all in one place.

```python
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "RAG Document Q&A is running"}
```
**Lines 24-26:** Health check endpoint. Used by:
- Deployment platforms (Render, Railway) to know the app is alive.
- Monitoring systems to detect outages.
- The Streamlit UI could use this to show connection status.

```python
@app.get("/")
def root():
    return {
        "message": "Welcome to RAG Document Q&A",
        "docs": "Visit /docs to try the API interactively",
        "endpoints": {
            "health": "GET /health",
            "upload": "POST /documents/upload",
            "list_docs": "GET /documents/",
            "delete_doc": "DELETE /documents/{doc_id}",
            "query": "POST /query",
        },
    }
```
**Lines 29-41:** Root endpoint — a quick reference for anyone hitting the base URL. Lists all available endpoints so developers don't have to dig through docs.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **FastAPI Application** | The central app object that handles all HTTP requests |
| **CORS Middleware** | Allows cross-origin requests (frontend → backend on different ports) |
| **Router Mounting** | Attaching groups of endpoints to the main app |
| **Health Check** | An endpoint for monitoring and deployment readiness |
| **Swagger/OpenAPI** | Auto-generated API documentation at `/docs` |

## Why This Matters for Interviews

"The main file is deliberately minimal — it only configures the app and mounts routers. CORS middleware enables the Streamlit frontend to communicate with the API across different ports. The health check endpoint is essential for deployment platforms to know the service is alive."
