# agents/synthesis/agent.py — Synthesis Agent

## What this file does

Implements the **Synthesis Agent** — a FastAPI A2A server on port 8003 that receives
the original query plus both sets of research results, then uses Claude to produce
a polished markdown research report.

This is the final step in the pipeline before the report is returned to the user.

---

## Input Format

The orchestrator sends a JSON string (not plain text) to this agent:

```json
{
    "query": "What are the latest advances in RAG systems?",
    "web_results": "Web search results for: ...\n\n1. Title\n   URL: ...",
    "rag_results": "Answer: ...\n\nSources:\n  1. doc.pdf, page 3 — ..."
}
```

The agent must parse this JSON, format a prompt, call Claude, and return the report.

---

## Constants

```python
PORT = 8003
CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2048
```

`claude-sonnet-4-6` is used here (the most capable model) because synthesis requires:
- Understanding two sets of results that may use different vocabulary
- Identifying contradictions between web and knowledge base sources
- Producing structured markdown with specific section headers
- Writing 300–600 words concisely

Claude Haiku would work but produces lower-quality reports for this task.

`MAX_TOKENS = 2048` — generous enough for a 600-word report with citations, but bounded
to prevent runaway costs.

---

## System Prompt

```python
SYNTHESIS_SYSTEM_PROMPT = """\
You are a senior research analyst.  Your job is to synthesise information from
two sources — live web search results and a curated document knowledge base —
into a structured, balanced research report.

Rules:
- Write exclusively in Markdown.
- Be factual and precise; do not hallucinate facts not present in the sources.
- If the two sources contradict each other, note the discrepancy explicitly.
- Keep the report concise but complete (300–600 words is ideal).
- Use the section headers exactly as specified.
"""
```

Key rules:
- **"Write exclusively in Markdown"** — the Streamlit UI renders this with `st.markdown()`,
  so markdown headers, bullets, and bold text display properly.
- **"Do not hallucinate"** — grounding instruction. Prevents Claude from adding facts
  from its training data that aren't in the provided sources.
- **"If the two sources contradict each other, note the discrepancy"** — this is a
  distinctive feature for a research tool. Web results reflect current public information;
  the knowledge base may contain older or organization-specific data.
- **"300–600 words"** — avoids both too-short (useless) and too-long (overwhelming) reports.

---

## User Prompt Template

```python
SYNTHESIS_USER_TEMPLATE = """\
Research query: {query}

--- WEB SEARCH RESULTS ---
{web_results}

--- KNOWLEDGE BASE RESULTS ---
{rag_results}

---

Please produce a structured research report with the following sections:

## Summary
A 2–3 sentence overview of the topic.

## Key Findings (from web)
Bullet points highlighting the most relevant facts from the web results.

## From Knowledge Base
What the uploaded document knowledge base adds or confirms.

## Conclusion
A brief synthesis and any caveats or areas of uncertainty.
"""
```

**Why include the section headers in the prompt?** LLMs follow instructions more
reliably when you show the exact format rather than describe it. The system prompt
says "use the section headers exactly as specified" and this template shows them —
double reinforcement.

**`{query}`, `{web_results}`, `{rag_results}`** — Python `.format()` placeholders.
Filled in by `_parse_input()` + `SYNTHESIS_USER_TEMPLATE.format(...)`.

---

## `_get_anthropic_client()`

```python
def _get_anthropic_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set. ...")
    return anthropic.Anthropic(api_key=api_key)
```

Uses the **raw Anthropic Python SDK** directly (not through LangChain). Either works;
this shows you can call the Anthropic API directly without any framework wrapper.

The client is created per-task rather than as a module-level singleton. This is safe
because `anthropic.Anthropic` objects are lightweight (they hold the API key and
configuration but don't maintain persistent connections).

---

## `_parse_input()`

```python
def _parse_input(message: str) -> tuple[str, str, str]:
    try:
        data = json.loads(message)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Synthesis agent expected a JSON string but received invalid JSON: {exc}\n"
            f"Raw message: {message[:200]}"
        ) from exc
```

`json.loads(message)` — parses the JSON string sent by `synthesize_node` in `graph.py`.

`raise ValueError(...) from exc` — the `from exc` clause chains the original
`JSONDecodeError` as the cause of the new `ValueError`. This preserves the full
traceback for debugging while providing a cleaner error message.

```python
    if not web_results:
        web_results = "No web search results were available for this query."
    if not rag_results:
        rag_results = "No knowledge base results were available for this query."
```

Fallback values ensure the prompt is always well-formed even if one agent returned
empty results. The synthesis agent can still produce a partial report.

---

## `process_task()` — Core Logic

```python
async def process_task(message: str) -> str:
    query, web_results, rag_results = _parse_input(message)

    user_prompt = SYNTHESIS_USER_TEMPLATE.format(
        query=query,
        web_results=web_results,
        rag_results=rag_results,
    )

    client = _get_anthropic_client()
```

`SYNTHESIS_USER_TEMPLATE.format(...)` — standard Python string formatting. Replaces
`{query}`, `{web_results}`, `{rag_results}` with their actual values.

```python
    def _call_claude() -> str:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYNTHESIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    report: str = await asyncio.to_thread(_call_claude)
```

**Why wrap in `asyncio.to_thread()`?**

`client.messages.create()` is the Anthropic SDK's **synchronous** API call. It makes
an HTTP request and blocks until Claude responds — which can take 5–15 seconds for a
long synthesis.

If called directly inside `async def process_task()`, it would block the asyncio event
loop for that duration. During this time:
- No other coroutines can run on that thread
- The HTTP response to the A2A POST `/tasks/send` would be delayed
- The orchestrator's polling requests would time out

`asyncio.to_thread(_call_claude)` runs `_call_claude` in a thread pool worker. The
event loop remains unblocked — it can handle other requests and coroutines while
Claude generates the report.

```python
    response.content[0].text
```

`client.messages.create()` returns a `Message` object. `content` is a list of content
blocks (usually just one). Each block has a `type` ("text" or "tool_use") and `text`.
We take `content[0].text` — the first (and only) text block.

---

## Anthropic SDK vs LangChain

| | Raw Anthropic SDK | LangChain ChatAnthropic |
|---|---|---|
| Import | `import anthropic` | `from langchain_anthropic import ChatAnthropic` |
| Call | `client.messages.create(model=..., messages=[...])` | `llm.invoke([HumanMessage(...)])` |
| Response | `response.content[0].text` | `response.content` (string directly) |
| Async | `client.messages.create()` (sync) / `AsyncAnthropic` | `llm.ainvoke()` (async) |
| Used in | Synthesis Agent | plan_node in graph.py |

Both work fine. The synthesis agent uses the raw SDK to show that LangChain is optional.

---

## Output Example

```markdown
## Summary
RAG (Retrieval-Augmented Generation) systems have advanced significantly in 2024,
with new approaches combining sparse and dense retrieval, graph-based knowledge
integration, and improved citation generation.

## Key Findings (from web)
- GraphRAG uses entity extraction and knowledge graphs for multi-hop reasoning
- ColBERT-based late interaction improves retrieval precision by 15% on BEIR benchmarks
- Hybrid BM25 + semantic search is now the production standard at most AI companies

## From Knowledge Base
The uploaded research papers confirm hybrid retrieval effectiveness, citing a 23%
improvement in answer accuracy vs. pure semantic search on domain-specific corpora.
No contradictions found between web and knowledge base sources.

## Conclusion
RAG systems are maturing rapidly. The main uncertainty is around scaling graph-based
approaches to very large document collections efficiently.
```
