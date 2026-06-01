import os
import logging
from pathlib import Path
from backend import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recruiter_agent")

class RecruiterAgent:
    def __init__(self):
        self.context = ""
        self.system_prompt = ""
        self.provider = None
        self.client = None
        
        # Load all documents to construct context
        self._load_context()
        # Initialize LLM provider
        self._init_llm_provider()

    def _load_context(self):
        """Loads and compiles candidate profile and sibling project docs into context."""
        logger.info("Initializing Recruiter Agent context...")
        context_parts = []
        
        # 1. Load candidate profile
        if config.PROFILE_PATH.exists():
            with open(config.PROFILE_PATH, "r", encoding="utf-8") as f:
                context_parts.append(f"# CANDIDATE PROFILE\n\n{f.read()}")
            logger.info("Loaded candidate profile successfully.")
        else:
            logger.warning(f"Candidate profile not found at {config.PROFILE_PATH}")

        # 2. Load sibling project READMEs and docs
        for name, info in config.PROJECTS.items():
            # Load project README if it exists
            readme_path = info["readme"]
            if readme_path and readme_path.exists():
                with open(readme_path, "r", encoding="utf-8") as f:
                    context_parts.append(f"## PROJECT: {name} (README)\n\n{f.read()}")
                logger.info(f"Loaded README for project {name}.")

            # Load project docs (all markdown files inside docs/)
            docs_dir = info["docs"]
            if docs_dir and docs_dir.exists():
                for md_file in sorted(docs_dir.glob("*.md")):
                    if md_file.name == "README.md":
                        continue
                    try:
                        with open(md_file, "r", encoding="utf-8") as f:
                            context_parts.append(f"### PROJECT: {name} (DOCS: {md_file.name})\n\n{f.read()}")
                        logger.info(f"Loaded doc file {md_file.name} for project {name}.")
                    except Exception as e:
                        logger.error(f"Error loading doc {md_file.name}: {e}")

        # Join everything
        self.context = "\n\n---\n\n".join(context_parts)
        
        # Construct strict system prompt
        self.system_prompt = (
            "You are a helpful, professional, and intelligent AI Recruiter Agent representing the software engineer candidate, Nikhil Teja.\n"
            "Your goal is to answer questions from recruiters or hiring managers regarding Nikhil's skills, qualifications, work history, and the engineering details of his portfolio projects.\n\n"
            "Here is the strict source of truth for the candidate's profile and projects:\n"
            "========================================================================\n"
            f"{self.context}\n"
            "========================================================================\n\n"
            "STRICT RULES FOR YOUR RESPONSES:\n"
            "1. Answer questions accurately based ONLY on the profile and project documentation provided above.\n"
            "2. If a recruiter asks a question about something that is not in the documentation, politely state that it's not covered in the current portfolio records but you can share his email (bvnikhilteja2001@gmail.com) for further questions.\n"
            "3. DO NOT make up, assume, or hallucinate any facts about Nikhil's history, projects, or metrics.\n"
            "4. Ground your technical explanations in the details provided. For example, if asked about RAG, mention the hybrid ChromaDB + BM25 Reciprocal Rank Fusion implementation from `rag-doc-qa`. If asked about fine-tuning, talk about the BiomedBERT model and weighted loss on the PubMedQA dataset.\n"
            "5. Cite project names (like `multi-agent-researcher`, `rag-doc-qa`, etc.) when explaining where he applied specific skills.\n"
            "6. Maintain a highly professional, encouraging, and clear tone. Be humble but highlight key achievements (e.g. automating error-correction to achieve 95% SQL success, or improving RAG recall by 23%)."
        )
        logger.info(f"Context compiled successfully. Total character length: {len(self.system_prompt)}")

    def _init_llm_provider(self):
        """Initializes the best available LLM provider based on API keys."""
        # Standardize: Anthropic takes priority, then Gemini, then mock fallback
        if config.ANTHROPIC_API_KEY:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
                self.provider = "anthropic"
                logger.info("Initialized Recruiter Agent with Anthropic Claude.")
            except ImportError:
                logger.error("Anthropic library not installed despite ANTHROPIC_API_KEY set.")
        
        if not self.provider and config.GEMINI_API_KEY:
            try:
                from google import genai
                self.client = genai.Client(api_key=config.GEMINI_API_KEY)
                self.provider = "gemini"
                logger.info("Initialized Recruiter Agent with Google Gemini.")
            except ImportError:
                logger.error("google-genai library not installed despite GEMINI_API_KEY set.")
                
        if not self.provider:
            self.provider = "mock"
            logger.warning("No API keys found or libraries missing. Running Recruiter Agent in Mock Mode.")

    async def get_response(self, messages: list) -> str:
        """Asynchronously queries the LLM using the chat history and the compiled system prompt."""
        if not self.client or self.provider == "mock":
            return self._mock_response(messages[-1]["content"])

        # Format history
        prompt_history = []
        for msg in messages:
            prompt_history.append({"role": msg["role"], "content": msg["content"]})

        try:
            if self.provider == "anthropic":
                # Call Anthropic API
                response = self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    temperature=0.3,
                    system=self.system_prompt,
                    messages=prompt_history
                )
                return response.content[0].text

            elif self.provider == "gemini":
                # Call Gemini API
                # Combine system instructions and history
                # In google-genai, system instructions are configured in GenerateContentConfig
                from google.genai import types
                
                # Format messages for Gemini SDK
                # google-genai expectations: contents can be a list of Content objects or equivalent
                gemini_contents = []
                for msg in messages:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg["content"])]
                        )
                    )

                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=gemini_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=self.system_prompt,
                        temperature=0.3,
                        max_output_tokens=1000,
                    )
                )
                return response.text
                
        except Exception as e:
            logger.error(f"Error calling LLM provider {self.provider}: {e}")
            return f"Excuse me, I encountered a temporary connection issue with my {self.provider} model backend ({e}). However, I can confirm that Nikhil is highly proficient in full-stack AI engineering, including FastAPI, React, and LangGraph. Please feel free to reach out to him directly at bvnikhilteja2001@gmail.com!"

    def _mock_response(self, query: str) -> str:
        """Returns a high-fidelity local fallback response when no API keys are provided."""
        query_lower = query.lower()
        
        # 1. Check for multi-agent
        if "agent" in query_lower or "langgraph" in query_lower or "researcher" in query_lower:
            return (
                "Nikhil has extensive experience with multi-agent systems! In his **Multi-Agent Researcher** project, "
                "he used LangGraph to build a state-machine orchestrator. It decomposes a research question into "
                "sub-tasks and executes them in parallel (using fan-out/fan-in) via Web Search and RAG sub-agents. "
                "He also implemented Google's Agent-to-Agent (A2A) JSON-RPC protocol over HTTP for structured "
                "communication between agents, as well as custom Model Context Protocol (MCP) servers."
            )
        
        # 2. Check for RAG
        elif "rag" in query_lower or "retrieval" in query_lower or "chromadb" in query_lower or "search" in query_lower:
            return (
                "In his **RAG Document Q&A** project, Nikhil engineered a production-grade RAG pipeline. "
                "To maximize retrieval recall, he implemented a custom Hybrid Search retriever combining semantic "
                "vector embeddings (using ChromaDB) and keyword lexical search (using BM25) via a Reciprocal Rank "
                "Fusion (RRF) algorithm. This improved search coverage by 23%. He also wrote strict system prompts "
                "that enforced page-level citations to eliminate hallucination, and containerized the setup using Docker Compose."
            )

        # 3. Check for SQL
        elif "sql" in query_lower or "chinook" in query_lower or "sqlite" in query_lower:
            return (
                "Nikhil developed the **SQL Insight Agent**, which is a natural-language-to-SQL querying interface. "
                "The core innovation is a self-correcting agent loop. When database execution errors or SQL syntax "
                "failures are thrown, the agent automatically intercepts them, feeds them back to the LLM with the schema "
                "definition, and retries the query (up to 3 times). This achieved a 95% execution success rate. He also "
                "implemented strict security regex checks to prevent prompt injection and destructive commands."
            )

        # 4. Check for fine-tuning
        elif "fine" in query_lower or "tune" in query_lower or "bert" in query_lower or "biomed" in query_lower:
            return (
                "For model adaptation, Nikhil worked on the **PubMedQA Fine-Tuning** project. He fine-tuned the domain-specific "
                "BiomedBERT model on 1,000 expert-labeled biomedical questions. To address severe class imbalance (where the "
                "'maybe' class was only 15% of the data), he formulated a weighted cross-entropy loss function. The final "
                "model achieved 70-78% accuracy and is deployed directly to the HuggingFace Hub (`nikhilteja30/pubmedqa-bert`)."
            )

        # 5. Check for skills
        elif "skills" in query_lower or "languages" in query_lower or "technologies" in query_lower:
            return (
                "Nikhil's core technical stack includes:\n"
                "- **AI Orchestration:** LangGraph, LangChain, A2A Protocol, MCP Server Development.\n"
                "- **NLP & ML:** Supervised Fine-Tuning, HuggingFace Transformers, BiomedBERT, PyTorch, evaluation metrics (F1, Accuracy).\n"
                "- **RAG & Search:** ChromaDB, BM25, Reciprocal Rank Fusion, metadata filtering.\n"
                "- **Backend/DevOps:** FastAPI, Asynchronous Python, SQLite, Docker, Docker Compose, Render."
            )

        # General response
        return (
            "Hi there! I am Nikhil's AI Recruiter Agent. I am currently running in a local mock-response mode "
            "because no `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` was found in the environment setup. "
            "However, I can tell you that Nikhil is an exceptional Associate AI Engineer skilled in building "
            "advanced agentic systems (LangGraph), RAG pipelines (ChromaDB + BM25), model fine-tuning (BiomedBERT), "
            "and FastAPI backends. Feel free to explore his interactive projects here, and you can contact him "
            "directly at bvnikhilteja2001@gmail.com!"
        )
