# qa_chain.py — Claude RAG Chain with Citations

**File:** `app/services/qa_chain.py`

## What This File Does

This is where **retrieval meets generation**. It takes the retrieved chunks from hybrid search, formats them into a prompt, sends that prompt to Claude, and returns the answer with structured source citations. This is the "G" in RAG.

## Line-by-Line Explanation

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.services import retriever
```
**Lines 1-5:**
- `ChatAnthropic` — LangChain's wrapper around the Anthropic API. Handles API calls, retries, and response parsing.
- `ChatPromptTemplate` — A template for building prompts with variable placeholders (`{context}`, `{question}`).
- `retriever` — Our hybrid search module (semantic + BM25 + RRF).

---

### The Prompt Template

```python
QA_PROMPT = ChatPromptTemplate.from_template(
    """You are a document Q&A assistant. Answer the question based ONLY on the
provided context excerpts. For each claim in your answer, cite the source
using the format [Source: filename, Page X].

If the context does not contain enough information to answer the question,
explicitly state that the provided documents don't contain this information.

Context:
{context}

Chat History:
{chat_history}

Question: {question}"""
)
```
**Lines 7-22:** The **prompt template** — arguably the most important piece of prompt engineering in the project.

Breaking down each instruction:

1. **"Answer based ONLY on the provided context excerpts"** — This is the anti-hallucination instruction. Without it, Claude might use its training knowledge to answer, defeating the purpose of RAG. The word "ONLY" is intentionally capitalized for emphasis.

2. **"For each claim, cite the source using the format [Source: filename, Page X]"** — Forces structured citations. By specifying the exact format, we ensure citations are consistent and parseable. Claude follows formatting instructions reliably.

3. **"If the context does not contain enough information... explicitly state that"** — The honesty instruction. Without this, Claude might try to be helpful by guessing, which breaks trust. A good RAG system says "I don't know" rather than fabricating an answer.

4. **`{context}`** — Replaced with the formatted chunks (see `format_context` below).

5. **`{chat_history}`** — Replaced with previous Q&A turns for follow-up questions.

6. **`{question}`** — The user's actual question.

**Why is the prompt defined as a module-level constant?** It never changes at runtime, and defining it once makes it easy to find and modify.

---

### LLM Initialization

```python
_llm = None


def get_llm() -> ChatAnthropic:
    global _llm
    if _llm is None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set. Add it to your .env file.")
        _llm = ChatAnthropic(
            model=settings.llm_model,
            anthropic_api_key=settings.anthropic_api_key,
            temperature=settings.llm_temperature,
        )
    return _llm
```
**Lines 24-37:** Lazy singleton for the Claude LLM client.
- `if not settings.anthropic_api_key` — Explicit check with a clear error message. Since we made the API key optional in config (for tests), we validate here where it's actually needed.
- `temperature=0` — Deterministic output. Same question + same context = same answer. For factual Q&A, you want reproducibility, not creativity.

---

### Formatting Context

```python
def format_context(results: dict) -> tuple[str, list[dict]]:
    """Format retrieved chunks into context string and source references."""
    context_parts = []
    sources = []

    documents = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
```
**Lines 40-46:** Unpacks the retriever's results. The `[0]` indexing handles ChromaDB's double-nested format.

```python
    for doc, metadata in zip(documents, metadatas):
        page = metadata.get("page_number", -1)
        page_display = page + 1 if page >= 0 else None
        filename = metadata.get("source_filename", "unknown")

        page_label = f"Page {page_display}" if page_display else "N/A"
        context_parts.append(
            f"[Source: {filename}, {page_label}]\n{doc}"
        )
```
**Lines 48-56:** Formats each chunk for the prompt.
- `page + 1` — Converts from 0-indexed (internal) to 1-indexed (human-friendly). Page 0 becomes "Page 1".
- Each chunk in the context looks like:
  ```
  [Source: report.pdf, Page 3]
  AI-powered diagnostic tools have achieved remarkable accuracy...
  ```
- The `[Source: ...]` prefix matches what we asked Claude to cite. This makes it easy for Claude to copy the citation format exactly.

```python
        sources.append({
            "filename": filename,
            "page": page_display,
            "chunk_index": metadata.get("chunk_index", 0),
            "snippet": doc[:200] + "..." if len(doc) > 200 else doc,
        })

    return "\n\n---\n\n".join(context_parts), sources
```
**Lines 58-65:** Builds the structured source references for the API response.
- `snippet: doc[:200] + "..."` — Shows the first 200 characters as a preview. Enough to identify the source without flooding the response.
- Chunks are separated by `---` in the context string — a visual separator that helps Claude distinguish between different sources.
- Returns TWO things: the formatted context string (for the prompt) and the sources list (for the API response).

---

### Chat History Formatting

```python
def format_chat_history(chat_history: list[dict[str, str]]) -> str:
    if not chat_history:
        return "No previous conversation."
    lines = []
    for msg in chat_history[-5:]:  # Keep last 5 turns
        role = msg.get("role", "user")
        content = msg.get("content", "")
        lines.append(f"{role.capitalize()}: {content}")
    return "\n".join(lines)
```
**Lines 68-76:** Formats previous conversation turns for follow-up questions.
- `chat_history[-5:]` — Only includes the last 5 turns. This prevents the prompt from growing too large with long conversations.
- `"No previous conversation."` — Explicit text for the empty case. Leaving it blank might confuse the prompt template.
- This enables conversations like:
  - Q: "What does chapter 3 cover?" → A: "Chapter 3 covers drug discovery..."
  - Q: "How long does the traditional process take?" → Claude knows "the process" refers to drug discovery from the chat history.

---

### The Main Answer Function

```python
def answer_question(question: str, chat_history: list[dict[str, str]] | None = None) -> dict:
    """Retrieve relevant chunks and generate an answer with citations."""
    if chat_history is None:
        chat_history = []
```
**Lines 79-82:** Entry point. Accepts the question and optional chat history.

```python
    # Hybrid search: semantic + BM25 with Reciprocal Rank Fusion
    results = retriever.hybrid_search(question, k=settings.max_retrieval_k)
```
**Lines 84-85:** **Retrieval step.** Calls the hybrid retriever to find the top 5 most relevant chunks. This is the "R" in RAG.

```python
    context_str, sources = format_context(results)

    if not context_str:
        return {
            "answer": "No documents have been uploaded yet. Please upload a document first.",
            "sources": [],
        }
```
**Lines 87-93:** Formats the results and handles the empty case. If no documents exist, return a helpful message instead of sending an empty context to Claude.

```python
    # Generate answer with Claude
    llm = get_llm()
    chain = QA_PROMPT | llm
    response = chain.invoke({
        "context": context_str,
        "chat_history": format_chat_history(chat_history),
        "question": question,
    })
```
**Lines 95-102:** **Generation step.** The "G" in RAG.
- `QA_PROMPT | llm` — This is **LangChain Expression Language (LCEL)**. The `|` operator creates a chain: the prompt template feeds into the LLM. It's like a Unix pipe: `template | model`.
- `chain.invoke({...})` — Fills in the template variables and sends the complete prompt to Claude.
- Claude receives a prompt like:
  ```
  You are a document Q&A assistant. Answer based ONLY on...

  Context:
  [Source: report.pdf, Page 2]
  AI-powered diagnostic tools have achieved...
  ---
  [Source: report.pdf, Page 3]
  Traditional drug discovery takes 10-15 years...

  Chat History:
  No previous conversation.

  Question: What is the accuracy of AI in detecting lung nodules?
  ```

```python
    return {
        "answer": response.content,
        "sources": sources,
    }
```
**Lines 104-107:** Returns the answer text and source references. `response.content` extracts just the text from Claude's response object.

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **RAG (Retrieval-Augmented Generation)** | Retrieve relevant context, then generate an answer from it |
| **Prompt Engineering** | Crafting instructions that guide the LLM's behavior (anti-hallucination, citation format, honesty) |
| **LCEL (LangChain Expression Language)** | Composable chains using the `\|` pipe operator |
| **Grounded Generation** | Generating answers strictly from provided context, not training data |
| **Source Citations** | Tracing each claim back to its source document and page |
| **Conversation Memory** | Including chat history for follow-up questions |
| **Temperature** | Controls randomness; 0 = deterministic output |
| **Context Window** | The amount of text an LLM can process at once |

## Why This Matters for Interviews

"The prompt template is where RAG lives or dies. Three key instructions: answer ONLY from context (prevents hallucination), cite every claim (builds trust), and say 'I don't know' when context is insufficient (honesty over helpfulness). I use LCEL to compose the prompt and LLM into a clean chain. Temperature is 0 for deterministic, reproducible answers."
