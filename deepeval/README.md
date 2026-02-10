# DeepEval demo — local guide

This file documents the small local evaluation/demo service bundled under `deepeval/` and how the frontend/backend integrate with it.

Summary
- The frontend prefers a direct eval URL when `VITE_DEEPEVAL_URL` is set. Otherwise it falls back to the backend proxy endpoint `/api/deepeval/eval-only`.
- Two demo options are provided in this repo:
  - Node demo (richer behavior) under `deepeval/src` (recommended).
  - Python stub `deepeval/deepeval_server.py` (minimal; useful for quick pip installs).

Typical endpoints
- `GET /api/health` — simple health check (responds `{ "ok": true }`).
- `POST /api/eval-only` — evaluate one or more items with requested metrics.

Request shape (example)

```json
{
  "metrics": ["answer_relevancy", "faithfulness", "hallucination"],
  "items": [
    {
      "id": "tc-1",
      "input": "User story: ...",
      "prediction": "Model output here",
      "reference": "Expected output (optional)"
    }
  ],
  "context": [
    "Story description or other source passages used as context for hallucination checks"
  ]
}
```

Response shape (example)

```json
{
  "ok": true,
  "results": {
    "tc-1": {
      "answer_relevancy": { "score": 0.87, "explanation": "Covers key acceptance criteria." },
      "faithfulness": { "score": 0.92 },
      "hallucination": { "score": 0.0, "evidence": [] }
    }
  }
}
```

Run the demos

1) Node demo (recommended):

```bash
cd deepeval
npm install
npm run dev
```

Default ports (convention used by the demo in this repo)
- Node demo: `http://localhost:3001`
- Python stub: `http://localhost:3002`
- Backend proxy: `http://localhost:8080` (backend dev server)
- Frontend (Vite): `http://localhost:5173`

Curl examples

- Health check (GET):

```bash
curl http://localhost:3001/api/health
```

- Eval request (POST) — example using the Node demo or direct `VITE_DEEPEVAL_URL`:

```bash
curl -X POST http://localhost:3001/api/eval-only \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["answer_relevancy","faithfulness","hallucination"],
    "items": [
      {"id":"tc-1","input":"User story: ...","prediction":"Model output here","reference":"Expected output"}
    ],
    "context":["Story description or acceptance criteria here"]
  }'
```

Note: if you use the backend proxy, point the curl to `http://localhost:8080/api/deepeval/eval-only` instead.

2) Python stub (minimal):

```bash
cd deepeval
pip install -r requirements.txt
python deepeval_server.py
```

Using the demo with the app

- Backend proxy: start the backend and it will mount demo routes under `/api/deepeval` if available. Then start the frontend normally; it will call the proxy when `VITE_DEEPEVAL_URL` is not set.
- Direct frontend calls: set `VITE_DEEPEVAL_URL` in `frontend/.env` to point at the demo service URL (for example `http://localhost:3001/api/eval-only`).

Environment variables
- `VITE_DEEPEVAL_URL` — optional; if set, the frontend calls this URL for evaluation requests.
- `DEEPEVAL_URL` — (optional) used by backend proxy configs to forward requests.

Troubleshooting
- If you see CORS or network errors in the browser, check whether the frontend is calling the direct URL or the backend proxy (use browser devtools network tab).
- If `pip install -r requirements.txt` fails, ensure `requirements.txt` exists in `deepeval/` (the repo includes a minimal file for the stub).

Want more?
- I can add port numbers, example curl commands, or a small Postman collection. Tell me which you'd prefer.
