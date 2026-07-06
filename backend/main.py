import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List

from backend import config
from backend.agent import RecruiterAgent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_main")

app = FastAPI(
    title="AI Portfolio Hub & Recruiter Agent",
    description="Backend API serving portfolio insights and the AI Recruiter Chatbot.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development (FastAPI on 8000, Vite on 5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Recruiter Agent
try:
    agent = RecruiterAgent()
except Exception as e:
    logger.error(f"Failed to initialize Recruiter Agent: {e}")
    agent = None

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Chat endpoint to communicate with the Recruiter Agent."""
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recruiter Agent is not initialized properly. Check backend logs."
        )
    
    # Format messages for the agent
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Generate and return response
    response_text = await agent.get_response(formatted_messages)
    return {"response": response_text, "provider": agent.provider}

@app.get("/api/info")
async def get_portfolio_info():
    """Returns static portfolio project data, skills matrix mappings, and API status."""
    return {
        "candidate": {
            "name": "Nikhil Teja",
            "title": "AI Engineer",
            "location": "Jersey City, New Jersey",
            "email": "bvnikhilteja2001@gmail.com",
            "github": "https://github.com/nikhilll30",
            "huggingface": "https://huggingface.co/nikhilteja30",
        },
        "provider": agent.provider if agent else "uninitialized",
        "skills_mapping": {
            "Fine-Tuning": ["pubmedqa-finetune"],
            "Transfer Learning": ["pubmedqa-finetune"],
            "Hybrid Search (RRF)": ["rag-doc-qa"],
            "Vector Database (ChromaDB)": ["rag-doc-qa", "multi-agent-researcher"],
            "Multi-Agent Orchestration": ["multi-agent-researcher"],
            "A2A Protocol & MCP": ["multi-agent-researcher"],
            "Self-Correcting LLM Loops": ["sql-insight-agent"],
            "Prompt Engineering & Structured Outputs": ["rag-doc-qa", "multi-agent-researcher", "sql-insight-agent"],
            "FastAPI REST APIs": ["rag-doc-qa", "sql-insight-agent", "multi-agent-researcher"],
            "Docker Containerization": ["rag-doc-qa", "sql-insight-agent"],
            "Render & Cloud Deploy": ["sql-insight-agent", "pubmedqa-finetune"]
        }
    }

@app.get("/api/download-pdf/{project_id}")
async def download_project_pdf(project_id: str):
    """Serves the pre-compiled PDF documentation of a project if available."""
    if project_id not in config.PROJECTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found."
        )
    
    # 1. First, check local bundled PDFs directory (ideal for standalone builds)
    pdf_filename = f"{project_id}-docs.pdf"
    local_pdf_path = config.LOCAL_SIBLING_PDFS / pdf_filename
    
    if local_pdf_path.exists():
        logger.info(f"Serving local bundled PDF: {local_pdf_path}")
        return FileResponse(
            path=local_pdf_path,
            filename=local_pdf_path.name,
            media_type="application/pdf"
        )
        
    # 2. Fallback to reading from the sibling project's docs folder directly (development)
    project_info = config.PROJECTS[project_id]
    docs_dir = project_info["docs"]
    
    if not docs_dir:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' does not have a documentation folder."
        )
        
    pdf_path = docs_dir / pdf_filename
    if not pdf_path.exists():
        pdf_files = list(docs_dir.glob("*.pdf"))
        if pdf_files:
            pdf_path = pdf_files[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF documentation not found for project '{project_id}'. Run generate_pdfs.py first."
            )
            
    logger.info(f"Serving fallback workspace PDF: {pdf_path}")
    return FileResponse(
        path=pdf_path,
        filename=pdf_path.name,
        media_type="application/pdf"
    )

# Static Files Serving for Production UI
# React front-end compiles into 'frontend/dist'
DIST_DIR = config.PROJECT_ROOT / "frontend" / "dist"

if DIST_DIR.exists() and DIST_DIR.is_dir():
    logger.info(f"Serving compiled production frontend from {DIST_DIR}")
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
else:
    logger.warning(
        f"Production frontend directory '{DIST_DIR}' not found. "
        "Serve API endpoints only. Run 'npm run build' inside frontend/ to compile static UI."
    )
