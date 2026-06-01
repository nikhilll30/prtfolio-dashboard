# Architecture Deep Dive

## The Big Picture

This project is a **multi-agent research assistant**. Instead of asking a single LLM to
answer a research question from memory, it:

1. **Plans** — decomposes the question into targeted sub-queries
2. **Searches in parallel** — one agent hits the live web, another searches uploaded documents
3. **Synthesises** — a third agent merges both result sets into a polished markdown report

This mirrors how a real research team works: a manager breaks the work into tasks, junior
researchers work in parallel, and a senior analyst writes the final report.

---

## The 5 Services

```
┌────────────────────────────────────────────┐
│   Streamlit UI   (port 8501)               │
│   - upload documents to knowledge base     │
│   - submit research questions              │
│   - display the final report               │
└─────────────────────┬──────────────────────┘
                      │  HTTP POST /research
                      ▼
┌────────────────────────────────────────────┐
│   Orchestrator / FastAPI  (port 8000)      │
│   - receives the user query                │
│   - runs the LangGraph state machine       │
│   - returns the finished report            │
└──────────┬──────────────────────┬──────────┘
           │ A2A                  │ A2A
    ┌──────▼──────┐        ┌──────▼──────┐
    │ Web Search  │        │  RAG Agent  │
    │ Agent :8001 │        │  :8002      │
    │ Tavily API  │        │ rag-doc-qa  │
    └──────┬──────┘        └──────┬──────┘
           │                      │ (direct Python import)
           │                  rag-doc-qa/
           │                  ChromaDB + Claude
           │
           └──────────┬───────────┘
                      │  A2A (both results)
               ┌──────▼──────┐
               │  Synthesis  │
               │  Agent :8003│
               │  Claude     │
               └──────┬──────┘
                      │
                 Final Report
```

---

## Two Protocols Layered Together

### A2A (Agent-to-Agent)
Used for **HTTP communication between services**. Each agent is its own FastAPI server
with three standard endpoints. The orchestrator sends tasks and polls for results.

```
Orchestrator                   Agent
    │                            │
    │── POST /tasks/send ────────►│  {id, message}
    │◄──────────────── 200 ───────│  {task_id}
    │                            │  [agent processes in background]
    │── GET /tasks/{task_id} ────►│
    │◄──────────────── 200 ───────│  {status: "working"}
    │── GET /tasks/{task_id} ────►│  (poll every 1s)
    │◄──────────────── 200 ───────│  {status: "completed", result: "..."}
```

### MCP (Model Context Protocol)
Used by the RAG Agent to call rag-doc-qa services. The RAG agent does **not** use MCP
at runtime in this implementation — it imports rag-doc-qa directly. The MCP server
(`mcp_server/server.py`) is a standalone tool for connecting Claude Desktop or other
MCP clients to the same knowledge base.

---

## Data Flow — Full Research Request

```
Step 1: User types "What are advances in RAG systems?" in Streamlit
        │
        ▼
Step 2: POST /research {"query": "..."}  → Orchestrator

Step 3: plan_node (Claude Haiku)
        - Sends query to Claude with structured JSON prompt
        - Receives:
            {"web_search_query": "latest RAG systems 2024",
             "rag_query": "RAG retrieval augmented generation techniques"}
        - Stores in state.sub_tasks

Step 4: Fan-out — LangGraph dispatches BOTH in parallel:
        ┌─────────────────────────────────────────┐
        │ web_search_node          rag_search_node │
        │ → POST /tasks/send       → POST /tasks/send
        │   to :8001                 to :8002      │
        │ ← polls every 1s         ← polls every 1s│
        │ ← web results            ← RAG answer    │
        └─────────────────────────────────────────┘

Step 5: Fan-in — LangGraph waits for BOTH to complete, merges state:
        state.web_results = "Web search results for: ..."
        state.rag_results = "Answer: ... \n\nSources: ..."

Step 6: synthesize_node
        - Builds JSON: {query, web_results, rag_results}
        - POSTs to Synthesis Agent :8003
        - Agent calls Claude Sonnet
        - Returns markdown report

Step 7: FastAPI returns ResearchResponse to Streamlit

Step 8: Streamlit renders the markdown report + expanders
```

---

## Document Upload Flow

```
Step 1: User uploads PDF/TXT/DOCX in Streamlit expander
        │
        ▼
Step 2: POST /upload (multipart form data) → Orchestrator :8000
        │
        ▼
Step 3: api/main.py calls process_upload() from rag-doc-qa
        - This runs in asyncio.to_thread() (non-blocking)
        - process_upload: loads file → chunks → embeds → stores in ChromaDB
        │
        ▼
Step 4: Returns {doc_id, num_chunks, num_pages}
        │
        ▼
Step 5: Streamlit shows "Uploaded X — 47 chunks indexed."
```

Note: The `chroma_db/` folder is local and gitignored. Documents persist across
restarts but are machine-specific.

---

## Why This Architecture?

| Design Decision | Reason |
|-----------------|--------|
| 5 separate services | Shows real microservice patterns; each agent is independently deployable |
| A2A over HTTP | Standard protocol — any agent can be replaced without touching the orchestrator |
| LangGraph for orchestration | State is tracked in a TypedDict; parallel branches are first-class |
| `Send` for parallelism | LangGraph's built-in fan-out; no manual threading needed |
| `asyncio.to_thread` everywhere | All blocking calls (Anthropic SDK, ChromaDB) run off the event loop |
| Reuse rag-doc-qa | Code reuse via sys.path injection — no duplication, same ChromaDB |
| MCP server (separate) | Shows you can build MCP tools; useful for Claude Desktop integration |

---

## Service Responsibilities Summary

| Service | Port | Technology | Responsibility |
|---------|------|-----------|----------------|
| Orchestrator | 8000 | FastAPI + LangGraph | Receives query, runs graph, returns report |
| Web Search Agent | 8001 | FastAPI + Tavily | Live web search, formats snippets |
| RAG Agent | 8002 | FastAPI + rag-doc-qa | Knowledge base Q&A with citations |
| Synthesis Agent | 8003 | FastAPI + Claude | Merges results into markdown report |
| Streamlit UI | 8501 | Streamlit | User interface — upload + query |
| MCP Server | stdio | MCP SDK | Exposes RAG tools to Claude Desktop |
