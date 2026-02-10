import { Router } from 'express'
import { evaluateMetric } from '../services/evalService'

const router = Router()

router.post('/eval-only', async (req, res) => {
  const { query, output, context, metric } = req.body || {}
  const metrics = Array.isArray(metric) ? metric : (metric ? [metric] : ['answer_relevancy'])
  const result: Record<string, any> = {}
  for (const m of metrics) {
    result[m] = evaluateMetric(m, query, output, context)
  }
  // Return in shape { evaluation: { metric: {...} } } for multi-metric, or evaluation for single
  if (metrics.length === 1) return res.json({ evaluation: result[metrics[0]] })
  return res.json({ evaluation: result })
})

// simple health
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'deepeval-demo' }))

export default router
