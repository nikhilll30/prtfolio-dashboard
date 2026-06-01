# mcp_server/server.py — MCP Server

## What this file does

Implements a **Model Context Protocol (MCP) server** that wraps the rag-doc-qa
knowledge base and exposes it as callable tools to any MCP-compatible client
(Claude Desktop, LangGraph tool node, etc.).

**Important:** The MCP server is a standalone tool — it is NOT used at runtime by the
main research pipeline. The RAG Agent imports rag-doc-qa directly. The MCP server
exists to let you connect Claude Desktop to the same knowledge base for interactive
Q&A without running the full pipeline.

---

## What is MCP?

Model Context Protocol is an open standard (from Anthropic, 2024) that defines how
LLM clients connect to external tools and data sources. It's like a USB standard for
AI tools — any MCP client can connect to any MCP server.

```
MCP Client (e.g. Claude Desktop)          MCP Server (this file)
        │                                         │
        │── list_tools() ───────────────────────►│
        │◄──────────── [search_documents, ...]────│
        │                                         │
        │── call_tool("search_documents", {...}) ─►│
        │◄──────────────── TextContent(text) ─────│
```

**Transport:** stdio (standard input/output). The client spawns the server as a
subprocess and communicates by writing JSON messages to its stdin and reading JSON
responses from its stdout. This is why logging goes to `stderr` — stdout is reserved
for the MCP protocol.

---

## Path Bootstrap

```python
RAG_PROJECT_ROOT = Path(__file__).parent.parent.parent / "rag-doc-qa"
sys.path.insert(0, str(RAG_PROJECT_ROOT))
```

Same pattern as the RAG Agent — injects `rag-doc-qa/` onto `sys.path` so the server
can import `app.services.*` from that project.

---

## MCP SDK Imports

```python
from mcp.server import NotificationOptions, Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)
```

- `Server` — the main MCP server class. Handles protocol-level message parsing.
- `stdio_server` — async context manager that sets up the stdin/stdout transport.
- `Tool` — describes a single tool (name, description, JSON schema for inputs).
- `TextContent` — the return type for tool results. MCP supports multiple content
  types (text, image, resource); we only use `TextContent`.
- `InitializationOptions` — configuration sent to the client during the MCP handshake.

---

## Lazy Loading Pattern

```python
_retriever   = None
_qa_chain    = None
_vector_store = None

def _get_retriever():
    global _retriever
    if _retriever is None:
        logger.info("Lazy-loading rag-doc-qa retriever ...")
        from app.services import retriever
        _retriever = retriever
    return _retriever
```

Three module-level `None` variables serve as lazy singletons.

**Why lazy loading?**
1. **Fast startup** — the MCP server starts in under 1 second. If we imported
   sentence-transformers at module load time, startup would take 10+ seconds.
2. **Conditional loading** — if only `list_documents` is called, the retriever and
   qa_chain are never loaded at all.
3. **Error isolation** — if ChromaDB data is missing, the error surfaces at tool-call
   time with a clear message, not at server startup.

`global _retriever` — declares that the assignment inside the function modifies the
module-level variable, not a new local variable.

---

## Tool Definitions

```python
TOOLS: list[Tool] = [
    Tool(
        name="search_documents",
        description="...",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "..."},
                "k": {"type": "integer", "default": 5, "minimum": 1, "maximum": 20},
            },
            "required": ["query"],
        },
    ),
    ...
]
```

`inputSchema` is a **JSON Schema** object. MCP clients use this to:
- Validate tool call arguments before sending
- Generate UI form fields for tool inputs
- Let Claude understand what arguments to provide

`"required": ["query"]` — `k` is optional (has a `default`), `query` is mandatory.

---

## Tool Handlers

```python
@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    return TOOLS
```

`@server.list_tools()` is a decorator that registers this function as the handler for
the MCP `ListTools` request. When a client asks "what tools do you have?", this returns
the `TOOLS` list.

```python
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
```

`@server.call_tool()` registers this as the handler for all tool calls. The `name`
parameter is the tool name; `arguments` is the parsed JSON input.

---

### `search_documents` Handler

```python
    if name == "search_documents":
        query = arguments.get("query", "")
        k = int(arguments.get("k", 5))

        retriever = _get_retriever()
        results = await asyncio.to_thread(retriever.hybrid_search, query, k)
```

`asyncio.to_thread()` — `hybrid_search()` is synchronous (ChromaDB + BM25). Wrapping
it prevents blocking the MCP server's async event loop.

```python
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        ids       = results.get("ids",       [[]])[0]
```

ChromaDB returns results in a nested-list format: `{"documents": [["chunk1", "chunk2"]]}`
(outer list is per-batch, inner list is per-result). We take `[0]` to get the flat list.

```python
        chunks = []
        for doc, meta, chunk_id in zip(documents, metadatas, ids):
            chunks.append({
                "chunk_id": chunk_id,
                "text": doc,
                "source_filename": meta.get("source_filename", "unknown"),
                ...
            })

        payload = {"query": query, "k": k, "num_results": len(chunks), "chunks": chunks}
        return [TextContent(type="text", text=json.dumps(payload, ensure_ascii=False, indent=2))]
```

All tool results are returned as `list[TextContent]`. MCP requires this wrapping even
for JSON — the content type is "text" and the `text` field holds the JSON string.

`ensure_ascii=False` — allows non-ASCII (accented characters, etc.) to pass through
rather than being escaped.

---

### `answer_with_rag` Handler

```python
    elif name == "answer_with_rag":
        qa = _get_qa_chain()
        result = await asyncio.to_thread(qa.answer_question, question)
        return [TextContent(type="text", text=json.dumps(result, ...))]
```

Calls `answer_question()` from rag-doc-qa — same function used by the RAG Agent.
Returns `{"answer": str, "sources": list[dict]}` as a JSON string.

---

### `list_documents` Handler

```python
    elif name == "list_documents":
        vs = _get_vector_store()
        docs = await asyncio.to_thread(vs.get_all_documents_info)
        payload = {"num_documents": len(docs), "documents": docs}
        return [TextContent(type="text", text=json.dumps(payload, ...))]
```

Lists all documents currently in ChromaDB. Useful for knowing what's indexed before
deciding which search to run.

---

## Entry Point

```python
async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        init_options = InitializationOptions(
            server_name="rag-mcp-server",
            server_version="1.0.0",
            capabilities=server.get_capabilities(
                notification_options=NotificationOptions(),
                experimental_capabilities={},
            ),
        )
        await server.run(read_stream, write_stream, init_options)

if __name__ == "__main__":
    asyncio.run(main())
```

`stdio_server()` — async context manager that:
1. Sets up stdin as the read stream
2. Sets up stdout as the write stream
3. Handles buffering and framing of MCP JSON messages

`server.run(read_stream, write_stream, init_options)` — starts the MCP protocol loop,
reading requests and dispatching them to the registered handlers indefinitely.

`asyncio.run(main())` — creates the event loop and runs `main()` synchronously from
the `__main__` entry point.

---

## Connecting to Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rag-knowledge-base": {
      "command": "python",
      "args": ["C:/Users/bvnik/portfolio_projects/multi-agent-researcher/mcp_server/server.py"]
    }
  }
}
```

Claude Desktop will spawn the MCP server as a subprocess on startup. You can then
ask Claude "search my documents for X" and it will call the `search_documents` tool.

---

## Why stdio Transport?

MCP supports three transports: stdio, HTTP+SSE, and WebSocket. stdio is used here
because:
- Zero configuration — no ports, no URLs, no network setup
- Built-in security — only the parent process can communicate
- Claude Desktop's native integration uses stdio for local servers
- No separate server process to manage — the client starts and stops it automatically
