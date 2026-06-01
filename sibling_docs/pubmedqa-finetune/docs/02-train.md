# train.py — Line by Line

This script runs once on GPU (Colab) and does everything: loads data, tokenizes, trains the model, evaluates, and pushes to HuggingFace Hub.

---

## Imports

```python
import os
import numpy as np
from dotenv import load_dotenv
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
from sklearn.metrics import accuracy_score, f1_score, classification_report
```

- `os` — access environment variables (`os.environ.get("HF_TOKEN")`)
- `numpy` — array math for metric computation (`np.argmax`)
- `load_dotenv` — reads `.env` file and loads each line into `os.environ`
- `load_dataset` — downloads datasets from HuggingFace Hub with local caching
- `AutoTokenizer` — loads the right tokenizer for any model by name
- `AutoModelForSequenceClassification` — loads BiomedBERT + adds a classification head
- `TrainingArguments` — a config object holding all hyperparameters
- `Trainer` — the training loop (handles forward pass, backward pass, checkpointing, logging, Hub push)
- sklearn metrics — `accuracy_score`, `f1_score`, `classification_report`

---

## Constants

```python
MODEL_NAME = "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
```
The exact HuggingFace Hub model ID. Breaking it down:
- `microsoft` — published by Microsoft Research
- `BiomedNLP` — biomedical NLP group
- `BiomedBERT` — BERT pre-trained on biomedical text
- `base` — 12 transformer layers, 110M parameters (vs `large` which has 24 layers)
- `uncased` — text is lowercased before tokenization ("Statin" = "statin")
- `abstract` — pre-trained on PubMed **abstracts** only (not full papers)

```python
DATASET_CONFIG = "pqa_labeled"
```
PubMedQA has three configs:
- `pqa_labeled` — 1000 examples, expert-annotated (what we use)
- `pqa_unlabeled` — 61,000 examples, no labels
- `pqa_artificial` — 211,000 examples, automatically labeled (lower quality)

```python
LABEL2ID = {"yes": 0, "no": 1, "maybe": 2}
ID2LABEL = {0: "yes", 1: "no", 2: "maybe"}
```
Both mappings are stored in the model's `config.json` when pushed to Hub. This makes the model **self-describing** — anyone calling `pipeline("text-classification", model="nikhilteja30/pubmedqa-bert")` gets the correct labels automatically.

```python
MAX_LENGTH = 512
```
BiomedBERT's hard maximum. Abstracts can be long — anything beyond 512 tokens is truncated from the right. In practice, ~95% of PubMedQA examples fit within 512 tokens.

---

## `setup()`

```python
def setup():
    load_dotenv()
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise EnvironmentError("HF_TOKEN not found in .env file.")
    return token
```

`load_dotenv()` finds the `.env` file in the current directory and loads each `KEY=VALUE` line into `os.environ`. After this call, `os.environ["HF_TOKEN"]` works.

`.get()` is used instead of `os.environ["HF_TOKEN"]` because `.get()` returns `None` on a missing key instead of raising `KeyError`. The explicit check then gives a readable error message rather than a cryptic auth failure later.

---

## `load_and_split()`

```python
def load_and_split():
    dataset = load_dataset(DATASET_ID, DATASET_CONFIG)
    full = dataset["train"]
    split = full.train_test_split(test_size=0.1, seed=42)
    return split["train"], split["test"]
```

`load_dataset()` downloads from Hub on first call and caches to `~/.cache/huggingface/datasets/`. Subsequent calls use cache — no re-download.

`pqa_labeled` only has a `"train"` split — no pre-defined val/test. We create our own with `train_test_split(test_size=0.1, seed=42)`:
- `test_size=0.1` → 10% validation, 90% training → 100 val / 900 train
- `seed=42` → same random split every run (reproducibility)

Note: HuggingFace names the validation split `"test"` inside `train_test_split()`. This is just naming — it's our validation set.

---

## `get_tokenize_fn()`

```python
def get_tokenize_fn(tokenizer):
    def tokenize(examples):
        questions = examples["question"]
        contexts = [
            " ".join(item["contexts"])
            for item in examples["context"]
        ]
        tokenized = tokenizer(
            questions,
            contexts,
            max_length=MAX_LENGTH,
            truncation=True,
            padding="max_length",
        )
        tokenized["labels"] = [
            LABEL2ID[label] for label in examples["final_decision"]
        ]
        return tokenized
    return tokenize
```

**Why a closure?** `dataset.map()` only accepts functions with the signature `fn(examples)`. But we also need the tokenizer. Returning a function from inside another function ("closure") is how we inject the extra variable — the inner `tokenize` function "remembers" the `tokenizer` from the outer scope.

**Batched mode structure:** When `batched=True`, `examples` is a dict of lists:
```python
{
  "question": ["Q1", "Q2", ...],
  "context": [{"contexts": [...], ...}, {"contexts": [...], ...}, ...],
  "final_decision": ["yes", "no", ...]
}
```
So `examples["context"]` is a **list of dicts**, one per example. We iterate over it to access each example's context paragraphs.

**Joining paragraphs:** Each abstract in PubMedQA has 1-12 paragraphs stored as a list of strings. We join them with a space to create one continuous abstract string. The model receives the full abstract as one input.

**Text pair tokenization:** Passing two arguments to the tokenizer creates a text pair:
```
[CLS] question tokens [SEP] abstract tokens [SEP] [PAD] [PAD] ...
     ↑ token_type_id=0 ↑          ↑ token_type_id=1 ↑
```
The `[CLS]` token's final embedding is what flows into the classification head. The model uses `token_type_ids` to know which tokens are the question vs the abstract.

**`padding="max_length"`** pads all sequences to exactly 512 tokens with `[PAD]` tokens. The `attention_mask` is set to 0 for padding positions, so the model ignores them.

**`truncation=True`** cuts from the right side. If question + abstract > 512 tokens, the end of the abstract is cut off. This is acceptable because PubMedQA abstracts are structured — the key information is usually in the first paragraphs.

---

## `compute_metrics()`

```python
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    acc = accuracy_score(labels, preds)
    f1 = f1_score(labels, preds, average="macro")
    return {"accuracy": acc, "f1_macro": f1}
```

Called by Trainer after every evaluation epoch. `eval_pred` is a named tuple:
- `.predictions` — raw logits, shape `(100, 3)`
- `.label_ids` — true integer labels, shape `(100,)`

`np.argmax(logits, axis=-1)` picks the highest-scoring class for each example. `axis=-1` means "along the last dimension" (the 3 classes).

**Why macro F1?** With imbalanced classes (~55% yes, ~30% no, ~15% maybe), accuracy is misleading. A model that always predicts "yes" gets ~55% accuracy but is useless. Macro F1 computes F1 for each class separately and averages equally — it cares just as much about the rare "maybe" class as the common "yes" class.

The return dict key `"f1_macro"` matches `metric_for_best_model="f1_macro"` in TrainingArguments — that's how Trainer knows which metric to use for checkpoint selection.

---

## Model Loading

```python
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=3,
    id2label=ID2LABEL,
    label2id=LABEL2ID,
)
```

`AutoModelForSequenceClassification` detects from `config.json` that BiomedBERT is a BERT architecture and loads `BertForSequenceClassification`. This model is:
- **BiomedBERT body** — 12 transformer layers loaded from pre-trained weights
- **Classification head** — a single linear layer `(768 → 3)` that is **randomly initialized**

You will always see this warning:
```
Some weights of BertForSequenceClassification were not initialized from the model 
checkpoint: ['classifier.bias', 'classifier.weight']
```
This is **correct and expected**. The BERT body weights are fine. Only the new classification head starts random and learns during training.

`id2label` and `label2id` get saved into `config.json` when the model is pushed to Hub, making it self-describing.

---

## WeightedTrainer (Colab notebook version)

```python
class WeightedTrainer(Trainer):
    def __init__(self, class_weights, **kwargs):
        super().__init__(**kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss_fn = nn.CrossEntropyLoss(weight=self.class_weights.to(outputs.logits.device))
        loss = loss_fn(outputs.logits, labels)
        return (loss, outputs) if return_outputs else loss
```

We inherit from `Trainer` and override only `compute_loss`. Everything else (training loop, checkpointing, evaluation, Hub push) stays unchanged.

**Why `inputs.pop("labels")`?** When we call `model(**inputs)` with labels present, the model computes its own loss internally. We don't want that — we want to compute our own weighted loss. Popping labels beforehand gives us raw logits without an internally computed loss.

**`self.class_weights.to(outputs.logits.device)`** — moves the weight tensor to the same device as the model (GPU/CPU). If we forgot `.to(device)`, PyTorch would raise an error about tensors on different devices.

**Class weights computed with:**
```python
weights = compute_class_weight("balanced", classes=np.array([0, 1, 2]), y=train_labels)
```
`"balanced"` means weight = `total_samples / (n_classes × class_count)`. With ~55% yes, ~30% no, ~15% maybe, the weights come out roughly `[0.61, 1.11, 2.22]` — maybe gets ~3.6x more penalty than yes.

---

## TrainingArguments

```python
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=2e-5,
    warmup_steps=34,
    weight_decay=0.01,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1_macro",
    greater_is_better=True,
    fp16=True,
    push_to_hub=True,
    hub_model_id=HUB_MODEL_ID,
    hub_token=HF_TOKEN,
    report_to="none",
)
```

| Argument | Value | Why |
|---|---|---|
| `num_train_epochs` | 3 | With 900 examples, more epochs cause overfitting |
| `per_device_train_batch_size` | 16 | GPU can handle 16; use 8 on CPU |
| `learning_rate` | 2e-5 | Lower than default (5e-5) — BiomedBERT is already domain-adapted, needs gentle updates |
| `warmup_steps` | 34 | ~10% of total steps — ramps LR from 0 to 2e-5 to protect the random classification head from large early updates |
| `weight_decay` | 0.01 | L2 regularization — slightly penalizes large weights to reduce overfitting |
| `eval_strategy` | "epoch" | Evaluate after every epoch |
| `load_best_model_at_end` | True | If epoch 2 was best and epoch 3 overfit, reload epoch 2 |
| `metric_for_best_model` | "f1_macro" | Best checkpoint = highest macro F1 |
| `fp16` | True | Half-precision training on GPU — 2x faster, halves memory |
| `push_to_hub` | True | Auto-push checkpoints during training |
| `report_to` | "none" | Suppress wandb/tensorboard prompts |

---

## Training, Evaluation, Push

```python
trainer.train()
```
Runs the full training loop. Trainer handles:
- Batching and shuffling
- Forward + backward pass every step
- AdamW optimizer with linear LR schedule
- Evaluation after each epoch
- Checkpoint saving

```python
predictions = trainer.predict(val_ds)
preds = np.argmax(predictions.predictions, axis=-1)
print(classification_report(labels, preds, target_names=["yes", "no", "maybe"]))
```
`trainer.predict()` runs inference on the full val set without computing gradients. `classification_report` shows per-class precision, recall, F1, and support — far more informative than a single number.

```python
trainer.push_to_hub(commit_message="...")
```
Uploads the best checkpoint's weights + tokenizer + config to Hub. Creates the repo `nikhilteja30/pubmedqa-bert` if it doesn't exist yet.
