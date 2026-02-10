#!/usr/bin/env python3
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union
import uvicorn

class EvalRequest(BaseModel):
    query: Optional[str] = None
    output: Optional[str] = None
    context: Optional[List[str]] = None
    metric: Optional[Union[str, List[str]]] = "answer_relevancy"

app = FastAPI(title="Minimal Deepeval Stub")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]) 


def fake_score(metric: str, query: Optional[str], output: Optional[str], context: Optional[List[str]]):
    # Simple heuristic stub: higher score when output contains query keywords
    q = (query or "").lower()
    o = (output or "").lower()
    ctx = " ".join(context or []).lower()
    score = 0.5
    explanation = "stub evaluation"
    if metric == 'answer_relevancy':
        if q and any(tok for tok in q.split() if tok and tok in o):
            score = 0.95
            explanation = "Answer appears relevant to the query"
        else:
            score = 0.5
            explanation = "Answer may be unrelated"
    elif metric == 'faithfulness':
        # treat faithfulness like presence of context overlap
        if ctx and any(tok for tok in o.split() if tok in ctx):
            score = 0.9
            explanation = "Output matches provided context"
        else:
            score = 0.3
            explanation = "Output not grounded in context"
    elif metric == 'hallucination':
        # lower is better; return value from 0..1 where 0 = no hallucination
        if ctx and any(tok for tok in o.split() if tok in ctx):
            val = 0.0
            explanation = "No obvious hallucination relative to context"
        else:
            val = 0.8
            explanation = "Potential hallucination: no supporting context found"
        return {"value": val, "explanation": explanation}
    else:
        score = 0.5
        explanation = "metric not specifically implemented; returning neutral score"
    return {"score": score, "explanation": explanation}


@app.post('/eval')
async def eval_endpoint(req: EvalRequest):
    metrics = req.metric
    if isinstance(metrics, str):
        metrics = [metrics]
    out: dict = {}
    for m in metrics:
        out[m] = fake_score(m, req.query, req.output, req.context)
    # For backward compatibility return an object with `evaluation` when single metric
    if len(metrics) == 1:
        return {"evaluation": out[metrics[0]]}
    return {"evaluation": out}


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=64625)
