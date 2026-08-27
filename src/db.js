import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { join } from 'node:path';
const { Pool } = pg;

// PostgreSQL is required for production. PGlite makes local development usable without Docker.
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined })
  : new PGlite(join(process.cwd(), 'data', 'pglite'));

export async function migrate() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, age_group TEXT NOT NULL CHECK(age_group IN ('under_13','13_15','16_17','18_plus')), consent_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sessions (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, platform TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ, duration_seconds INTEGER)`,
    `CREATE TABLE IF NOT EXISTS content_events (id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, platform TEXT NOT NULL, content_identifier TEXT, page_url TEXT, content_hash TEXT NOT NULL, title TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS analysis_results (id UUID PRIMARY KEY, content_event_id UUID NOT NULL REFERENCES content_events(id) ON DELETE CASCADE, category TEXT NOT NULL, risk_level TEXT NOT NULL, confidence NUMERIC(4,3) NOT NULL, explanation TEXT NOT NULL, claim_classification TEXT NOT NULL, evidence_json JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS warnings (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, analysis_result_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL, warning_type TEXT NOT NULL, severity TEXT NOT NULL, message TEXT NOT NULL, shown_at TIMESTAMPTZ NOT NULL DEFAULT now(), dismissed_at TIMESTAMPTZ)`,
    `CREATE INDEX IF NOT EXISTS sessions_user_started_idx ON sessions(user_id, started_at DESC)`,
    `CREATE INDEX IF NOT EXISTS content_events_session_idx ON content_events(session_id, occurred_at DESC)`,
    `CREATE INDEX IF NOT EXISTS warnings_user_shown_idx ON warnings(user_id, shown_at DESC)`
  ];
  for (const sql of statements) await pool.query(sql);
}
