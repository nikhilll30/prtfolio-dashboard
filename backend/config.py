import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent

# Load environment variables
# Look in portfolio-dashboard/.env and fallback to workspace root .env if needed
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(WORKSPACE_ROOT / ".env")

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Profile & Docs paths
PROFILE_PATH = PROJECT_ROOT / "candidate_profile.md"

# Sibling docs local directories (Self-contained standalone support)
LOCAL_SIBLING_DOCS = PROJECT_ROOT / "sibling_docs"
LOCAL_SIBLING_PDFS = PROJECT_ROOT / "sibling_pdfs"

def get_project_paths(name):
    # Check if we have local bundled documentation (e.g. on Render)
    local_readme = LOCAL_SIBLING_DOCS / name / "README.md"
    local_docs = LOCAL_SIBLING_DOCS / name / "docs"
    
    if local_readme.exists():
        return {
            "path": LOCAL_SIBLING_DOCS / name,
            "docs": local_docs if local_docs.exists() else None,
            "readme": local_readme,
        }
    else:
        # Fallback to local workspace paths (for development)
        fallback_docs = WORKSPACE_ROOT / name / "docs"
        return {
            "path": WORKSPACE_ROOT / name,
            "docs": fallback_docs if fallback_docs.exists() else None,
            "readme": WORKSPACE_ROOT / name / "README.md" if (WORKSPACE_ROOT / name / "README.md").exists() else None,
        }

PROJECTS = {
    "pubmedqa-finetune": get_project_paths("pubmedqa-finetune"),
    "rag-doc-qa": get_project_paths("rag-doc-qa"),
    "sql-insight-agent": get_project_paths("sql-insight-agent"),
    "multi-agent-researcher": get_project_paths("multi-agent-researcher")
}
