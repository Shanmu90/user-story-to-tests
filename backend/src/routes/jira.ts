import express from 'express'
import { fetchJiraIssue, fetchJiraProjects, fetchJiraIssues } from '../services/jiraService'

export const jiraRouter = express.Router()

jiraRouter.get('/projects', async (req: express.Request, res: express.Response) => {
  try {
    const projects = await fetchJiraProjects()
    res.json(projects)
  } catch (err: any) {
    console.error('Error fetching Jira projects:', err)
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to fetch Jira projects' })
  }
})

jiraRouter.get('/projects/:projectKey/issues', async (req: express.Request, res: express.Response) => {
  const { projectKey } = req.params
  try {
    const issues = await fetchJiraIssues(projectKey)
    res.json(issues)
  } catch (err: any) {
    console.error('Error fetching Jira issues for project:', projectKey, err)
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to fetch Jira issues' })
  }
})

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
