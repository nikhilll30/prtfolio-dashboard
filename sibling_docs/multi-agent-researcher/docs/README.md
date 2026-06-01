# multi-agent-researcher — Documentation Index

Deep documentation for the Multi-Agent Research Assistant project.
Each file covers one component or concept in full — line-by-line explanations,
diagrams, the "why" behind every design decision, and interview prep.

---

## Files

| # | File | What it covers |
|---|------|----------------|
| 01 | [architecture.md](01-architecture.md) | Big-picture design, data flow, all 5 services, design decisions |
| 02 | [state.md](02-state.md) | `ResearchState` TypedDict — field lifecycle, why TypedDict |
| 03 | [graph.md](03-graph.md) | LangGraph state machine — nodes, edges, `Send`, fan-out/fan-in |
| 04 | [a2a-client.md](04-a2a-client.md) | A2A HTTP client — httpx, polling loop, timeout handling |
| 05 | [base-a2a-server.md](05-base-a2a-server.md) | Shared A2A server factory — task lifecycle, `asyncio.create_task` |
| 06 | [web-search-agent.md](06-web-search-agent.md) | Web Search Agent — Tavily API, agent card, result formatting |
| 07 | [rag-agent.md](07-rag-agent.md) | RAG Agent — sys.path surgery, `asyncio.to_thread`, answer_question |
| 08 | [synthesis-agent.md](08-synthesis-agent.md) | Synthesis Agent — Claude, JSON parsing, markdown report generation |
| 09 | [mcp-server.md](09-mcp-server.md) | MCP Server — stdio transport, lazy loading, 3 tools |
| 10 | [api-main.md](10-api-main.md) | FastAPI Orchestrator — /research, /upload, /documents |
| 11 | [ui-app.md](11-ui-app.md) | Streamlit UI — upload flow, research submission, result rendering |
| 12 | [concepts.md](12-concepts.md) | Concepts glossary — every term used across the project |
| 13 | [interview-prep.md](13-interview-prep.md) | 25 interview Q&A covering all key skills |

---

## Quick start

```bash
# 5 terminals
python agents/web_search/agent.py     # port 8001
python agents/rag_agent/agent.py      # port 8002
python agents/synthesis/agent.py      # port 8003
uvicorn api.main:app --reload         # port 8000
streamlit run ui/app.py               # port 8501
```

Required `.env` keys: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`
