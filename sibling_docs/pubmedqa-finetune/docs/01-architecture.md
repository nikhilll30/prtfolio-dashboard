# Architecture

## The Big Picture

This project **fine-tunes** a pre-trained biomedical language model on a question answering task. Instead of building a model from scratch (which requires billions of examples), we take a model that already understands biomedical language and teach it one specific skill: reading a research abstract and deciding whether it answers a question with yes, no, or maybe.

There are two separate phases:

```
┌─────────────────────────────────────────────────────────┐
│                   PHASE 1: TRAINING                     │
│                   (runs once on GPU)                    │
│                                                         │
│   PubMedQA Dataset (1000 examples)                      │
│          │                                              │
│          ▼                                              │
│   BiomedBERT (pre-trained on 21M PubMed abstracts)      │
│   + Classification Head (randomly initialized)          │
│          │                                              │
│          ▼                                              │
│   Fine-tuning (3 epochs, weighted loss)                 │
│          │                                              │
│          ▼                                              │
│   Fine-tuned model → pushed to HuggingFace Hub         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 PHASE 2: INFERENCE                      │
│              (runs on demand via Streamlit)             │
│                                                         │
│   User inputs: question + abstract                      │
│          │                                              │
│          ▼                                              │
│   Tokenizer: text → input_ids, attention_mask           │
│          │                                              │
│          ▼                                              │
│   Fine-tuned model (loaded from Hub)                    │
│          │                                              │
│          ▼                                              │
│   Logits → Softmax → Probabilities                      │
│          │                                              │
│          ▼                                              │
│   Prediction: YES / NO / MAYBE + confidence bar        │
└─────────────────────────────────────────────────────────┘
```

**Why two phases?** Training is expensive (GPU, time) and only happens once. Inference is cheap and happens on demand. Separating them means you train once, deploy anywhere.

---

## Training Flow (train.py)

```
Step 1: Load environment
        │
        ├── load_dotenv() reads .env file
        ├── HF_TOKEN loaded into os.environ
        │
        ▼
Step 2: Load dataset
        │
        ├── load_dataset("qiaojin/PubMedQA", "pqa_labeled")
        ├── 1000 expert-labeled examples in a single "train" split
        ├── train_test_split(test_size=0.1, seed=42)
        │     → 900 train / 100 validation
        │
        ▼
Step 3: Tokenize
        │
        ├── For each example: join abstract paragraphs into one string
        ├── Pass question + abstract as a text pair to tokenizer
        ├── Produces: input_ids, attention_mask, token_type_ids
        ├── Input format: [CLS] question [SEP] abstract [SEP] [PAD]...
        ├── All sequences padded/truncated to exactly 512 tokens
        ├── String labels ("yes"/"no"/"maybe") → integers (0/1/2)
        │
        ▼
Step 4: Load model
        │
        ├── BiomedBERT body: loaded from HuggingFace Hub (pre-trained weights)
        ├── Classification head: randomly initialized (3 output neurons)
        ├── WARNING about uninitialized weights is expected and correct
        │
        ▼
Step 5: Compute class weights
        │
        ├── Count label distribution in training set (~55% yes, ~30% no, ~15% maybe)
        ├── compute_class_weight("balanced") → inverse frequency weights
        │     yes: ~0.61, no: ~1.11, maybe: ~2.22
        ├── Higher weight = model penalized more for mistakes on that class
        │
        ▼
Step 6: Train (3 epochs)
        │
        ├── For each batch of 16 examples:
        │     1. Forward pass → logits
        │     2. WeightedCrossEntropyLoss(logits, labels, weights)
        │     3. Backward pass → gradients
        │     4. AdamW optimizer updates all 110M parameters
        ├── After each epoch: evaluate on validation set → log accuracy + macro F1
        ├── Save checkpoint if best macro F1 seen so far
        │
        ▼
Step 7: Evaluate
        │
        ├── Run inference on all 100 validation examples
        ├── Print per-class classification report (precision, recall, F1)
        │
        ▼
Step 8: Push to HuggingFace Hub
        │
        ├── Uploads: model weights, tokenizer, config.json
        ├── config.json contains id2label / label2id mappings
        ├── Model available at: huggingface.co/nikhilteja30/pubmedqa-bert
```

---

## Inference Flow (app.py)

```
App startup (once per session)
        │
        ├── @st.cache_resource: load tokenizer + model from Hub
        ├── First run: downloads ~440MB to ~/.cache/huggingface/
        ├── Subsequent runs: loads from local cache instantly
        ├── model.eval(): disables dropout for deterministic predictions
        │
        ▼
User submits question + abstract
        │
        ▼
predict() function
        │
        ├── tokenizer(question, abstract, return_tensors="pt", ...)
        │     → {"input_ids": tensor(1,512), "attention_mask": tensor(1,512)}
        │
        ├── torch.no_grad(): disables gradient tracking (inference only)
        │
        ├── model(**inputs) → outputs.logits: tensor(1, 3)
        │     e.g. [2.1, -0.5, 0.3]  (raw unnormalized scores)
        │
        ├── F.softmax(logits, dim=-1) → [0.82, 0.08, 0.10]
        │     (probabilities that sum to 1.0)
        │
        ├── argmax → 0 → "yes"
        │
        ▼
Display
        │
        ├── Colored prediction label (:green[YES])
        ├── Bar chart of confidence scores
        └── Probability table formatted as percentages
```

---

## Why These Design Choices?

| Choice | Why |
|---|---|
| BiomedBERT over general BERT | Pre-trained on PubMed — already understands medical vocabulary and sentence structure |
| pqa_labeled over pqa_unlabeled | 1000 expert labels vs 61k auto-generated ones — quality over quantity for fine-tuning |
| Macro F1 as best-model metric | Class imbalance makes accuracy misleading — macro F1 treats all classes equally |
| Weighted cross-entropy loss | Without it, the model ignores the rare "maybe" class entirely |
| Push to Hub after training | Makes the app portable — anyone can run app.py without retraining |
| `@st.cache_resource` for model | Streamlit reruns the script on every interaction — without caching, the 440MB model would reload on every click |
