import express from 'express'
import { fetchJiraIssue } from '../services/jiraService'

export const jiraRouter = express.Router()

jiraRouter.get('/:issueKey', async (req: express.Request, res: express.Response) => {
  const { issueKey } = req.params
  try {
    const story = await fetchJiraIssue(issueKey)
    res.json(story)
  } catch (err: any) {
    console.error('Error fetching Jira issue:', err)
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to fetch Jira issue' })
  }
})
