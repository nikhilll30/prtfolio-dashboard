import os
import shutil
from pathlib import Path

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parent
WORKSPACE_ROOT = PROJECT_ROOT.parent

SIBLING_DOCS_DIR = PROJECT_ROOT / "sibling_docs"
SIBLING_PDFS_DIR = PROJECT_ROOT / "sibling_pdfs"

PROJECTS = ["pubmedqa-finetune", "rag-doc-qa", "sql-insight-agent", "multi-agent-researcher"]

def copy_sibling_data():
    print("=== Aggregating Sibling Project Documentation for Standalone Build ===")
    
    # 1. Create target directories
    SIBLING_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    SIBLING_PDFS_DIR.mkdir(parents=True, exist_ok=True)
    
    for project in PROJECTS:
        src_proj_dir = WORKSPACE_ROOT / project
        if not src_proj_dir.exists():
            print(f"Skipping {project} (not found in workspace).")
            continue
            
        target_proj_dir = SIBLING_DOCS_DIR / project
        target_proj_dir.mkdir(parents=True, exist_ok=True)
        
        # A. Copy README.md
        src_readme = src_proj_dir / "README.md"
        if src_readme.exists():
            shutil.copy2(src_readme, target_proj_dir / "README.md")
            print(f"[OK] Copied README.md for {project}")
            
        # B. Copy docs/*.md files
        src_docs = src_proj_dir / "docs"
        if src_docs.exists():
            target_docs_dir = target_proj_dir / "docs"
            target_docs_dir.mkdir(parents=True, exist_ok=True)
            for md_file in src_docs.glob("*.md"):
                shutil.copy2(md_file, target_docs_dir / md_file.name)
            print(f"[OK] Copied markdown docs for {project}")
            
            # C. Copy PDF files
            for pdf_file in src_docs.glob("*.pdf"):
                shutil.copy2(pdf_file, SIBLING_PDFS_DIR / pdf_file.name)
                print(f"[OK] Copied PDF documentation for {project} ({pdf_file.name})")

    print("\n=== Documentation Aggregation Complete! ===")

if __name__ == "__main__":
    copy_sibling_data()
