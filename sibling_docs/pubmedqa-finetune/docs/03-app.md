# app.py — Line by Line

The Streamlit inference app. Loads the fine-tuned model from HuggingFace Hub and provides a UI to test it.

---

## Imports and Constants

```python
import streamlit as st
import torch
import torch.nn.functional as F
import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification
```

- `streamlit` — the web app framework. Every `st.` call renders something in the browser.
- `torch` — PyTorch, used for the inference forward pass and tensor operations
- `torch.nn.functional as F` — functional API, used for `F.softmax()`
- `pandas` — creates the probability DataFrame for the table display
- `AutoTokenizer`, `AutoModelForSequenceClassification` — load from Hub by model ID

```python
HUB_MODEL_ID = "nikhilteja30/pubmedqa-bert"
```
The app loads the model from Hub, not from a local file. This means the app is portable — anyone can clone and run it without retraining. The Hub acts as the model registry.

```python
LABEL_COLORS = {"yes": "green", "no": "red", "maybe": "orange"}
```
Used with Streamlit's colored text syntax: `:green[**YES**]`. The color changes based on the prediction.

---

## Model Loading

```python
@st.cache_resource
def load_model():
    with st.spinner("Loading model from HuggingFace Hub (~440MB on first run)..."):
        tokenizer = AutoTokenizer.from_pretrained(HUB_MODEL_ID)
        model = AutoModelForSequenceClassification.from_pretrained(HUB_MODEL_ID)
        model.eval()
    return tokenizer, model
```

**Why `@st.cache_resource`?**

Streamlit is not like a normal Python script. It **reruns the entire file** on every user interaction — every button click, every keystroke in a text box. Without caching, this would download and load the 440MB model on every single interaction, making the app unusable.

`@st.cache_resource` stores the return value (tokenizer + model) in memory after the first call. All subsequent reruns skip the function body and return the cached objects instantly.

**Why `cache_resource` and not `cache_data`?**
- `cache_data` — for serializable objects (DataFrames, lists, numbers). It pickles the return value.
- `cache_resource` — for non-serializable objects like ML models and database connections. It stores the object reference directly without pickling.

PyTorch models cannot be pickled reliably, so `cache_resource` is the correct choice.

**`model.eval()`** switches the model from training mode to evaluation mode. The key difference: it disables **dropout** layers. Dropout randomly zeros out neurons during training to prevent overfitting. During inference you want deterministic, consistent predictions — the same input should always produce the same output.

```python
tokenizer, model = load_model()
```
This line is at module level — it runs once when the app starts. Subsequent reruns skip it via the cache.

---

## `predict()`

```python
def predict(question: str, abstract: str, tokenizer, model):
    inputs = tokenizer(
        question,
        abstract,
        return_tensors="pt",
        max_length=MAX_LENGTH,
        truncation=True,
        padding="max_length",
    )
```

Same tokenization as training — **this must match exactly**. If training used `max_length=512` and inference uses `max_length=256`, the model sees inputs in a format it was never trained on and produces garbage.

`return_tensors="pt"` returns PyTorch tensors instead of Python lists. The result is:
```python
{
  "input_ids": tensor([[101, 2079, ..., 0, 0]]),     # shape: (1, 512)
  "attention_mask": tensor([[1, 1, ..., 0, 0]]),      # shape: (1, 512)
  "token_type_ids": tensor([[0, 0, ..., 0, 0]])       # shape: (1, 512)
}
```
Batch size is 1 (one example at a time).

```python
    with torch.no_grad():
        outputs = model(**inputs)
```

`torch.no_grad()` is a context manager that disables gradient tracking. During training, PyTorch tracks every operation to compute gradients (needed for backpropagation). During inference, gradients are never needed — disabling tracking saves significant memory and computation.

`model(**inputs)` unpacks the dict as keyword arguments:
```python
model(input_ids=tensor(...), attention_mask=tensor(...), token_type_ids=tensor(...))
```

`outputs.logits` is the raw output — shape `(1, 3)`. Example: `[[2.1, -0.5, 0.3]]`

These are not probabilities — they're unnormalized scores. A logit of 2.1 doesn't mean 2.1% — it just means "yes" is the most likely class relative to the others.

```python
    probs = F.softmax(outputs.logits, dim=-1).squeeze().tolist()
```

`F.softmax(logits, dim=-1)` converts logits to probabilities that sum to 1. `dim=-1` applies the softmax along the last dimension (the 3 classes).

```
softmax([2.1, -0.5, 0.3]) → [0.818, 0.060, 0.122]
                             ↑ yes  ↑ no   ↑ maybe
```

`.squeeze()` removes the batch dimension: shape `(1, 3)` → `(3,)`

`.tolist()` converts the tensor to a Python list: `[0.818, 0.060, 0.122]`

```python
    pred_id = int(torch.argmax(torch.tensor(probs)).item())
    return ID2LABEL[pred_id], probs
```

`argmax` finds the index of the highest probability. `.item()` converts a 0-dimensional tensor to a Python int. `ID2LABEL[0]` → `"yes"`.

---

## UI Layout

```python
st.set_page_config(page_title="PubMedQA Classifier", layout="wide")
```
Must be the **first Streamlit call** in the script. `layout="wide"` uses the full browser width instead of the narrow centered column default.

```python
col1, col2 = st.columns(2)
with col1:
    question = st.text_area("Biomedical Research Question", height=120, ...)
with col2:
    abstract = st.text_area("Abstract / Context", height=300, ...)
```
`st.columns(2)` creates two equal-width columns side by side. The `with col1:` context manager directs all Streamlit calls inside it to render in that column. This gives a clean two-panel layout: question on the left, abstract on the right.

```python
if st.button("Predict Answer", type="primary", use_container_width=True):
```
`st.button()` renders a button and returns `True` only on the rerun triggered by clicking it. The entire `if` block runs only when the button is clicked. `type="primary"` gives it the blue filled style. `use_container_width=True` stretches it full width.

```python
    if not question.strip() or not abstract.strip():
        st.warning("Please fill in both the question and the abstract context.")
    else:
        with st.spinner("Running inference..."):
            label, probs = predict(question.strip(), abstract.strip(), tokenizer, model)
```
`st.spinner()` shows a loading animation while the block inside executes. `.strip()` removes leading/trailing whitespace so a space-only input counts as empty.

```python
        color = LABEL_COLORS[label]
        st.markdown(f"## Prediction: :{color}[**{label.upper()}**]")
```
Streamlit's colored text syntax uses `:color[text]` inside markdown strings. The color changes based on the prediction — green for yes, red for no, orange for maybe.

```python
        prob_df = pd.DataFrame({
            "Answer": list(ID2LABEL.values()),
            "Confidence": probs,
        })

        col_chart, col_table = st.columns([2, 1])
        with col_chart:
            st.bar_chart(prob_df.set_index("Answer"))
        with col_table:
            st.dataframe(
                prob_df.style.format({"Confidence": "{:.1%}"}),
                hide_index=True,
            )
```
`st.columns([2, 1])` creates unequal columns — the chart gets 2/3 of the width, the table gets 1/3.

`prob_df.set_index("Answer")` makes "yes"/"no"/"maybe" the x-axis labels for the bar chart.

`.style.format({"Confidence": "{:.1%}"})` formats the Confidence column as a percentage with one decimal place: `0.818` → `81.8%`.

`hide_index=True` removes the 0/1/2 row numbers from the table display.
