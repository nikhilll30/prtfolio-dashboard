# PubMedQA Fine-Tuned BiomedBERT

Fine-tuning `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract` on the **PubMedQA** dataset for biomedical question answering.

Given a biomedical research question and an abstract, the model predicts one of three answers: **yes**, **no**, or **maybe**.

---

## Model on HuggingFace Hub

[nikhilteja30/pubmedqa-bert](https://huggingface.co/nikhilteja30/pubmedqa-bert)

---

## Results

| Metric     | Value  |
|------------|--------|
| Accuracy   | TBD    |
| Macro F1   | TBD    |

> Fill in after running `train.py`. Expected: ~70-78% accuracy, ~0.65-0.73 macro F1.
> Note: the "maybe" class (~15% of data) drags down macro F1 — this is expected.

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/nikhilll30/pubmedqa-finetune
cd pubmedqa-finetune
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up your HuggingFace token

```bash
cp .env.example .env
# Edit .env and add your HF token (needs write access)
```

### 3. Fine-tune the model

```bash
python train.py
```

> Training time: ~25-90 min on CPU | ~8 min on Colab T4 GPU (recommended)

### 4. Run the Streamlit app

```bash
streamlit run app.py
```

---

## Dataset

- **Name:** PubMedQA (`pqa_labeled`)
- **Source:** [qiaojin/PubMedQA](https://huggingface.co/datasets/qiaojin/PubMedQA)
- **Size:** 1,000 expert-labeled examples
- **Split:** 900 train / 100 validation (seed=42)
- **Label distribution:** ~55% yes, ~30% no, ~15% maybe
- **Task:** Given question + abstract → predict yes / no / maybe

---

## Model Architecture

- **Base model:** `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract`
  - BERT pre-trained on 21M PubMed abstracts (domain adaptation)
  - 110M parameters
- **Fine-tuning:** Added a 3-class linear classification head
- **Input format:** `[CLS] question [SEP] abstract_context [SEP]`
- **Label mapping:** yes=0, no=1, maybe=2

## Training Configuration

| Hyperparameter         | Value   |
|------------------------|---------|
| Epochs                 | 3       |
| Batch size             | 8       |
| Learning rate          | 2e-5    |
| Warmup ratio           | 0.1     |
| Weight decay           | 0.01    |
| Max sequence length    | 512     |
| Best model metric      | Macro F1|

---

## Limitations

- Trained on only 900 examples — may not generalize to all biomedical domains
- "Maybe" class is underrepresented; performance on it will be lower
- Trained for 3 epochs on CPU — GPU training (Colab) recommended for faster iteration
