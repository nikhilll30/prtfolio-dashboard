# CLAUDE.md (Local Portfolio Dashboard)

Development guidelines and commands for the AI Portfolio Dashboard & Recruiter Agent.

## Commands

### Setup Environments

#### Backend (Python)
Ensure Python 3.9+ is installed. Run from the `portfolio-dashboard` folder:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend (Node.js / Vite)
Ensure Node.js 18+ is installed. Run from the `portfolio-dashboard/frontend` folder:
```bash
npm install
```

### Running Locally (Development Mode)

Start backend and frontend in separate terminals:

* **Backend API (Port 8000):**
  Ensure `.env` contains `ANTHROPIC_API_KEY` and/or `GEMINI_API_KEY`.
  ```bash
  venv\Scripts\activate
  uvicorn backend.main:app --reload --port 8000
  ```
* **Frontend Dev Server (Port 5173):**
  ```bash
  cd frontend
  npm run dev
  ```

### Production Build & Serve

To compile the frontend and host it directly via FastAPI:
```bash
# 1. Build React production files
cd frontend
npm run build

# 2. Start FastAPI server (serves the backend and front-end static files)
cd ..
venv\Scripts\activate
uvicorn backend.main:app --port 8000
```

## Directory Structure
```
portfolio-dashboard/
├── requirements.txt
├── CLAUDE.md
├── README.md
├── candidate_profile.md
├── backend/
│   ├── main.py
│   ├── config.py
│   └── agent.py
└── frontend/
    ├── package.json
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── components/
    │   └── data/
    └── dist/             # Compiled production UI
```
