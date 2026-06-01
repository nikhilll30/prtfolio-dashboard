export const projectsData = [
  {
    id: "multi-agent-researcher",
    title: "Multi-Agent Researcher",
    subtitle: "LangGraph-Powered Distributed Search & Synthesis Network",
    metrics: [
      { label: "Sub-Agents", value: "3 Active" },
      { label: "Orchestrator", value: "LangGraph" },
      { label: "Protocols", value: "A2A & MCP" }
    ],
    techStack: ["LangGraph", "FastAPI", "Streamlit", "A2A (JSON-RPC)", "ChromaDB", "Tavily API"],
    description: "A distributed agentic research system designed to tackle complex user queries by breaking them down into parallel sub-tasks. Under the hood, a central Planner orchestrates specialized web search, vector database (RAG), and synthesis sub-agents.",
    achievements: [
      "Orchestrated parallel fan-out/fan-in sub-agent execution using a LangGraph state machine, enabling multi-threaded tasks.",
      "Implemented Google's Agent-to-Agent (A2A) JSON-RPC protocol over FastAPI to enforce reliable, schema-validated message passing.",
      "Developed a custom Model Context Protocol (MCP) server that exposes a vector database, enabling planner models to dynamically query corporate markdown repositories."
    ],
    concepts: ["State Machine Orchestration", "Parallel Tool Calling", "JSON-RPC Protocols", "Custom MCP Servers", "Agentic Planning & Execution"],
    skills: ["Multi-Agent Orchestration", "A2A Protocol & MCP", "Vector Database (ChromaDB)", "FastAPI REST APIs", "Prompt Engineering & Structured Outputs"],
    demoUrl: "http://localhost:8501", // Represents standard Streamlit port
    githubUrl: "https://github.com/nikhilll30/portfolio_projects/tree/main/multi-agent-researcher"
  },
  {
    id: "rag-doc-qa",
    title: "RAG Document Q&A",
    subtitle: "Production-Grade Hybrid Search & Citation-Enforced QA Engine",
    metrics: [
      { label: "Recall Lift", value: "+23%" },
      { label: "Embeddings", value: "Text-Embedding-3" },
      { label: "Containerized", value: "Docker-Compose" }
    ],
    techStack: ["ChromaDB", "BM25 Search", "Claude 3.5 Sonnet", "FastAPI", "Streamlit", "Docker", "Pytest"],
    description: "A highly resilient, enterprise-grade Retrieval-Augmented Generation (RAG) system built to answer questions over large document corpuses with extreme accuracy, zero hallucinations, and exact page-level citations.",
    achievements: [
      "Created a hybrid search system combining semantic vector embeddings (ChromaDB) and lexical keyword matching (BM25) fused via Reciprocal Rank Fusion (RRF) for 23% better recall.",
      "Formulated strict system-prompt citation constraints that compel the LLM to output verbatim matching sources and page numbers, virtually eliminating hallucinations.",
      "Built a multi-container local stack utilizing Docker and Docker Compose with automated testing integration via Pytest."
    ],
    concepts: ["Reciprocal Rank Fusion", "Hybrid Lexical/Semantic Retrieval", "Citation Enforcement Protocols", "FastAPI Dependency Injectors", "Multi-stage Docker Builds"],
    skills: ["Hybrid Search (RRF)", "Vector Database (ChromaDB)", "Docker Containerization", "FastAPI REST APIs", "Prompt Engineering & Structured Outputs"],
    demoUrl: "http://localhost:8501",
    githubUrl: "https://github.com/nikhilll30/portfolio_projects/tree/main/rag-doc-qa"
  },
  {
    id: "sql-insight-agent",
    title: "SQL Insight Agent",
    subtitle: "Self-Correcting Natural Language to Relational SQL Interface",
    metrics: [
      { label: "SQL Success", value: "95% Rate" },
      { label: "Database", value: "SQLite (Chinook)" },
      { label: "Hosted On", value: "Render (API)" }
    ],
    techStack: ["LangChain", "SQLite", "Claude 3.5", "FastAPI", "Streamlit", "Render", "SQLAlchemy"],
    description: "An agentic SQL analyst assistant that translates natural language queries into accurate, executable SQL commands, automatically correcting itself when schema-reflection or syntax errors arise.",
    achievements: [
      "Designed a self-correcting execution loop that catches SQL syntax or execution errors, feeds the stack trace back to the LLM alongside table schema, and retries automatically (up to 3 attempts), resulting in a 95% execution success rate.",
      "Implemented security guardrails (regex matching and schema-reflection blocks) to screen out and reject destructive commands (e.g., DROP, DELETE).",
      "Deployed a FastAPI server on Render utilizing lazy database initialization, keeping the server responsive with sub-second initialization times."
    ],
    concepts: ["Self-Correction loops", "Schema Reflection", "SQL Injection Guardrails", "Lazy Resource Initialization", "Relational Mapping"],
    skills: ["Self-Correcting LLM Loops", "FastAPI REST APIs", "Render & Cloud Deploy", "Docker Containerization", "Prompt Engineering & Structured Outputs"],
    demoUrl: "http://localhost:8501",
    githubUrl: "https://github.com/nikhilll30/portfolio_projects/tree/main/sql-insight-agent"
  },
  {
    id: "pubmedqa-finetune",
    title: "PubMedQA BERT Fine-Tuning",
    subtitle: "Domain-Specific BiomedBERT Model Adaptations for Healthcare Q&A",
    metrics: [
      { label: "Accuracy", value: "75.4%" },
      { label: "Parameters", value: "110 Million" },
      { label: "Imbalance Loss", value: "Weighted CE" }
    ],
    techStack: ["BiomedBERT", "HuggingFace Hub", "PyTorch", "Transformers", "Streamlit", "Google Colab"],
    description: "A deep learning NLP project focused on fine-tuning a domain-specific model (BiomedBERT) on expert-labeled PubMed biomedical research abstracts to answer complex clinical questions.",
    achievements: [
      "Fine-tuned Microsoft's abstract-adapted BiomedBERT, layering a 3-class linear classification head for yes/no/maybe predictions.",
      "Engineered a custom PyTorch weighted cross-entropy loss function to mitigate extreme class imbalance (the 'maybe' class representing only 15% of samples), boosting Macro F1 scores.",
      "Deployed the completed model binary directly to the HuggingFace Hub (nikhilteja30/pubmedqa-bert) and developed a Streamlit client for live healthcare diagnostics."
    ],
    concepts: ["Supervised Fine-Tuning (SFT)", "Domain Adaptation", "Class Imbalance Loss weighting", "Inference Pipeline optimization", "NLP Model Benchmarking"],
    skills: ["Fine-Tuning", "Transfer Learning", "Render & Cloud Deploy"],
    demoUrl: "http://localhost:8501",
    githubUrl: "https://github.com/nikhilll30/portfolio_projects/tree/main/pubmedqa-finetune"
  }
];

export const skillsData = {
  "AI & LLM Orchestration": [
    "Multi-Agent Orchestration",
    "A2A Protocol & MCP",
    "Self-Correcting LLM Loops",
    "Prompt Engineering & Structured Outputs"
  ],
  "Information Retrieval & ML": [
    "Hybrid Search (RRF)",
    "Vector Database (ChromaDB)",
    "Fine-Tuning",
    "Transfer Learning"
  ],
  "APIs & Systems Engineering": [
    "FastAPI REST APIs",
    "Docker Containerization",
    "Render & Cloud Deploy"
  ]
};
