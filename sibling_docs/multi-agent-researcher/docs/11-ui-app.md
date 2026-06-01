# ui/app.py — Streamlit Frontend

## What this file does

Provides the **user interface** for the research assistant. Runs on port 8501 and
gives users:
1. A document upload form to add files to the knowledge base
2. A research query input box
3. A rendered markdown report with collapsible raw results

All data comes from the Orchestrator API (port 8000) — the UI contains no business logic.

---

## Constants

```python
ORCHESTRATOR_URL = "http://localhost:8000"
REQUEST_TIMEOUT  = 120  # seconds
```

`REQUEST_TIMEOUT = 120` — the full research pipeline can take 30–60 seconds (LLM calls
+ web search + polling). 120 seconds gives generous headroom.

---

## Page Configuration

```python
st.set_page_config(
    page_title="Multi-Agent Research Assistant",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)
```

**Must be the first Streamlit call.** Streamlit raises an error if you call any other
`st.*` function before `set_page_config()`. This sets the browser tab title, favicon,
and layout mode.

`layout="wide"` — uses the full browser width instead of a centered column. Better for
displaying long research reports.

---

## Sidebar — Architecture Diagram

```python
with st.sidebar:
    st.header("Architecture")
    st.code("""...""", language=None)

    st.header("Services")
    services = [
        ("Orchestrator", 8000, "LangGraph state machine + REST API"),
        ...
    ]
    for name, port, description in services:
        st.markdown(f"**{name}** · port `{port}`")
        st.caption(description)
```

`st.code(..., language=None)` — renders text in a monospace code block without syntax
highlighting. Used for the ASCII architecture diagram.

`st.caption()` — smaller, greyed-out text. Good for secondary information.

The sidebar is visible at all times, showing the system architecture to anyone
reviewing the demo.

---

## Knowledge Base Upload

```python
with st.expander("Upload document to Knowledge Base", expanded=False):
    uploaded_file = st.file_uploader(
        "Upload a PDF, TXT, or DOCX file",
        type=["pdf", "txt", "docx"],
    )
```

`st.expander(..., expanded=False)` — collapsible section. Collapsed by default so the
upload UI doesn't clutter the main page.

`st.file_uploader(type=["pdf", "txt", "docx"])` — browser file picker that filters
to the accepted types. Returns a `UploadedFile` object or `None`.

```python
    if uploaded_file is not None:
        if st.button("Add to Knowledge Base"):
            with st.spinner(f"Uploading {uploaded_file.name}..."):
                try:
                    response = requests.post(
                        f"{ORCHESTRATOR_URL}/upload",
                        files={"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)},
                        timeout=60,
                    )
                    response.raise_for_status()
                    result = response.json()
                    st.success(f"Uploaded **{uploaded_file.name}** — {result['num_chunks']} chunks indexed.")
```

**`uploaded_file.getvalue()`** — returns the file content as bytes. Needed for the
multipart POST.

**`files={"file": (name, bytes, mime_type)}`** — the `requests` library multipart
format. This maps to what FastAPI's `UploadFile` expects.

**`st.spinner()`** — shows a spinning indicator while the upload is in progress.
Streamlit blocks the UI during this time.

**Two nested `if` checks:**
- Outer `if uploaded_file is not None` — file has been selected
- Inner `if st.button(...)` — button has been clicked

This pattern prevents the upload from triggering automatically when a file is selected.

```python
                except requests.exceptions.HTTPError:
                    st.error(f"Upload failed: {response.json().get('detail', 'Unknown error')}")
                except Exception as exc:
                    st.error(f"Upload failed: {exc}")
```

Two exception handlers:
- `HTTPError` — the API returned a 4xx/5xx. Extract the detail from the JSON body.
- General `Exception` — network errors, JSON parse failures, etc.

---

## Live Document List

```python
    try:
        docs_resp = requests.get(f"{ORCHESTRATOR_URL}/documents", timeout=5)
        if docs_resp.ok:
            docs = docs_resp.json().get("documents", [])
            if docs:
                st.caption(f"{len(docs)} document(s) in knowledge base:")
                for doc in docs:
                    st.markdown(f"- **{doc['filename']}** — {doc['num_chunks']} chunks")
            else:
                st.caption("No documents uploaded yet.")
    except Exception:
        pass
```

Called every time the expander is open (Streamlit reruns the whole script on every
interaction). The `try/except: pass` silently ignores errors — if the API is offline,
the document list simply doesn't appear rather than crashing the upload UI.

`timeout=5` — short timeout since this is a status display, not a critical operation.

---

## Research Form

```python
with st.form(key="research_form"):
    query = st.text_input(
        label="Research query",
        placeholder="e.g. What are the latest advances in RAG systems?",
        help="...",
    )
    submitted = st.form_submit_button("Research", use_container_width=True)
```

`st.form` — groups widgets into a form. Streamlit doesn't rerun the script for widget
changes inside a form; it only reruns when the submit button is clicked. Without this,
every keystroke in the text input would trigger a rerun.

`use_container_width=True` — makes the button full-width.

---

## Handling Submission

```python
if submitted:
    query = query.strip()
    if not query:
        st.warning("Please enter a research query before clicking Research.")
        st.stop()
```

`st.stop()` — halts the script execution at this point. Equivalent to an early return.

```python
    with st.spinner("Agents researching..."):
        try:
            response = requests.post(
                f"{ORCHESTRATOR_URL}/research",
                json={"query": query},
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
```

`json={"query": query}` — `requests` automatically:
1. Serializes the dict to a JSON string
2. Sets `Content-Type: application/json`

The `with st.spinner()` block shows the spinner for the entire duration of the blocking
`requests.post()` call.

---

## Error Handling

```python
        except requests.exceptions.ConnectionError:
            st.error("Could not connect to the Orchestrator at ...")
            st.stop()

        except requests.exceptions.Timeout:
            st.error(f"The request timed out after {REQUEST_TIMEOUT} seconds...")
            st.stop()

        except requests.exceptions.HTTPError as exc:
            try:
                detail = response.json().get("detail", str(exc))
            except Exception:
                detail = str(exc)
            st.error(f"Orchestrator returned an error: {detail}")
            st.stop()

        except Exception as exc:
            st.error(f"Unexpected error: {exc}")
            st.stop()
```

Four distinct error types with user-friendly messages:
- `ConnectionError` — orchestrator not running
- `Timeout` — pipeline took longer than 120 seconds
- `HTTPError` — API returned 4xx/5xx (extracts the detail field)
- Generic `Exception` — anything else

Each case calls `st.stop()` to prevent the results section from attempting to render
with `data = None`.

---

## Results Rendering

```python
    final_report: str = data.get("final_report", "")
    web_results: str  = data.get("web_results", "")
    rag_results: str  = data.get("rag_results", "")
    status: str       = data.get("status", "completed")

    st.success("Research complete!")

    if status and status != "completed":
        st.info(f"Pipeline status: `{status}`")

    st.markdown("## Final Report")
    if final_report:
        st.markdown(final_report)
    else:
        st.warning("The synthesis agent returned an empty report.")

    with st.expander("Web Search Results"):
        if web_results:
            st.text(web_results)
        else:
            st.caption("No web search results were returned.")

    with st.expander("Knowledge Base Results"):
        if rag_results:
            st.text(rag_results)
        else:
            st.caption("No knowledge base results were returned.")
```

**`st.markdown(final_report)`** — renders the markdown from the Synthesis Agent with
proper headers, bullets, and bold text.

**`st.text(web_results)`** — renders pre-formatted plain text (preserves newlines and
spacing). Used for raw agent output that's not meant to be markdown.

**`st.expander()`** for raw results — collapsed by default so the final report is the
dominant element. Power users can expand to inspect what each agent returned.

---

## Streamlit Execution Model

Every user interaction (button click, text change outside a form, expander toggle)
causes Streamlit to **re-run the entire script from top to bottom**. This means:

- The document list fetch runs on every page load (acceptable with a 5s timeout)
- `submitted` is `True` only on the frame when the form button is clicked
- On the next interaction, `submitted` becomes `False` and the results disappear

This is why `st.session_state` would be needed to persist results across interactions
in a production UI. For this demo, results are shown immediately after submission and
the user re-submits if they want to run another query.
