# NaviSpark — AI-Powered Proposal Review System

NaviSpark is a full-stack application that uses two multi-agent AI pipelines (powered by AWS Bedrock Claude Sonnet 4) to automatically review business proposals. Upload a PDF, PPTX, or Word document and choose how to evaluate it:

- **Standard Pipeline** — four specialist agents review your proposal against a built-in 57-item checklist covering completeness, commercial integrity, and competitive strength.
- **Custom Checklist Pipeline** — upload your own checklist file (Excel, CSV, Word, or PDF) and seven agents parse your criteria, auto-detect weights, evaluate per category in parallel, and synthesise a verdict tailored entirely to your framework.

Both pipelines benefit from Bedrock prompt caching (reducing re-analysis token cost by ~90 %), real-time WebSocket progress streaming, and per-agent token tracking — all surfaced in an interactive, six-view report dashboard.

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
- [Agent Pipelines](#agent-pipelines)
- [API Reference](#api-reference)
- [Deployment (Azure Container Apps)](#deployment-azure-container-apps)

---

## Architecture Overview

```
User Browser
     │
     ▼
React + Vite Frontend (port 5173)
     │  REST + WebSocket
     ▼
FastAPI Backend (port 8000)
     │
     ├── Supabase (PostgreSQL + Auth + Storage)
     │
     └── AWS Bedrock (Claude Sonnet 4)
              │
              ├── ── STANDARD PIPELINE ──────────────────────────
              │   ├── Cache Agent  — seeds Bedrock prompt cache
              │   ├── Agent 1 (A1) — completeness & writing quality   ┐ parallel
              │   ├── Agent 2 (A2) — commercial integrity & pricing   │
              │   ├── Agent 3 (A3) — competitive strength & client fit ┘
              │   └── Agent 4 (A4) — synthesis, weighting, final verdict (sequential)
              │
              └── ── CUSTOM CHECKLIST PIPELINE ──────────────────
                  ├── Cache Agent  — seeds Bedrock prompt cache
                  │
                  │   PHASE 1 · PREFLIGHT (auto, after upload)
                  ├── NC1 — document intelligence & context detection  ┐ parallel
                  ├── NC2 — checklist parsing & evaluation framework   ┘
                  │         ↓ user reviews & confirms detected context
                  │   PHASE 2 · EVALUATION (user-triggered)
                  ├── NC3 — per-category proposal evaluation (fan-out, up to 8 parallel instances)
                  ├── NCR1 — clarity & completeness specialist         ┐ parallel
                  ├── NCR2 — commercial strength specialist            │ with NC3
                  ├── NCR3 — competitive position specialist           ┘
                  └── NC4  — weighted aggregation, verdict, executive summary (sequential)
```

**Key concurrency patterns:**
- Standard: A1, A2, A3 run in parallel; A4 is sequential.
- Custom Phase 1: NC1 + NC2 run in parallel.
- Custom Phase 2: NC3 fans out (one instance per checklist category, ≤ 8 concurrent); NCR1–3 run in parallel alongside NC3; NC4 is sequential after all complete.
- Both pipelines share a Cache Agent that seeds the Bedrock prompt cache before any analysis begins, cutting re-analysis token cost by ~90 %.

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
│   ├── bedrock_client.py       # AWS Bedrock invocation (PDF & text modes) + prompt caching
│   ├── models.py               # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   ├── agents/
│   │   ├── agent1/             # A1 — writing quality, section completeness, jargon
│   │   ├── agent2/             # A2 — commercial integrity & pricing
│   │   ├── agent3/             # A3 — competitive strength & client fit
│   │   ├── agent4/             # A4 — cross-agent synthesis & final verdict
│   │   ├── cache_agent/        # Seeds Bedrock prompt cache; records cache token metrics
│   │   ├── NC1/                # Document intelligence (structure map, context detection)
│   │   ├── NC2/                # Checklist parser (Excel/CSV/Word/PDF → evaluation framework)
│   │   ├── NC3/                # Per-category proposal evaluator (fan-out pattern)
│   │   ├── NC4/                # Custom pipeline synthesis, verdict engine, report
│   │   ├── NCR1/               # Clarity & completeness specialist reviewer
│   │   ├── NCR2/               # Commercial strength specialist reviewer
│   │   └── NCR3/               # Competitive position specialist reviewer
│   │
│   ├── routes/
│   │   ├── auth_routes.py      # POST /auth/register|login, GET /auth/me
│   │   ├── session_routes.py   # POST /upload, GET|DELETE /sessions/{id}
│   │   ├── agent_routes.py     # POST /sessions/{id}/run-analysis
│   │   ├── custom_routes.py    # POST /custom-upload, /run-custom-analysis, /confirm-nc1-context
│   │   ├── ws_routes.py        # WebSocket /ws/sessions/{id}/activity — real-time event feed
│   │   ├── chat_routes.py      # POST /chat
│   │   └── admin_routes.py     # Admin panel operations
│   │
│   └── services/
│       ├── pipeline_service.py         # Orchestrates the standard 4-agent pipeline
│       ├── custom_pipeline_service.py  # Orchestrates the custom NC1–NC4 + NCR1–3 pipeline
│       ├── checklist_parser_service.py # PDF/Excel/DOCX parsing utilities for NC2
│       ├── token_service.py            # Per-agent token recording (input, output, cache)
│       ├── event_emitter.py            # Session-scoped async event bus for WebSocket streaming
│       ├── file_service.py             # MIME detection, PDF validation, PPTX → PDF (CloudConvert)
│       └── session_service.py          # CRUD operations on review_sessions
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
        │   ├── UploadPage.jsx      # File upload + context fields (standard pipeline)
        │   ├── ResultsPage.jsx     # Full results visualisation + chat panel
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── HowItWorksPage.jsx  # Full interactive documentation of both pipelines
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

## Agent Pipelines

### Standard Pipeline

| Agent | Role | Runs |
|---|---|---|
| **Cache Agent** | Seeds AWS Bedrock prompt cache with the full proposal document; records cache creation vs. cache read token metrics | Before A1–A4 |
| **Agent 1 (A1)** | Writing quality, section completeness, scope clarity, jargon flags, rewrite suggestions | Parallel |
| **Agent 2 (A2)** | Commercial integrity — pricing completeness, estimation rigour, phase coverage, arithmetic checks | Parallel |
| **Agent 3 (A3)** | Competitive strength — client fit, differentiation, risk transparency, credibility, narrative | Parallel |
| **Agent 4 (A4)** | Synthesises A1–A3 outputs; applies dynamic industry weights; produces overall score (0–10), priority action plan, and final verdict | Sequential (after A1–A3) |

**Verdict values:** `READY TO SEND` · `REVISE BEFORE SENDING` · `NEEDS MAJOR REVISION`

**Session status flow (Standard):**
```
uploading → ready → pipeline_running → agents_complete → complete
                                                      ↘ pipeline_failed
```

---

### Custom Checklist Pipeline

#### Phase 1 — Preflight (automatic after upload)

| Agent | Role | Runs |
|---|---|---|
| **Cache Agent** | Seeds Bedrock prompt cache with proposal; records token metrics | Before NC1 + NC2 |
| **NC1** | Document intelligence — maps proposal structure, auto-detects industry/type/priorities/metadata, quality pre-scan, confidence scoring | Parallel |
| **NC2** | Checklist intelligence — parses uploaded checklist (Excel/CSV/Word/PDF), extracts categories, items, weights, and scoring type; writes dynamic LLM evaluation prompts enriched with NC1 context | Parallel |

After Phase 1, the user reviews and can edit the auto-detected context before triggering Phase 2.

#### Phase 2 — Evaluation (user-triggered)

| Agent | Role | Runs |
|---|---|---|
| **NC3** | Per-category proposal evaluator — one instance per checklist category, all running concurrently (≤ 8 parallel); each produces PASS / PARTIAL / FAIL per item, evidence quotes, and gap narratives | Fan-out (parallel) |
| **NCR1** | Clarity & Completeness specialist — deep-dives section audit, writing issues, scope clarity, high-risk assumptions; independent of the custom checklist | Parallel with NC3 |
| **NCR2** | Commercial Strength specialist — estimation quality, pricing strategy, cost-benefit clarity | Parallel with NC3 |
| **NCR3** | Competitive Position specialist — client fit, risk transparency, competitive differentiation | Parallel with NC3 |
| **NC4** | Weighted score aggregation, cross-checklist consistency checks, priority action generation (must-fix / should-fix / next-time), strengths identification, verdict engine, dimension mapping for radar visualisation, executive summary | Sequential (after NC3 + NCR) |

**Resilience:** NCR1–NCR3 failures are non-fatal (NC4 still produces a verdict). Per-category NC3 failures are non-fatal (other categories continue). NC1 or NC2 failure halts the pipeline.

**Session status flow (Custom):**
```
uploading → ready (after NC1+NC2) → pipeline_running → complete
                                                     ↘ pipeline_failed
                                  ↘ cancelled
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Log in, receive JWT |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/auth/logout` | Invalidate session |

### Standard Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload a PDF, PPTX, or Word proposal |
| `GET` | `/sessions` | List all sessions for the current user |
| `GET` | `/sessions/{id}` | Get a single session with full agent outputs |
| `DELETE` | `/sessions/{id}` | Delete a session and its stored files |
| `POST` | `/sessions/{id}/run-analysis` | Trigger the standard 4-agent pipeline |
| `POST` | `/chat` | Chat about a session's results |

### Custom Checklist Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/custom-upload` | Upload proposal + checklist file; auto-starts NC1 + NC2 preflight |
| `GET` | `/sessions/{id}/preflight-status` | Poll NC1 + NC2 completion status and summaries |
| `POST` | `/sessions/{id}/confirm-nc1-context` | Submit user-confirmed or edited NC1 context before Phase 2 |
| `POST` | `/sessions/{id}/run-custom-analysis` | Trigger Phase 2 (NC3 fan-out + NCR1–3 + NC4) |
| `POST` | `/sessions/{id}/cancel-custom-analysis` | Cancel an in-progress custom pipeline run |
| `POST` | `/sessions/{id}/re-run-custom` | Re-run the pipeline (skips preflight if NC1/NC2 outputs exist) |

### Real-time & Utility

| Method | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/sessions/{id}/activity?token=<jwt>` | WebSocket — streams agent events in real time; supports late-connect replay |
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
