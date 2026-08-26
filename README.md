# SafeScroll AI — SIH 2026 prototype

SafeScroll AI is an event-driven social-media safety and digital-wellbeing application built for a Smart India Hackathon demonstration. It runs a real API service with persistent server state and Server-Sent Events (SSE) for live dashboard updates. It uses a clearly labelled `DemoSocialConnector` and synthetic data—not credentials, scraping, or hidden access to a user's accounts.

## What it demonstrates

- A responsive, premium dashboard with calculated screen time, sessions, platform mix, content balance, timeline, risk signals, and wellbeing score.
- Six jury-ready demo profiles: Healthy User, Heavy Scroller, Minor User, News/Political-heavy User, Adult-content-heavy User, and Mixed User.
- A live simulation that posts social events to the API, persists them, broadcasts the update to connected dashboards, and recalculates analytics: **detect → classify → assess risk → age-aware policy → intervention → event log → analytics update**.
- An explainable rule-based AI fallback that labels misinformation as *risk* / *needs verification*, not as definite falsehood.
- Age-aware interventions: minors can trigger a controlled demo-feed cooldown after repeated high-confidence age-restricted exposure; adults receive neutral warnings and wellbeing guidance.
- AI chat, Safety Center, weekly report/export, goals, dark mode, privacy center, and a judge-facing Demo Mode.

## Architecture

```text
DemoSocialConnector / approved future connector
       ↓
Content classifier → risk + explanation
       ↓
SafetyPolicyEngine (age, confidence, repetition, session duration)
       ↓
Intervention / warning / simulated cooldown
       ↓
Persistent JSON store + SSE stream → dashboard / AI assistant / report
```

The service boundaries are deliberately modular: `src/engine.js` holds the classification, policy, scoring, and recommendation services; `src/profiles.js` holds seed profiles; `server.js` exposes the HTTP and streaming API. Production should replace the JSON store with PostgreSQL and use a queue for high-volume connector events.

### API surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Deployment health check. |
| `GET /api/profiles` | Available demo profiles. |
| `GET /api/state?profile=minor` | Server-calculated analytics snapshot. |
| `POST /api/events` | Validated social event ingestion. |
| `PATCH /api/goals` | Persist a daily screen-time goal. |
| `GET /api/stream` | SSE feed of live analytics updates. |

## Run locally

Prerequisite: Node.js 20+.

```bash
npm start
```

Open [http://localhost:4173](http://localhost:4173). No `npm install` is needed; the prototype is dependency-free. State is stored in `data/safescroll.json` and survives restarts. Delete that file to reset seeded demo state.

To use a different port:

```bash
PORT=8080 npm start
```

## Tests

```bash
npm test
```

The included tests cover repeated minor/adult escalation, adult warning behavior, misinformation-risk framing, and score bounds. Add model-evaluation and API tests when integrating real services.

## Demo flow (5–7 minutes)

1. Open **Dashboard** and explain the wellbeing score and calculated signals.
2. Open **Demo Mode** and select **Minor User**.
3. Start **Live AI Simulation**. The first neutral event is allowed.
4. Watch repeated `Adult/18+` events lead from warning to a controlled demo intervention.
5. Continue to the misinformation-risk event; explain that the system asks for verification rather than censoring opinion.
6. Return to the dashboard or Safety Center to show the updated alerts and metrics.
7. Show **Weekly Report**, **Goals**, and **Privacy** to close with wellbeing and responsible-AI design.

## Deployment

```bash
docker build -t safescroll-ai .
docker run --rm -p 4173:4173 -v safescroll-data:/app/data safescroll-ai
```

For hosted deployment, set `HOST=0.0.0.0`, place TLS/reverse-proxying in front of the app, use managed PostgreSQL instead of JSON storage, and put connector OAuth credentials in a secret manager.

## Privacy and security posture

- No platform password collection, scraping, or security bypassing.
- Demo data is synthetic and stored server-side in a local JSON file for this single-node demonstrator.
- Real connectors should use official APIs and explicit consent scopes.
- No medical diagnoses are made. Wording is neutral: overuse/sleep/wellbeing *risk*, not addiction or a behavioral judgment.
- A production build needs authenticated accounts, a server-side database, encrypted records, rate limiting, API validation, retention/deletion jobs, and a monitored ML evaluation pipeline.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Local server port; defaults to `4173`. |

No secrets or third-party API keys are required for the simulation.

## Current limitations / production work

This is a single-node demonstrator, so its classifier is intentionally lightweight and deterministic and the JSON store is appropriate only for local/demo use. It does not connect to Instagram, YouTube, Facebook, or X; those integrations require platform approval, registered OAuth apps, scoped user consent, and compliance with each provider’s developer policy.

Before handling real user data, replace JSON with PostgreSQL, add account authentication/role authorization, encryption at rest, consent/retention records, audit logs, a queue for connector ingestion, rate limiting at the reverse proxy, and independently evaluated multilingual text/image/video models. Keep third-party OAuth tokens server-side and never collect platform passwords.
