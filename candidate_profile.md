# Candidate Profile: Nikhil Teja

## Personal Information
* **Name:** Nikhil Teja
* **Title:** Applied AI Engineer
* **Location:** Jersey City, New Jersey (Open to Remote / Relocation)
* **GitHub:** [github.com/nikhilll30](https://github.com/nikhilll30)
* **HuggingFace:** [huggingface.co/nikhilteja30](https://huggingface.co/nikhilteja30)
* **Email:** bvnikhilteja2001@gmail.com
* **Summary:** As an Applied AI Engineer, I build inspectable LLM applications, multi-agent architectures, Retrieval-Augmented Generation (RAG) pipelines, and domain-adapted models. My focus is the engineering around the model: orchestration, retrieval, validation, recovery, evaluation, and APIs that turn a prototype into dependable software.

---

## Technical Skills Matrix

### Core Domains & Competencies

* **Agentic Systems & Multi-Agent Orchestration:** LangGraph state machines, agent memory, parallel fan-out/fan-in tool execution, Agent-to-Agent (A2A) JSON-RPC protocol, human-in-the-loop checkpoints, Model Context Protocol (MCP) custom servers.
* **Retrieval-Augmented Generation (RAG):** Hybrid search pipelines, Reciprocal Rank Fusion (RRF), semantic vector search (ChromaDB, FAISS), keyword search (BM25), metadata filtering, citation-enforcing prompt engineering, context chunking strategies.
* **NLP & Model Fine-Tuning:** Supervised Fine-Tuning (SFT), domain adaptation (transfer learning), BERT/RoBERTa model families (BiomedBERT), HuggingFace Transformers, tokenization, NLP evaluation metrics (Accuracy, Macro F1, class imbalance weighted loss).
* **Backend & API Development:** FastAPI (RESTful routing, Pydantic schemas, dependency injection, lazy service initialization), Asynchronous Python, SSE (Server-Sent Events) streaming, SQLite, SQL databases, JSON-RPC.
* **DevOps, Tooling & Cloud Deployment:** Docker, Docker Compose, Render deployment (API hosting), HuggingFace Hub (model deployment/hosting), Git, Python-dotenv.

---

## Sibling Portfolio Projects

### 1. Multi-Agent Researcher (`multi-agent-researcher/`)
* **Role:** Lead Architect & Developer
* **Stack:** LangGraph, FastAPI, Streamlit, A2A Protocol, Tavily Search API, ChromaDB, MCP Server.
* **Description:** Built a highly distributed agentic research system that decomposes complex research questions into parallelizable sub-tasks.
* **Key Achievements:**
  * Orchestrated sub-agents (Web Search, RAG Search, and Synthesis) using a custom LangGraph state machine supporting parallel fan-out and fan-in.
  * Implemented Google's A2A (Agent-to-Agent) JSON-RPC protocol over HTTP for structured inter-agent message passing.
  * Designed a custom Model Context Protocol (MCP) server wrapping an internal RAG database, allowing the main planner agent to seamlessly query corporate documents.

### 2. RAG Document Q&A (`rag-doc-qa/`)
* **Role:** Core Developer
* **Stack:** ChromaDB, BM25, FastAPI, Streamlit, Claude 3.5 Sonnet, Docker, Docker Compose.
* **Description:** Engineered a production-grade enterprise RAG pipeline with high-precision citation tracking.
* **Key Achievements:**
  * Combined semantic vector search (ChromaDB) with keyword search (BM25) through Reciprocal Rank Fusion (RRF), preserving the strengths of both retrieval signals without comparing incompatible raw scores.
  * Carried filename and page metadata into the answer context and used explicit citation rules so generated answers can point back to retrieved evidence.
  * Fully containerized both the FastAPI server and Streamlit frontend using a multi-stage Docker Compose setup.

### 3. SQL Insight Agent (`sql-insight-agent/`)
* **Role:** Sole Developer
* **Stack:** LangChain, SQLite, Claude 3.5, FastAPI, Streamlit, Render.
* **Description:** Created an agentic SQL query assistant enabling natural-language querying of relational databases (Chinook SQLite database).
* **Key Achievements:**
  * Built a self-correcting loop that intercepts syntax, schema, or execution errors and feeds structured feedback back to the agent for another attempt.
  * Implemented schema-reflection safety blocks to prevent prompt injection and destructive queries (like `DROP TABLE` or `DELETE`).
  * Deployed the API on Render with startup-time agent initialization and a separate Streamlit client.

### 4. PubMedQA Fine-Tuning (`pubmedqa-finetune/`)
* **Role:** NLP Engineer
* **Stack:** PyTorch, HuggingFace Transformers, BiomedBERT, Streamlit, Colab T4 GPU.
* **Description:** Fine-tuned `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract` on the expert-labeled PubMedQA dataset for biomedical question answering.
* **Key Achievements:**
  * Domain-adapted BiomedBERT (pre-trained on 21M PubMed abstracts) with a custom 3-class classification linear head (yes/no/maybe answers).
  * Addressed severe label imbalance (only 15% 'maybe' class) with weighted cross-entropy loss, improving 'maybe' F1 from 0.00 to 0.37 and macro F1 from 0.36 to 0.51.
  * Deployed the fine-tuned model to HuggingFace Hub (`nikhilteja30/pubmedqa-bert`) and created an interactive Streamlit inference client.

---

## Experience & Education

### Independent AI Engineer
* **Core Responsibilities:**
  * Researched, developed, and deployed advanced generative AI systems across RAG, Fine-Tuning, SQL Agents, and Multi-Agent Orchestration.
  * Wrote clean, production-grade Python code adhering to strict engineering conventions (FastAPI routers, lazy service setups, multi-stage Dockerfiles).
  * Authored highly detailed technical architectural documentation, which can be compiled into merged PDF guides.

### MS in Computer Science
* **University:** Rivier University
* **Highlights:** Advanced study and research in large language models, NLP architectures, agentic orchestration, and distributed database systems.
