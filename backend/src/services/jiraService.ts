import fetch from 'node-fetch'

export interface JiraStory {
  key: string
  summary: string
  description: string
  acceptanceCriteria?: string
}

function renderADF(node: any): string {
  if (!node) return ''
  let out = ''
  if (Array.isArray(node)) {
    node.forEach(n => { out += renderADF(n) })
    return out
  }

  const type = node.type
  if (type === 'text' && node.text) {
    out += node.text
  }

  if (node.content) {
    out += renderADF(node.content)
  }

  if (type === 'paragraph' || type === 'heading') {
    out += '\n\n'
  }

  if (type === 'listItem') {
    out += '\n'
  }

  return out
}

function adfToPlainText(adf: any): string {
  try {
    if (!adf) return ''
    // If it's already a string
    if (typeof adf === 'string') return adf
    // Expecting Atlassian Document Format
    return renderADF(adf).replace(/\n{3,}/g, '\n\n').trim()
  } catch (err) {
    return ''
  }
}

function extractAcceptanceCriteria(text: string): string | undefined {
  if (!text) return undefined
  // Look for a section titled Acceptance Criteria (case-insensitive)
  const regex = /(?:Acceptance Criteria|Acceptance criteria|AC(?:[:\s]))\s*[:\-]?\s*\n([\s\S]*?)(?:\n\s*\n|$)/i
  const m = text.match(regex)
  if (m && m[1]) {
    return m[1].trim()
  }

  // Fallback: look for lines starting with AC: or - AC -
  const lines = text.split('\n')
  const acLines = lines.filter(l => /^(AC[:\s\-]|Acceptance Criteria[:\s\-])/i.test(l) || /^-\s*AC\b/i.test(l))
  if (acLines.length) return acLines.join('\n').trim()

  return undefined
}

export async function fetchJiraIssue(issueKey: string): Promise<JiraStory> {
  const base = process.env.JIRA_BASE || process.env.JIRA_URL
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!base || !email || !token) {
    throw new Error('JIRA_BASE, JIRA_EMAIL and JIRA_API_TOKEN must be set in environment')
  }

  // Allow configuring a custom field for acceptance criteria via env var JIRA_AC_FIELD
  // If not provided, attempt to discover a field whose name contains "acceptance" by
  // calling the Jira fields metadata endpoint.
  let acField = process.env.JIRA_AC_FIELD
  if (!acField) {
    try {
      const fieldsMetaRes = await fetch(`${base.replace(/\/$/, '')}/rest/api/3/field`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
          Accept: 'application/json'
        }
      })

      if (fieldsMetaRes.ok) {
        const fieldsMeta = await fieldsMetaRes.json() as any[]
        // Find by name containing 'acceptance' (case-insensitive)
        const match = fieldsMeta.find(f => typeof f.name === 'string' && /acceptance/i.test(f.name))
        if (match && match.id) acField = match.id
      }
    } catch (err) {
      // Non-fatal: if discovery fails, we'll fallback to parsing the description
      console.warn('Failed to discover acceptance criteria field:', err)
    }
  }
  const fieldsQuery = ['summary', 'description']
  if (acField) fieldsQuery.push(acField)
  const url = `${base.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(fieldsQuery.join(','))}`
  const auth = Buffer.from(`${email}:${token}`).toString('base64')

  try {
    console.log('Jira: fetching issue from URL:', url)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json'
      }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`Jira API error ${res.status}: ${text || res.statusText}`)
      ;(err as any).status = res.status
      throw err
    }

    const data = await res.json() as any
    const fields = data.fields || {}

    // Description may be Atlassian Document Format (ADF) or plain string
    const rawDescription = fields.description
    const description = adfToPlainText(rawDescription)

    // Try to read acceptance criteria from a configured custom field first
    let acceptanceCriteria: string | undefined
    if (acField && fields[acField]) {
      const rawAc = fields[acField]
      if (typeof rawAc === 'string') acceptanceCriteria = rawAc.trim()
      else acceptanceCriteria = adfToPlainText(rawAc)
    }

    // Fallback: try to extract from description text
    if (!acceptanceCriteria) {
      acceptanceCriteria = extractAcceptanceCriteria(description)
    }

    // If still not found, scan other fields for likely acceptance-criteria content
    if (!acceptanceCriteria) {
      for (const [key, value] of Object.entries(fields)) {
        if (key === 'summary' || key === 'description') continue
        if (value == null) continue

        let textVal = ''
        if (typeof value === 'string') textVal = value
        else if (Array.isArray(value)) textVal = value.map(v => (typeof v === 'string' ? v : adfToPlainText(v))).join('\n')
        else textVal = adfToPlainText(value)

        const extracted = extractAcceptanceCriteria(textVal)
        if (extracted) {
          acceptanceCriteria = extracted
          break
        }
      }
    }

    // Final fallback: use the description text so generator has something in the required field
    if (!acceptanceCriteria) acceptanceCriteria = description || ''

    return {
      key: data.key,
      summary: fields.summary || '',
      description,
      acceptanceCriteria
    }
  } catch (err: any) {
    console.error('Failed to fetch Jira issue. Base URL:', base, 'Issue:', issueKey)
    console.error('Error detail:', err && err.message ? err.message : err)
    throw new Error(`Failed to reach Jira at ${base}: ${err && err.message ? err.message : String(err)}`)
  }
}

export async function fetchJiraProjects(): Promise<Array<{ key: string; name: string }>> {
  const base = process.env.JIRA_BASE || process.env.JIRA_URL
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!base || !email || !token) {
    throw new Error('JIRA_BASE, JIRA_EMAIL and JIRA_API_TOKEN must be set in environment')
  }

  const url = `${base.replace(/\/$/, '')}/rest/api/3/project/search?orderBy=name`
  const auth = Buffer.from(`${email}:${token}`).toString('base64')

  try {
    console.log('Jira: fetching projects from URL:', url)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json'
      }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`Jira API error ${res.status}: ${text || res.statusText}`)
      ;(err as any).status = res.status
      throw err
    }

    const data = await res.json().catch(() => ({})) as any
    const values = Array.isArray(data) ? data : data.values || []
    return values.map((p: any) => ({ key: p.key, name: p.name }))
  } catch (err: any) {
    console.error('Failed to fetch Jira projects. Base URL:', base)
    console.error('Error detail:', err && err.message ? err.message : err)
    throw new Error(`Failed to reach Jira at ${base}: ${err && err.message ? err.message : String(err)}`)
  }
}

export async function fetchJiraIssues(projectKey: string): Promise<Array<{ key: string; summary: string }>> {
  const base = process.env.JIRA_BASE || process.env.JIRA_URL
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!base || !email || !token) {
    throw new Error('JIRA_BASE, JIRA_EMAIL and JIRA_API_TOKEN must be set in environment')
  }

  const jql = `project = ${projectKey} AND issuetype = Story ORDER BY created DESC`
  const url = `${base.replace(/\/$/, '')}/rest/api/3/search/jql`
  const auth = Buffer.from(`${email}:${token}`).toString('base64')

  try {
    console.log('Jira: fetching issues for project via JQL URL:', url)
    const body = {
      jql,
      fields: ['summary'],
      maxResults: 100
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`Jira API error ${res.status}: ${text || res.statusText}`)
      ;(err as any).status = res.status
      throw err
    }

    const data = await res.json() as any
    const issues = data.issues || []
    return issues.map((i: any) => ({ key: i.key, summary: (i.fields && i.fields.summary) || '' }))
  } catch (err: any) {
    console.error('Failed to fetch Jira issues. Base URL:', base, 'Project:', projectKey)
    console.error('Error detail:', err && err.message ? err.message : err)
    throw new Error(`Failed to reach Jira at ${base}: ${err && err.message ? err.message : String(err)}`)
  }
}
