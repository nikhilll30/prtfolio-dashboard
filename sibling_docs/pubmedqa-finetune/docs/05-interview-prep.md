# Interview Prep

Questions you should be able to answer confidently about this project.

---

## "Walk me through what this project does."

**Strong answer:**
> "I fine-tuned Microsoft's BiomedBERT — a BERT model pre-trained on 21 million PubMed abstracts — on the PubMedQA dataset. Given a biomedical research question and an abstract, the model classifies the answer as yes, no, or maybe. The key challenge was class imbalance: 'maybe' made up only 15% of examples, so without intervention the model completely ignored it. I solved this with weighted cross-entropy loss, which boosted the 'maybe' F1 from 0.00 to 0.37 and overall macro F1 from 0.36 to 0.51. The fine-tuned model is deployed on HuggingFace Hub and served through a Streamlit app."

---

## "Why did you choose BiomedBERT over BERT?"

**Strong answer:**
> "Domain adaptation. General BERT was pre-trained on Wikipedia and books — it's never seen 'myocardial infarction' or 'ACE inhibitor' in meaningful context. BiomedBERT was specifically pre-trained on 21 million PubMed abstracts, so it already understands biomedical vocabulary, abbreviations, and how medical sentences are structured. Using a domain-specific base model gives meaningfully better results on medical NLP tasks without any extra work."

---

## "What is fine-tuning? How is it different from training from scratch?"

**Strong answer:**
> "Training from scratch means randomly initializing all weights and learning everything from your data. Fine-tuning starts with a pre-trained model and updates its weights on a smaller, task-specific dataset. In this project, BiomedBERT's 110 million parameters were already tuned to understand biomedical language. Fine-tuning adds a new classification head — a simple linear layer with 3 outputs — and trains the whole thing on 900 PubMedQA examples. The pre-trained weights give us a huge head start; we're nudging them for a specific task rather than learning language from scratch. This is why fine-tuning 900 examples takes 8 minutes on GPU while pre-training BiomedBERT took weeks on a cluster."

---

## "How does the tokenizer work?"

**Strong answer:**
> "The tokenizer converts text into integers the model can process. It uses sub-word tokenization — words are split into pieces so rare or medical terms can be represented from familiar sub-parts rather than marked as unknown. For text pair classification, I pass the question and abstract as two separate arguments. The tokenizer formats them as: [CLS] question [SEP] abstract [SEP] [PAD]... with three output arrays: input_ids for the token integers, attention_mask to tell the model which tokens are real vs padding, and token_type_ids to distinguish which tokens are the question versus the abstract. Crucially, the tokenization at inference must exactly match what was used during training — different padding or max_length would break the model."

---

## "What is class imbalance and how did you handle it?"

**Strong answer:**
> "Class imbalance is when some classes have far more training examples than others. In PubMedQA, 'yes' is 55% of examples, 'no' is 30%, and 'maybe' is only 15%. Without handling this, the model learns that predicting 'yes' is rewarded most often and stops predicting 'maybe' entirely — my first run confirmed this: 'maybe' F1 was 0.00. I fixed it with weighted cross-entropy loss. Using sklearn's compute_class_weight with 'balanced' strategy, I computed inverse-frequency weights: 'maybe' got about 2.2x weight vs 'yes' at 0.6x. I implemented this by subclassing HuggingFace's Trainer and overriding compute_loss to use nn.CrossEntropyLoss with these weights. The result was 'maybe' F1 jumping from 0.00 to 0.37 and macro F1 improving from 0.36 to 0.51."

---

## "Why macro F1 and not accuracy?"

**Strong answer:**
> "Accuracy is misleading with imbalanced classes. A model that always predicts 'yes' achieves 55% accuracy — better than random — while being completely useless for 'no' and 'maybe'. Macro F1 computes F1 separately for each class and averages equally, regardless of frequency. It cares just as much about performance on the 15% 'maybe' class as the 55% 'yes' class. For any real clinical decision support system, you absolutely need the model to handle all outcome categories — so macro F1 is the honest metric. I also used it as metric_for_best_model in TrainingArguments so the Trainer saves the checkpoint that maximizes macro F1, not just accuracy."

---

## "What does the Trainer class do?"

**Strong answer:**
> "Trainer is HuggingFace's high-level training loop. It handles everything: batching and shuffling data, running the forward pass, computing the loss, running backpropagation, stepping the AdamW optimizer, evaluating on the validation set after each epoch, saving checkpoints, logging metrics, and pushing to HuggingFace Hub. Without Trainer, I'd write all of this manually. In this project, I subclassed Trainer to override just one method — compute_loss — to implement weighted cross-entropy. All the rest of the training infrastructure stayed unchanged."

---

## "Why did you use warmup steps?"

**Strong answer:**
> "At the start of training, the classification head has completely random weights. If we immediately apply the full learning rate, we get very large gradient updates that can destroy the carefully pre-trained BiomedBERT weights. Warmup linearly increases the learning rate from 0 to the target (2e-5) over the first 34 steps. This gives the random classification head time to learn something reasonable before the full learning rate kicks in, protecting the valuable pre-trained representations."

---

## "Your accuracy is only 57% — isn't that bad?"

**Strong answer:**
> "It's modest, but honest and expected. The dataset has only 1000 expert-labeled examples, of which we use 900 for training. The 'maybe' class is genuinely ambiguous — even human annotators disagree on it, which is why the dataset authors marked those cases 'maybe' rather than forcing a yes/no answer. 57% is meaningfully above random (33%) and above the majority-class baseline (45% by always predicting 'yes'). The more important metric is macro F1 at 0.51, which shows the model is learning to handle all three classes. For a portfolio project, I think demonstrating honest evaluation and the ability to diagnose and fix real ML problems (class imbalance) is more valuable than chasing a high number on a small dataset."

---

## "How does the Streamlit app load the model efficiently?"

**Strong answer:**
> "I use @st.cache_resource. Streamlit reruns the entire Python script on every user interaction — every button click, every keystroke. Without caching, the 440MB model would be downloaded and loaded fresh on every click, which is obviously unusable. @st.cache_resource stores the return value of load_model() — the tokenizer and model objects — in memory after the first call. All subsequent reruns skip the function body entirely and return the cached objects instantly. I specifically use cache_resource rather than cache_data because PyTorch models can't be pickled reliably — cache_resource stores the object reference directly."

---

## "What would you do to improve the results?"

**Strong answer (pick 2-3):**
> 1. **More data** — the `pqa_unlabeled` split has 61,000 examples. I could use semi-supervised learning: fine-tune on labeled data, generate pseudo-labels for unlabeled data, then train on both.
> 2. **Larger model** — BiomedBERT `large` (24 layers vs 12) would likely give better results at the cost of more compute.
> 3. **Hyperparameter tuning** — try different learning rates (1e-5, 3e-5, 5e-5) and warmup ratios using Optuna or HuggingFace's built-in HPO.
> 4. **Longer training with early stopping** — 5-6 epochs with EarlyStoppingCallback rather than a fixed 3 epochs.
> 5. **Data augmentation** — back-translation or synonym replacement to artificially increase the 'maybe' class.

---

## Quick Facts to Know

| Fact | Value |
|---|---|
| Base model | microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract |
| Model parameters | ~110 million |
| Pre-training data | 21 million PubMed abstracts |
| Fine-tuning dataset | PubMedQA pqa_labeled, 1000 examples |
| Train/val split | 900 / 100 |
| Task | 3-class text classification (yes/no/maybe) |
| Best metric | Macro F1 = 0.51 |
| Training time | ~8 min on T4 GPU, ~60 min on CPU |
| Max sequence length | 512 tokens |
| Learning rate | 2e-5 |
| Batch size | 16 (GPU) |
| Epochs | 3 |
| Key technique | Weighted cross-entropy loss for class imbalance |
