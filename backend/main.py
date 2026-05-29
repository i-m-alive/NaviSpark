"""
=============================================================
NAVISPARK PS03 — SUPABASE SETUP REQUIRED BEFORE FIRST RUN
=============================================================

Step 1: Supabase Storage
  - Go to Supabase Dashboard → Storage
  - Create a new bucket named exactly: navispark-uploads
  - Set Access: Private (NOT public)
  - No other settings needed

Step 2: Database Table
  - Go to Supabase Dashboard → SQL Editor
  - Run the following SQL exactly:

    CREATE TABLE IF NOT EXISTS review_sessions (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status              TEXT NOT NULL DEFAULT 'uploading',
      original_filename   TEXT,
      file_type           TEXT,
      storage_path        TEXT,
      page_count          INTEGER,
      client_industry     TEXT[],
      proposal_type       TEXT,
      client_priorities   TEXT[],
      agent1_output       JSONB,
      agent2_output       JSONB,
      agent3_output       JSONB,
      agent4_output       JSONB,
      report_storage_path TEXT
    );

    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_review_sessions_updated_at
      BEFORE UPDATE ON review_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own sessions"
      ON review_sessions FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own sessions"
      ON review_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own sessions"
      ON review_sessions FOR UPDATE USING (auth.uid() = user_id);

Step 3: Supabase Auth Settings
  - Go to Supabase Dashboard → Authentication → Settings
  - Under "Email Auth": make sure "Enable Email Signup" is ON
  - For local testing, disable "Confirm email" (Email Confirmations toggle OFF)
    so you can log in immediately after registering without verifying email

=============================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.auth_routes import router as auth_router
from routes.session_routes import router as session_router
from routes.agent_routes import router as agent_router

app = FastAPI(
    title="NAVISPARK PS03 API",
    description="AI-powered proposal review system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(session_router)
app.include_router(agent_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "navispark-ps03-api"}


@app.get("/")
async def root():
    return {"message": "NAVISPARK PS03 API is running. Visit /docs for API documentation."}
