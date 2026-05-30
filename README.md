# NaviSpark — AI-Powered Proposal Review System

NaviSpark is a full-stack application that uses a multi-agent AI pipeline (powered by AWS Bedrock Claude Sonnet 4) to automatically review business proposals. Users upload a PDF or PowerPoint deck; four specialist agents analyse it in parallel and in sequence, then produce scored findings, rewrite suggestions, and a final verdict — all surfaced in an interactive dashboard.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Running Locally (Without Docker)](#running-locally-without-docker)
- [Running Locally (With Docker Compose)](#running-locally-with-docker-compose)
- [Project Structure](#project-structure)
- [Agent Pipeline](#agent-pipeline)
- [API Reference](#api-reference)
- [Deployment (Azure Container Apps)](#deployment-azure-container-apps)

---

## Architecture Overview

```
User Browser
     │
     ▼
React + Vite Frontend (port 5173)
     │  REST + polling
     ▼
FastAPI Backend (port 8000)
     │
     ├── Supabase (PostgreSQL + Auth + Storage)
     │
     └── AWS Bedrock (Claude Sonnet 4)
              │
              ├── Agent 1 — Writing & completeness quality
              ├── Agent 2 — Compliance & alignment scoring
              ├── Agent 3 — Checklist coverage analysis
              └── Agent 4 — Cross-agent synthesis & final verdict
```

Agents 1, 2, and 3 run in **parallel**. Agent 4 runs **sequentially** after all three complete, consuming their outputs to produce the final score, verdict, and priority action plan.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6 |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI / LLM | AWS Bedrock — `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| Database | Supabase (PostgreSQL with Row-Level Security) |
| Auth | Supabase Auth (JWT) |
| File Storage | Supabase Storage |
| File Conversion | CloudConvert API (PPTX → PDF) |
| Containerisation | Docker, Docker Compose |
| CI / CD | GitHub Actions → Azure Container Apps |

---

## Prerequisites

Make sure the following are installed before you begin:

- **Node.js** 20+ and **npm** 10+
- **Python** 3.11+
- **pip** (or a virtual-env manager such as `venv` / `conda`)
- **Docker** and **Docker Compose** (only needed for the containerised path)
- An **AWS account** with Bedrock access enabled in `us-east-1` and permissions to invoke `anthropic.claude-sonnet-4` models
- A **Supabase** project (free tier is sufficient)
- A **CloudConvert** account and API key (needed only when uploading `.pptx` files)

---

## Environment Variables

### Backend — root `.env`

Create a file called `.env` in the **project root** (`navispark/.env`):

```env
# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ── AWS Bedrock ───────────────────────────────────────────
# Option A — static credentials
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
AWS_SESSION_TOKEN=<your-session-token>         # only if using temporary SSO creds

# Option B — named CLI profile (comment out Option A keys)
# AWS_PROFILE=<your-named-profile>

AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0

# ── CloudConvert ──────────────────────────────────────────
CLOUDCONVERT_API_KEY=<your-cloudconvert-api-key>

# ── App ───────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
```

### Frontend — `frontend/.env`

Create a file called `.env` inside the `frontend/` directory (`navispark/frontend/.env`):

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

> **Where to find Supabase keys:** Go to your Supabase project → *Settings* → *API*. The **anon / public** key goes into the frontend env; the **service_role** (secret) key goes into the backend env.

---

## Supabase Setup

Complete the following steps once in your Supabase project before running the app.

### 1. Enable Email Auth

Go to *Authentication* → *Providers* → **Email** and make sure it is enabled.  
For local development, disable **"Confirm email"** so you can log in immediately without an email link.

### 2. Create the Storage Bucket

Go to *Storage* → **New bucket**.

- Name: `navispark-uploads`
- Public: **No** (keep it private)

### 3. Create the Database Table

Go to *SQL Editor* and run the following script:

```sql
-- Main sessions table
CREATE TABLE IF NOT EXISTS public.review_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- File metadata
  original_filename   TEXT,
  file_type           TEXT,
  storage_path        TEXT,
  page_count          INTEGER,

  -- User-provided context
  client_industry     TEXT[],
  proposal_type       TEXT,
  client_priorities   TEXT[],

  -- Pipeline status
  status              TEXT NOT NULL DEFAULT 'uploading',

  -- Agent outputs (raw JSON)
  agent1_output       JSONB,
  agent2_output       JSONB,
  agent3_output       JSONB,
  agent4_output       JSONB,

  -- Generated report
  report_storage_path TEXT
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.review_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security: users can only see/modify their own sessions
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.review_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.review_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.review_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.review_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Running Locally (Without Docker)

### Backend

```bash
# 1. Navigate to the backend directory
cd navispark/backend

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the development server
#    The server reads ../.env (the root .env) automatically via python-dotenv
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### Frontend

```bash
# 1. Navigate to the frontend directory
cd navispark/frontend

# 2. Install dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running Locally (With Docker Compose)

Docker Compose spins up both services in one command. Make sure the root `.env` is filled in before running.

```bash
# From the project root (navispark/)
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

To stop and remove containers:

```bash
docker compose down
```

To rebuild after code changes:

```bash
docker compose up --build
```

---

## Project Structure

```
navispark/
├── .env                        # Backend environment variables (git-ignored)
├── docker-compose.yml          # Local dev orchestration
│
├── backend/
│   ├── main.py                 # FastAPI app entry point, route registration, CORS
│   ├── config.py               # Pydantic Settings — reads from .env
│   ├── auth.py                 # JWT validation via Supabase Auth
│   ├── database.py             # Supabase client singleton
│   ├── storage.py              # Supabase Storage helpers (upload / download / retry)
│   ├── bedrock_client.py       # AWS Bedrock invocation (PDF & text modes)
│   ├── models.py               # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   ├── agents/
│   │   ├── agent1/             # Writing quality, section completeness, jargon
│   │   ├── agent2/             # Compliance & alignment scoring
│   │   ├── agent3/             # Checklist coverage analysis
│   │   └── agent4/             # Cross-agent synthesis & final verdict
│   │
│   ├── routes/
│   │   ├── auth_routes.py      # POST /auth/register|login, GET /auth/me
│   │   ├── session_routes.py   # POST /upload, GET|DELETE /sessions/{id}
│   │   ├── agent_routes.py     # POST /sessions/{id}/run-analysis
│   │   └── chat_routes.py      # POST /chat
│   │
│   └── services/
│       ├── pipeline_service.py # Orchestrates the 4-agent pipeline
│       ├── file_service.py     # MIME detection, PDF validation, PPTX → PDF
│       └── session_service.py  # CRUD operations on review_sessions
│
└── frontend/
    ├── .env                    # Frontend environment variables (git-ignored)
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    ├── Dockerfile
    ├── nginx.conf              # Production static serving config
    │
    └── src/
        ├── main.jsx            # React DOM entry point
        ├── App.jsx             # Router setup, context providers
        │
        ├── api/
        │   └── client.js       # Typed wrappers for all backend API calls
        │
        ├── context/
        │   ├── AuthContext.jsx  # User auth state, login / logout
        │   └── ThemeContext.jsx # Dark / light theme switching
        │
        ├── pages/
        │   ├── DashboardPage.jsx   # Home — session list, KPIs, needs-attention
        │   ├── UploadPage.jsx      # File upload + context fields
        │   ├── ResultsPage.jsx     # Full results visualisation + chat panel
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── HowItWorksPage.jsx
        │
        └── components/
            ├── results/            # Per-view result panels (Executive, Dashboard, etc.)
            ├── agent1/             # Agent 1 visualisation components
            ├── agent3/             # Agent 3 visualisation components
            ├── agent4/             # Agent 4 visualisation components
            ├── Navbar.jsx
            ├── ProposalCard.jsx
            └── ChatPanel.jsx
```

---

## Agent Pipeline

| Agent | Role | Runs |
|---|---|---|
| **Agent 1** | Writing quality, section completeness, scope clarity, industry gaps, jargon flags, rewrite suggestions | Parallel |
| **Agent 2** | Compliance scoring, alignment metrics, regulatory checks | Parallel |
| **Agent 3** | Checklist coverage analysis against industry-specific criteria | Parallel |
| **Agent 4** | Synthesises Agent 1–3 outputs; produces overall score (0–10), priority action plan, and final verdict | Sequential (after 1–3) |

**Verdict values returned by Agent 4:**
- `READY TO SEND`
- `NEEDS MAJOR REVISION`
- `DO NOT SEND`

**Session status flow:**

```
uploading → ready → pipeline_running → agents_complete → complete
                                                      ↘ pipeline_failed
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Log in, receive JWT |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/auth/logout` | Invalidate session |
| `POST` | `/upload` | Upload a PDF or PPTX proposal |
| `GET` | `/sessions` | List all sessions for the current user |
| `GET` | `/sessions/{id}` | Get a single session with full agent outputs |
| `DELETE` | `/sessions/{id}` | Delete a session and its stored files |
| `POST` | `/sessions/{id}/run-analysis` | Trigger the 4-agent analysis pipeline |
| `POST` | `/chat` | Send a message to chat about a session's results |
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |

All protected endpoints require an `Authorization: Bearer <jwt>` header. The JWT is issued on login and stored in the browser via Supabase Auth.

Full interactive docs are available at `http://localhost:8000/docs` when the backend is running.

---

## Deployment (Azure Container Apps)

The project ships with a GitHub Actions workflow at `.github/workflows/deploy.yml` that:

1. Builds Docker images for the backend and frontend.
2. Pushes them to **Azure Container Registry**.
3. Deploys them as **Azure Container Apps**.

### Required GitHub Secrets

Configure the following secrets in your GitHub repository (*Settings → Secrets and variables → Actions*):

```
AZURE_CREDENTIALS               # Service principal JSON from `az ad sp create-for-rbac`
REGISTRY_LOGIN_SERVER           # e.g. myregistry.azurecr.io
REGISTRY_USERNAME               # ACR username
REGISTRY_PASSWORD               # ACR password

# Backend runtime secrets (injected as container env vars)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN
AWS_REGION
BEDROCK_MODEL_ID
CLOUDCONVERT_API_KEY

# Frontend build args (baked into the Vite build)
VITE_API_URL                    # Public URL of the deployed backend container
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Push to the `main` branch to trigger a full build and deploy.
