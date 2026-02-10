export type EvalResult = { score?: number; value?: number; explanation?: string }

export function evaluateMetric(metric: string, query?: string, output?: string, context?: string[]): EvalResult {
  const q = (query || '').toLowerCase()
  const o = (output || '').toLowerCase()
  const ctx = (context || []).join(' ').toLowerCase()

  if (metric === 'answer_relevancy') {
    const hasQueryToken = q.split(/\s+/).some(tok => tok && o.includes(tok))
    if (hasQueryToken) return { score: 0.95, explanation: 'Answer appears relevant to the query' }
    return { score: 0.5, explanation: 'Answer may be unrelated' }
  }

  if (metric === 'faithfulness') {
    const hasContextOverlap = ctx && o.split(/\s+/).some(tok => tok && ctx.includes(tok))
    if (hasContextOverlap) return { score: 0.9, explanation: 'Output matches provided context' }
    return { score: 0.3, explanation: 'Output not grounded in context' }
  }

  if (metric === 'hallucination') {
    // hallucination returns a value where lower is better
    const hasContextOverlap = ctx && o.split(/\s+/).some(tok => tok && ctx.includes(tok))
    if (hasContextOverlap) return { value: 0.0, explanation: 'No obvious hallucination relative to context' }
    return { value: 0.8, explanation: 'Potential hallucination: no supporting context found' }
  }

  // default neutral
  return { score: 0.5, explanation: 'Neutral / unknown metric' }
}
