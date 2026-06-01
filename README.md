# AI Portfolio Dashboard & Recruiter Agent

A premium, interactive single-page portfolio hub that aggregates all four AI projects (`pubmedqa-finetune`, `rag-doc-qa`, `sql-insight-agent`, and `multi-agent-researcher`) into a stunning dark-mode dashboard. It features an **Interactive Skills Matrix** linking skills to projects, and embeds an LLM-powered **Recruiter Chatbot** capable of answering deep technical questions about candidate skills, experience, and architectural choices.

---

## Key Features

1. **Interactive Skills Matrix:** A dynamic layout grouping core capabilities (BERT Fine-Tuning, Hybrid RAG, Multi-Agent LangGraph, FastAPI, Docker, and deployment). Clicking any skill visually filters and highlights projects that implement it.
2. **Project Showcase Modals:** Rich modals for each project displaying their specific architectures, engineering challenges solved, and key concepts demonstrated.
3. **AI Recruiter Chatbot:** A responsive chat assistant grounded in the candidate's profile, resume, and markdown project documentation. The agent is powered by a **Configurable Dual-Provider** engine supporting both Anthropic Claude and Google Gemini via `.env` API keys.
4. **Preset Recruiter Suggestion Chips:** Clickable quick-ask bubbles to guide recruiter interaction (e.g., *"What is Nikhil's experience with LangGraph?"*, *"Tell me about the PubMedQA fine-tuning results"*, etc.).
5. **Resume & Career Timeline:** An interactive chronological pathway showcasing work experience, education, and technical certifications.

---

## Tech Stack

* **Backend:** FastAPI, Asynchronous Python, Uvicorn, Pydantic, Anthropic SDK / Google GenAI SDK.
* **Frontend:** Vite, React, Vanilla CSS (Glassmorphism, Vibrant HSL gradients, custom keyframe micro-animations).

---

## Getting Started

### 1. Environment Setup
Create a `.env` file at the root of `portfolio-dashboard/` containing your API keys:
```env
# Add either or both:
ANTHROPIC_API_KEY=your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### 2. Run Backend
Ensure you have Python 3.9+ installed:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Run Frontend
Ensure you have Node.js 18+ installed:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚀 How to Add New Projects in the Future

The portfolio dashboard is designed to be highly modular and extensible. If you build a new AI/NLP project in the future and want to add it to your live portfolio website, follow these **3 simple steps**:

### Step 1: Add Frontend Project Metadata
Open **`frontend/src/data/projects.js`** and add a new project entry to the `projectsData` array:

```javascript
{
  id: "my-new-ai-project",
  title: "My New AI Project",
  subtitle: "Brief description of the core capability",
  metrics: [
    { label: "Performance", value: "98% Accuracy" }
  ],
  techStack: ["React", "FastAPI", "Gemini 2.5"],
  description: "A summary of what the project accomplishes...",
  achievements: [
    "Implemented core LLM orchestration.",
    "Containerized services for deployment."
  ],
  concepts: ["Generative AI", "LLM APIs"],
  skills: ["FastAPI REST APIs", "Prompt Engineering & Structured Outputs"], // Maps to skills matrix
  demoUrl: "http://localhost:8000",
  githubUrl: "https://github.com/your-username/your-repo"
}
```

> [!TIP]
> The **Interactive Skills Matrix** dynamically parses this file. The moment you save the metadata, the new project will automatically display and highlight itself whenever recruiters click on matching skills!

### Step 2: Register in the Backend Config
Open **`backend/config.py`** and add your project directory to the `PROJECTS` dictionary at the bottom:

```python
PROJECTS = {
    "pubmedqa-finetune": get_project_paths("pubmedqa-finetune"),
    "rag-doc-qa": get_project_paths("rag-doc-qa"),
    "sql-insight-agent": get_project_paths("sql-insight-agent"),
    "multi-agent-researcher": get_project_paths("multi-agent-researcher"),
    
    # ➔ Add your new project folder name here:
    "my-new-ai-project": get_project_paths("my-new-ai-project")
}
```

> [!TIP]
> This automatically registers the project backend. The FastAPI server will dynamically map its new PDF downloads endpoint, and the **Recruiter Agent chatbot** will ingest the project's README/documentation into its system context on startup!

### Step 3: Bundle, Rebuild & Push
If deploying as a standalone `portfolio-dashboard` repository, run these commands in your terminal to package and push your changes:

1. **Bundle Sibling Docs:** Run the aggregation script to automatically copy the new project's README, docs, and PDFs:
   ```bash
   python copy_contexts.py
   ```
2. **Rebuild the Frontend UI:** Compile the React bundle so the FastAPI backend serves the updated static assets:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
3. **Commit and Push to GitHub:**
   ```bash
   git add .
   git commit -m "feat: added new project to portfolio"
   git push origin main
   ```

Render will automatically detect the new commit, re-deploy your web service, and your live website will be updated instantly!
