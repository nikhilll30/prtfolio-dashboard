# Nikhil Teja — Applied AI Portfolio

An evidence-first portfolio for four applied AI systems. The React interface presents the work as an interactive capability network, then opens into shareable case studies with deterministic architecture walkthroughs, engineering tradeoffs, explicit limitations, and source links.

The FastAPI backend serves the production frontend, project documentation PDFs, and a recruiter-facing knowledge interface grounded in the bundled candidate and project documentation.

## Experience

- **Living system map:** Trace orchestration, retrieval, recovery, and evaluation across the portfolio without hiding core content behind the visualization.
- **Shareable case studies:** Clean `/work/:project-id` routes for the multi-agent researcher, hybrid RAG engine, SQL insight agent, and PubMedQA model.
- **Interactive architecture simulations:** Step through deterministic request flows based on the documented implementation; simulations are clearly distinguished from live model output.
- **Evidence ledger:** Metrics and system facts require a source link. Unsupported legacy claims are intentionally omitted.
- **Grounded portfolio agent:** Optional project context and backend-approved evidence links accompany answers. The site remains fully useful when no model provider is configured.
- **Accessible motion:** Keyboard and touch support, visible focus, semantic controls, responsive linear mobile layouts, and reduced-motion behavior.

## Stack

- **Frontend:** React 19, Vite, Motion, React Router, Canvas 2D, and custom CSS.
- **Backend:** FastAPI, Pydantic, Anthropic or Google GenAI, with a local evidence fallback.
- **Content:** Bundled project Markdown and PDF documentation plus the published Hugging Face model card.

## Local development

Create and configure the Python environment from the project root:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Add `ANTHROPIC_API_KEY` and/or `GEMINI_API_KEY` to `.env` when live recruiter-agent answers are needed. Without either key, the backend uses its documented local fallback.

Start the API:

```bash
uvicorn backend.main:app --reload --port 8000
```

Install and start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

## Validation

```bash
cd frontend
npm run lint
npm run test
npm run build

cd ..
venv\Scripts\python.exe -m pytest backend\test_main.py -q
```

## Production

The current deployment remains a single FastAPI service. Build the frontend before starting the server:

```bash
cd frontend
npm run build
cd ..
uvicorn backend.main:app --port 8000
```

FastAPI serves real static assets directly and falls back to the React application for clean case-study routes. Unknown `/api/*` paths remain JSON 404 responses.

## Adding another project

Add one structured project record in `frontend/src/data/projects.js`, including architecture nodes, walkthrough stages, decisions, limitations, and proof entries. Every proof entry must include a source label and URL. Register bundled documentation in `backend/config.py` only when the project has downloadable docs or recruiter-agent source material.
