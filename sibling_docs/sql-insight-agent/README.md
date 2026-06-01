# SQL Insight Agent

Ask your database anything in plain English — powered by Claude AI and LangChain.

## What It Does

SQL Insight Agent translates natural language questions into SQL queries, executes them against a real database, and returns plain English answers. No SQL knowledge required.

**Example questions:**
- "Who are the top 5 customers by total spending?"
- "Which genre has the most tracks?"
- "Which country has the most customers?"
- "Who is the employee that supports the most valuable customers?"

## Architecture
```
User Question
     ↓
Streamlit UI
     ↓
FastAPI Backend (REST API)
     ↓
LangChain SQL Agent (powered by Claude)
     ↓
SQLite Database (Chinook)
     ↓
Plain English Answer
```

## Key Features

- **Natural language to SQL** — Claude writes the SQL query automatically
- **Self-correcting** — if a query fails, the agent diagnoses the error and retries
- **Schema-aware** — agent inspects the database structure before writing queries
- **Honest about limits** — if data doesn't exist, it says so instead of hallucinating
- **Production-ready** — containerized with Docker, deployed on Render

## Tech Stack

| Tool | Purpose |
|------|---------|
| Python | Core language |
| LangChain | SQL agent orchestration |
| Claude (Anthropic) | LLM powering the agent |
| FastAPI | REST API wrapper |
| SQLite + Chinook DB | Sample business database |
| Pydantic | Request/response validation |
| Docker | Containerization |
| Render | Cloud deployment |
| Streamlit | Interactive UI |

## Live Demo

- **API:** https://sql-insight-agent.onrender.com
- **API Docs:** https://sql-insight-agent.onrender.com/docs
- **Health Check:** https://sql-insight-agent.onrender.com/health

> Note: Free tier on Render spins down after inactivity. First request may take 30-60 seconds to wake up.

## Run Locally

**1. Clone the repo**
```bash
git clone https://github.com/nikhilll30/sql-insight-agent.git
cd sql-insight-agent
```

**2. Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Download the database**
```bash
curl -L -o chinook.db https://github.com/lerocha/chinook-database/raw/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite
```

**5. Set up environment variables**
```bash
echo "ANTHROPIC_API_KEY=your-key-here" > .env
```

**6. Run the API**
```bash
uvicorn main:app --reload
```

**7. Run the UI (separate terminal)**
```bash
streamlit run app.py
```

## Run with Docker
```bash
docker build -t sql-insight-agent .
docker run -p 8000:8000 --env-file .env sql-insight-agent
```

## API Usage
```bash
curl -X POST https://sql-insight-agent.onrender.com/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Who are the top 5 customers by spending?"}'
```

**Response:**
```json
{
  "question": "Who are the top 5 customers by spending?",
  "answer": "The top 5 customers by total spending are:\n1. Helena Holy - $49.62\n...",
  "time_taken_seconds": 12.4
}
```

## Design Decisions

- **Agent loads at startup** — not per request, avoiding cold-start latency
- **handle_parsing_errors=True** — enables automatic retry on SQL errors
- **verbose=True** — full reasoning chain logged for transparency
- **Chinook database** — mirrors real business data making demo questions meaningful

## Project Structure
```
sql-insight-agent/
├── main.py           # FastAPI app and agent initialization
├── app.py            # Streamlit UI
├── agent.py          # Standalone agent testing
├── error_recovery.py # Error handling tests
├── test_db.py        # Database connection test
├── Dockerfile        # Container definition
├── requirements.txt  # Dependencies
└── .env.example      # Environment variable template
```

## What I Learned

- How LangChain SQL agents use a Think-Act-Observe loop
- How to wrap an AI agent in a production REST API
- How to containerize and deploy a Python AI application
- Why error recovery matters more than happy-path performance
- How to keep secrets out of source code and Docker images