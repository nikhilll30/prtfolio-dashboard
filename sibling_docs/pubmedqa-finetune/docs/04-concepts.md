# Concepts Glossary

Every concept used in this project, explained in one place.

---

## Transfer Learning

Taking a model trained on a large general task and adapting it to a specific smaller task.

**Analogy:** A doctor who spent 8 years in medical school already knows anatomy, physiology, and pharmacology. Teaching them to read cardiograms takes weeks, not years — the foundational knowledge transfers. Training a specialist from scratch with zero medical knowledge would take much longer.

**In this project:** BiomedBERT spent months pre-training on 21 million PubMed abstracts. It already knows medical vocabulary, how drug names relate to conditions, how research abstracts are structured. Fine-tuning on 900 PubMedQA examples takes ~8 minutes on GPU rather than weeks.

---

## Fine-Tuning

Updating all (or some) weights of a pre-trained model on a new, smaller dataset for a specific task.

**What actually happens:** We add a new classification head (a linear layer with 3 outputs) on top of BiomedBERT and train the whole thing. The BERT body already has good weights — fine-tuning nudges them to be slightly better for our task. The new head starts random and learns from scratch.

**Why not freeze the BERT body?** For small datasets, freezing is common. For 900 examples of domain-specific text (PubMed abstracts) with a domain-specific base model (BiomedBERT), fine-tuning the whole model tends to work better — the body weights are already close to optimal for this domain.

---

## Domain Adaptation

Pre-training a model on domain-specific data (medical, legal, financial) instead of general text.

**Why it matters:** General BERT (`bert-base-uncased`) was pre-trained on Wikipedia and books. Medical text has completely different vocabulary patterns:
- "The patient presented with acute myocardial infarction" → general BERT struggles with this
- "MI patients treated with ACE inhibitors showed reduced LV dysfunction" → abbreviations, clinical terminology

BiomedBERT pre-trained on PubMed already understands these patterns. Using it instead of general BERT gives meaningfully better results on medical tasks without any extra work.

---

## BERT Architecture

**BERT (Bidirectional Encoder Representations from Transformers)** is a transformer encoder that reads text in both directions simultaneously — unlike earlier models that read left-to-right only.

**Key components:**
- **Tokenizer** — splits text into sub-word pieces ("statin" → ["stat", "##in"]) and converts to integer IDs
- **Embeddings** — converts token IDs to 768-dimensional vectors
- **12 Transformer layers** — each layer refines the representation using self-attention
- **[CLS] token** — a special token prepended to every input; its final 768-dim output represents the whole sequence and flows into the classification head

**Self-attention** (what makes transformers powerful): every token looks at every other token and decides how much to "attend" to it. The word "it" in "The statin reduced inflammation because it blocked COX-2" can figure out "it" refers to "statin" by attending to the right context.

---

## Tokenization and Text Pairs

Tokenization converts raw text into numbers the model understands.

**Sub-word tokenization:** Words are split into pieces. "uncharacteristically" might become ["un", "##character", "##istically"]. This handles rare and medical words gracefully — instead of having an unknown token, the model builds meaning from familiar sub-parts.

**Text pair format:** When two texts (question + abstract) are passed to BERT, the result is:
```
[CLS] question [SEP] abstract [SEP] [PAD] [PAD] ...
  ↑                    ↑               ↑
special token    separator token    padding token
```

Three output arrays are produced:
- `input_ids` — integer ID for each token
- `attention_mask` — 1 for real tokens, 0 for padding (model ignores padding)
- `token_type_ids` — 0 for first segment (question), 1 for second (abstract)

The model uses `token_type_ids` to distinguish which part is the question and which is the context.

---

## Classification Head

A linear layer added on top of BERT that converts the 768-dimensional `[CLS]` representation into class scores.

```
[CLS] final embedding (768-dim) → Linear(768, 3) → logits (3-dim)
```

This head is the only part of the model that starts with random weights. Everything else (BiomedBERT's 12 layers) is loaded from pre-trained weights. The head learns during fine-tuning from gradient updates.

**Why `[CLS]`?** BERT was designed so the `[CLS]` token attends to all other tokens through self-attention across all 12 layers. By the final layer, its representation has "seen" and aggregated information from the entire input — making it ideal for classification.

---

## Logits, Softmax, and Probabilities

**Logits** are the raw unnormalized outputs from the classification head. Example: `[2.1, -0.5, 0.3]`

These are not probabilities — you can't interpret `2.1` as "21% chance of yes". They're just scores where higher means more likely.

**Softmax** converts logits to probabilities that sum to 1:
```
softmax([2.1, -0.5, 0.3]) → [0.82, 0.06, 0.12]
                              yes   no   maybe
                              82% + 6% + 12% = 100%
```

**ArgMax** picks the class with the highest probability as the prediction:
```
argmax([0.82, 0.06, 0.12]) → 0 → "yes"
```

During training, `CrossEntropyLoss` applies softmax internally and computes how wrong the predicted probabilities are compared to the true label.

---

## Class Imbalance

When the training data has significantly more examples of some classes than others.

**In this project:** PubMedQA `pqa_labeled` has ~55% yes, ~30% no, ~15% maybe. Only 1 in 7 examples is "maybe".

**What happens without handling it:** The model learns that predicting "yes" is rewarded more often and stops predicting "maybe" entirely. You end up with a biased model that achieves decent accuracy (55% by always saying yes) but is useless for the minority classes.

**The fix — Weighted Cross-Entropy Loss:** Each class gets a weight inversely proportional to its frequency. "Maybe" gets ~2.22x weight vs "yes" at 0.61x. Every time the model misclassifies a "maybe" example, the loss (and therefore the gradient update) is 3.6x larger. The model is forced to take minority classes seriously.

---

## Macro vs Weighted F1

**F1-score** is the harmonic mean of precision and recall. It balances both — a model that's precise but misses everything (high precision, zero recall) gets a low F1.

**Weighted F1** averages class F1s weighted by support (class frequency). Majority classes dominate.
- A model that always predicts "yes" gets decent weighted F1 because yes is 55% of examples.

**Macro F1** averages class F1s equally regardless of frequency. Every class has equal say.
- That same model gets terrible macro F1 because no and maybe F1s are both 0.

For imbalanced problems, **macro F1 is the honest metric**. It's what we use as `metric_for_best_model` and what we track in the classification report.

---

## AdamW Optimizer

The optimizer used by Trainer. An extension of Adam with **weight decay decoupled** from the gradient updates.

- **Adam** — adapts the learning rate per parameter based on gradient history. Parameters that receive rare gradients get larger updates.
- **Weight decay** — L2 regularization that shrinks weights toward zero each step. Prevents overfitting by penalizing large weights.
- **"W" = decoupled weight decay** — in standard Adam, weight decay interacts with the adaptive learning rates in a buggy way. AdamW fixes this by applying weight decay directly to the weights, separately from the gradient update.

In practice: `weight_decay=0.01` means weights shrink by 1% each step before the gradient update.

---

## Learning Rate Warmup

Starting with a very small learning rate and gradually increasing it to the target over the first N steps.

**Why?** At the start of training, the classification head has random weights. A full-size learning rate update on random weights can cause very large, destructive gradient updates that damage the carefully pre-trained BiomedBERT weights. Warmup over 34 steps lets the head learn gradually without destabilizing the base model.

```
Step:      0    10    20    34    50    ...
LR:       0.0   0.6e-5  1.2e-5  2e-5  2e-5  ...
           ↑ warmup phase ↑      ↑ steady ↑
```

---

## HuggingFace Hub

A model hosting platform — think "GitHub for ML models."

**What gets uploaded when you push:**
- `model.safetensors` — the fine-tuned weights (~440MB for BiomedBERT)
- `config.json` — model architecture + `id2label`/`label2id` mappings
- `tokenizer_config.json`, `vocab.txt` — tokenizer files
- A model card (auto-generated README)

**Why this matters:** After pushing, anyone can use the model with a single line:
```python
from transformers import pipeline
classifier = pipeline("text-classification", model="nikhilteja30/pubmedqa-bert")
```
No local weights needed, no label mapping needed — it's all in the Hub repo.

---

## `@st.cache_resource`

A Streamlit decorator that caches the return value of a function across reruns.

**Why it's needed:** Streamlit reruns the entire Python script on every user interaction. Without caching, the 440MB model would be re-downloaded and re-loaded every time the user clicks a button or types in a text box.

**`cache_resource` vs `cache_data`:**
- `cache_data` — for data (DataFrames, lists, dicts). Pickles the return value for storage.
- `cache_resource` — for resources (models, DB connections). Stores the object reference directly.

ML models cannot be pickled reliably (they contain GPU tensors, file handles, etc.), so `cache_resource` is always the right choice for HuggingFace models in Streamlit apps.

---

## `torch.no_grad()`

A context manager that disables PyTorch's automatic differentiation engine during inference.

During training, every tensor operation is recorded in a computational graph so gradients can be computed backward through it (backpropagation). This recording has memory and compute cost.

During inference, you never need gradients — you just want the output. `torch.no_grad()` skips the recording entirely:
- Significantly less memory usage
- Faster forward pass
- No risk of accidentally accumulating gradients

Always use `torch.no_grad()` during inference. Forgetting it doesn't break correctness but wastes resources.
