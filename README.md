# User Story → Tests — Quick Setup

A short README to help others get this project running locally.

**Contents**
- Prerequisites
- Quick install
- Configuration (.env)
- Run (dev & build)
- Useful commands
- Notes

---

**Prerequisites**
- Node.js (v16+ recommended)
- npm (v8+)

**Quick install**
1. Clone the repository:

```bash
git clone <repo-url>
cd user-story-to-tests
```

2. Install dependencies for both workspaces (from repo root):

```bash
npm install
# or install per workspace:
# cd backend && npm install
# cd ../frontend && npm install
```

**Configuration (.env)**
Create a `.env` file in the repo root (do NOT commit it). Minimal example:

```env
PORT=8080
CORS_ORIGIN=http://localhost:5173

# Groq LLM (required for test generation)
groq_API_BASE=https://api.groq.com/openai/v1
groq_API_KEY=your_groq_api_key
groq_MODEL=openai/gpt-oss-120b

# (Optional) Jira integration
JIRA_BASE=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
```

Make sure values are correct before starting the server.

**Run (development)**
- Start backend only:

```bash
cd backend
npm run dev
```

- Start frontend only:

```bash
cd frontend
npm run dev
```

- Run both (if root `package.json` has a dev script):

```bash
npm run dev
```

Default URLs:
- Backend API: http://localhost:8080/api
- Frontend UI: http://localhost:5173

**Common endpoints**
- Health: `GET /api/health`
- Generate tests: `POST /api/generate-tests`
- Jira (if configured): `GET /api/jira/projects` and `GET /api/jira/:issueKey`

**DeepEval (evaluation) integration (removed)**
The built-in DeepEval demo has been removed from this repository. If you still want to run evaluation locally, reintroduce your own evaluation service and configure `DEEPEVAL_URL` accordingly.

Notes
- The hallucination metric requires a `context` list (source passages) to check outputs against; ensure the story description/acceptance criteria are populated before running hallucination.

**Download CSV**
The UI provides a "Download CSV" action after generating test cases.

**Build / Production**
- Build frontend:

```bash
cd frontend
npm run build
```

- Build backend (if applicable): follow your usual TypeScript build script in `backend/package.json`.

**Useful commands**
- Type-check:

```bash
npm run typecheck
```

- Lint / format: check the `package.json` scripts in each workspace.

**Troubleshooting**
- If Jira endpoints fail with authentication errors, re-check `JIRA_EMAIL` and `JIRA_API_TOKEN`.
- If CORS issues occur, verify `CORS_ORIGIN` in `.env` matches the frontend URL.
- Inspect backend logs; server prints the `.env` path when starting.

**Notes**
- Keep `.env` private and out of source control.
- This README intentionally focuses on setup and running steps only.

---

Happy testing!

---
**DeepEval quick links**

- Local guide: `deepeval/README.md` — run steps, endpoints, and curl examples.
- Postman collection: `deepeval/postman_collection.json` (Health + Eval example).
- Recommended demo ports: Node demo `http://localhost:3001`, Python stub `http://localhost:3002`, backend `http://localhost:8080`, frontend `http://localhost:5173`.

Start the Node demo first (recommended), then start the backend and frontend.

## DeepEval demo (current)

This repository includes a small local demo and proxy integration for running evaluation (DeepEval-style) locally. The frontend will prefer a direct eval service when `VITE_DEEPEVAL_URL` is set, otherwise it calls the backend proxy at `/api/deepeval/eval-only`.

- Use the direct option (`VITE_DEEPEVAL_URL`) if you have a remote eval service to call directly from the browser.
- Use the backend proxy when you want the backend to forward evaluation requests to a local demo service mounted under the backend.

Files/locations of interest:
- `deepeval/` — demo services (Node demo under `deepeval/src` and a small Python stub `deepeval/deepeval_server.py`).
- `backend/src/server.ts` — mounts the demo routes under `/api/deepeval` when present.
- `frontend/src/api.ts` — `evaluateWithDeepEval()` prefers `VITE_DEEPEVAL_URL`, falling back to `/api/deepeval/eval-only`.

Quick run instructions (local demo):

1) Node-based demo (recommended for the richer local behavior)

```bash
cd deepeval
npm install
npm run dev
```

The Node demo will listen on its configured port and the backend can be configured to proxy to it or you can point the frontend directly via `VITE_DEEPEVAL_URL`.

2) Python stub (minimal; convenient for quick pip installs)

```bash
cd deepeval
pip install -r requirements.txt
python deepeval_server.py
```

3) Start backend (proxy):

```bash
cd backend
npm run dev
```

4) Start frontend (with direct eval override):

Edit `frontend/.env` (or root `.env`) to add:

```
VITE_DEEPEVAL_URL=http://localhost:3001/api/eval-only  # example
```

Then run:

```bash
cd frontend
npm run dev
```

Environment variables to check (summary):
- `VITE_DEEPEVAL_URL` — optional; when present, frontend calls this URL for evaluation.
- `DEEPEVAL_URL` — used by backend proxy configuration if applicable.
- `JIRA_BASE`, `JIRA_EMAIL`, `JIRA_API_TOKEN` — only required if using Jira features.

Troubleshooting
- If the frontend fails to evaluate and shows network errors, confirm whether it's using the direct URL or the backend proxy (browser devtools will show which URL is called).
- If you run the Python stub and `pip install -r requirements.txt` previously failed, ensure `requirements.txt` is present in `deepeval/` (it is included with the stub).

If you'd like, I can also add a short `deepeval/README.md` with exact ports and example payloads for the demo service.
