import { GenerateRequest, GenerateResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraIssue(issueKey: string): Promise<{ key: string; summary: string; description: string; acceptanceCriteria?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/${encodeURIComponent(issueKey)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira issue:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraProjects(): Promise<Array<{ key: string; name: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/projects`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira projects:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraIssues(projectKey: string): Promise<Array<{ key: string; summary: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/projects/${encodeURIComponent(projectKey)}/issues`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira issues:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function evaluateWithDeepEval(payload: { query?: string; output?: string; context?: string[]; metric?: string }) {
  try {
    // If developer provided a direct deepeval URL, use it. Otherwise fall back to backend proxy (removed by default).
    const DEEPEVAL_URL = import.meta.env.VITE_DEEPEVAL_URL || ''
    const target = DEEPEVAL_URL ? `${DEEPEVAL_URL}/eval` : `${API_BASE_URL}/deepeval/eval-only`
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error calling DeepEval eval endpoint:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}