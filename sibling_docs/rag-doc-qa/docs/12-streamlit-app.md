# streamlit_app.py — Chat UI Frontend

**File:** `ui/streamlit_app.py`

## What This File Does

The user-facing frontend. Provides a chat interface for asking questions, a sidebar for managing documents, and expandable sections for source citations and chunk inspection. All communication with the backend happens through HTTP requests.

## Line-by-Line Explanation

### Setup

```python
import streamlit as st
import requests
import os

API_URL = os.getenv("API_URL", "http://localhost:8000")
```
**Lines 1-5:**
- `streamlit as st` — Streamlit's main module. Every UI element (`st.title`, `st.chat_input`, etc.) comes from here.
- `requests` — Python's standard HTTP library for calling the FastAPI backend.
- `API_URL` — Reads from environment variable, defaults to localhost. This makes the UI configurable: `API_URL=http://api:8000` for Docker, `http://localhost:8080` for custom ports.

```python
st.set_page_config(
    page_title="RAG Document Q&A",
    page_icon="📄",
    layout="wide",
)
```
**Lines 7-11:** Configures the browser tab title, favicon, and page width. `layout="wide"` uses the full browser width instead of a centered narrow column — needed for the sidebar + chat layout.

---

### Session State

```python
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "messages" not in st.session_state:
    st.session_state.messages = []
```
**Lines 13-17:** Initializes persistent state.

**Why do we need this?** Streamlit reruns the ENTIRE script from top to bottom on every interaction (button click, text input, etc.). Without `st.session_state`, all variables would reset. Session state persists across reruns.

- `chat_history` — The Q&A pairs sent to the backend for conversation context (`[{"role": "user", "content": "..."}, ...]`).
- `messages` — The full message list for rendering the chat UI (includes sources and formatting).

---

### Sidebar: Document Upload

```python
with st.sidebar:
    st.header("📁 Document Library")

    uploaded_file = st.file_uploader(
        "Upload a document",
        type=["pdf", "txt", "docx"],
        help="Supported formats: PDF, TXT, DOCX",
    )
```
**Lines 19-28:**
- `with st.sidebar:` — Everything inside this block appears in the left sidebar.
- `st.file_uploader(...)` — Renders a file upload widget. `type=[...]` restricts to allowed formats. Streamlit handles the file picker dialog.

```python
    if uploaded_file and st.button("Process Document", type="primary", use_container_width=True):
        with st.spinner(f"Processing '{uploaded_file.name}'..."):
            try:
                files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
                response = requests.post(f"{API_URL}/documents/upload", files=files, timeout=120)
```
**Lines 30-34:**
- `if uploaded_file and st.button(...)` — Only show the process button when a file is selected. Both conditions must be true.
- `st.spinner(...)` — Shows a loading animation while processing.
- `files = {"file": (filename, bytes)}` — Constructs a multipart form upload. The `requests` library sends this as `multipart/form-data`, which is what FastAPI's `UploadFile` expects.
- `timeout=120` — 2 minutes. Document processing can take a while (embedding all chunks).

```python
                if response.status_code == 200:
                    data = response.json()
                    st.success(f"✅ {data['message']}")
                else:
                    st.error(f"Error: {response.json().get('detail', 'Upload failed')}")
            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to the API. Is the backend running?")
```
**Lines 35-41:** Handles the response.
- `st.success(...)` — Green banner for success.
- `st.error(...)` — Red banner for errors.
- `ConnectionError` — Specifically catches the case where the backend isn't running.

---

### Sidebar: Document List

```python
    st.subheader("Uploaded Documents")
    try:
        docs_response = requests.get(f"{API_URL}/documents/", timeout=10)
        if docs_response.status_code == 200:
            documents = docs_response.json()
            if not documents:
                st.info("No documents uploaded yet.")
            for doc in documents:
                with st.expander(f"📄 {doc['filename']}"):
```
**Lines 48-56:** Lists all uploaded documents.
- `st.expander(...)` — Creates a collapsible section for each document. Clicking expands it to show chunk count, page count, and action buttons.
- The document list refreshes on every Streamlit rerun (every interaction), so it's always current.

```python
                    if st.button("View Chunks", key=f"chunks_{doc['doc_id']}"):
                        try:
                            chunks_resp = requests.get(
                                f"{API_URL}/documents/{doc['doc_id']}/chunks", timeout=10
                            )
                            if chunks_resp.status_code == 200:
                                chunks_data = chunks_resp.json()
                                for chunk in chunks_data["chunks"][:3]:
                                    st.text_area(
                                        f"Chunk {chunk['chunk_index']} (Page {chunk['page_number'] + 1}, {chunk['length']} chars)",
                                        chunk["text"],
                                        height=100,
                                        disabled=True,
                                        key=f"chunk_{doc['doc_id']}_{chunk['chunk_index']}",
                                    )
                                if len(chunks_data["chunks"]) > 3:
                                    st.caption(f"... and {len(chunks_data['chunks']) - 3} more chunks")
```
**Lines 62-78:** The **Chunk Insights** feature.
- Shows the first 3 chunks as read-only text areas.
- Each chunk displays: its index, page number, character length, and full text.
- `key=f"chunk_{...}"` — Every Streamlit widget needs a unique `key` when created in a loop. Without it, Streamlit can't tell which widget was interacted with.
- Shows "... and N more chunks" if there are more than 3.

```python
                    if st.button("🗑️ Delete", key=f"del_{doc['doc_id']}"):
                        ...
                        st.rerun()
```
**Lines 83-94:** Delete button.
- `st.rerun()` — Forces Streamlit to rerun the entire script, which refreshes the document list (the deleted document disappears).

---

### Main Area: Chat Interface

```python
st.title("📄 RAG Document Q&A")
st.markdown("Upload documents and ask questions — powered by Claude AI and semantic search")
st.divider()
```
**Lines 102-105:** The main content area header.

```python
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if message.get("sources"):
            with st.expander("📚 Sources"):
                for src in message["sources"]:
                    page_info = f"Page {src['page']}" if src.get("page") else "N/A"
                    st.markdown(f"**{src['filename']}** — {page_info}")
                    st.caption(src["snippet"])
```
**Lines 107-116:** Renders the chat history.
- `st.chat_message(role)` — Creates a chat bubble. `"user"` shows on the right with a person icon, `"assistant"` shows on the left with a bot icon.
- Sources are inside an `st.expander` — visible on click, not cluttering the chat.
- This loop re-renders ALL messages on every rerun, which is why we store them in session state.

```python
if prompt := st.chat_input("Ask a question about your documents..."):
```
**Line 119:** The **walrus operator** (`:=`). It assigns the input to `prompt` AND checks if it's truthy, in one line. If the user typed something and pressed Enter, `prompt` contains the text.

```python
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
```
**Lines 121-123:** Immediately shows the user's message in the chat. This gives instant feedback while we wait for the API.

```python
    with st.chat_message("assistant"):
        with st.spinner("Searching documents and generating answer..."):
            try:
                response = requests.post(
                    f"{API_URL}/query",
                    json={
                        "question": prompt,
                        "chat_history": st.session_state.chat_history,
                    },
                    timeout=120,
                )
```
**Lines 126-136:** Calls the query API.
- `json={...}` — Sends a JSON body (not form data). `requests` automatically sets `Content-Type: application/json`.
- `chat_history` from session state enables follow-up questions.

```python
                if response.status_code == 200:
                    data = response.json()
                    answer = data["answer"]
                    sources = data.get("sources", [])

                    st.markdown(answer)
                    if sources:
                        with st.expander("📚 Sources"):
                            ...

                    st.caption(f"⏱ Answered in {data['time_taken_seconds']}s")
```
**Lines 138-151:** Displays the answer.
- The answer is rendered as Markdown (supports bold, lists, etc.).
- Sources shown in an expandable section.
- Timing displayed as a caption (small, subtle text).

```python
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer,
                        "sources": sources,
                    })
                    st.session_state.chat_history.append({"role": "user", "content": prompt})
                    st.session_state.chat_history.append({"role": "assistant", "content": answer})
```
**Lines 154-160:** Updates both state stores.
- `messages` — For rendering the chat UI (includes sources).
- `chat_history` — For sending to the API (plain role/content pairs for context).

## Concepts Covered

| Concept | What It Is |
|---------|-----------|
| **Streamlit** | Python framework for building data/AI web apps with minimal code |
| **Session State** | Persistent storage across Streamlit reruns |
| **Chat Interface** | `st.chat_message` + `st.chat_input` for conversational UIs |
| **Sidebar Layout** | `with st.sidebar:` for secondary controls |
| **Multipart Upload** | Sending files via HTTP `multipart/form-data` |
| **Walrus Operator** | `:=` for assignment + boolean check in one expression |
| **Widget Keys** | Unique identifiers for Streamlit widgets in loops |
| **Optimistic UI** | Showing the user message immediately, before the API responds |

## Why This Matters for Interviews

"The Streamlit frontend uses `st.chat_message` for a modern chat interface, session state for conversation persistence, and a sidebar for document management. The chat history is sent to the API on every query, enabling follow-up questions. I chose Streamlit over React because for an AI/NLP role, the pipeline matters more than the frontend framework — but I still made the UI polished with expandable sources, chunk inspection, and loading states."
