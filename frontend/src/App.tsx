import React, { useState } from 'react'
import { generateTests, fetchJiraIssue, fetchJiraProjects, fetchJiraIssues, evaluateWithDeepEval } from './api'
import { GenerateRequest, GenerateResponse } from './types'

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [showJiraPicker, setShowJiraPicker] = useState<boolean>(false)
  const [projects, setProjects] = useState<Array<{ key: string; name: string }>>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [projectIssues, setProjectIssues] = useState<Array<{ key: string; summary: string }>>([])
  const [selectedIssue, setSelectedIssue] = useState<string>('')

  const [currentTab, setCurrentTab] = useState<'generate' | 'evaluate'>('generate')
  const [evalMetrics, setEvalMetrics] = useState<Record<string, Record<string, any>>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['answer_relevancy','faithfulness','hallucination'])
  const [selectedEvalProject, setSelectedEvalProject] = useState<string>('')
  const [selectedEvalIssue, setSelectedEvalIssue] = useState<string>('')
  const [evalContext, setEvalContext] = useState<string>('')

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const resp = await generateTests(formData)
      setResults(resp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const loadJiraProjects = async () => {
    try {
      setIsLoading(true)
      const list = await fetchJiraProjects()
      setProjects(list || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Jira projects')
    } finally {
      setIsLoading(false)
    }
  }

  const loadIssuesForProject = async (projectKey: string) => {
    try {
      setIsLoading(true)
      const issues = await fetchJiraIssues(projectKey)
      setProjectIssues(issues || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Jira issues')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectIssue = async (issueKey: string) => {
    if (!issueKey) return
    setIsLoading(true)
    setError(null)
    try {
      const issue = await fetchJiraIssue(issueKey)
      setFormData(prev => ({
        ...prev,
        storyTitle: issue.summary || prev.storyTitle,
        description: issue.description || prev.description,
        acceptanceCriteria: issue.acceptanceCriteria || prev.acceptanceCriteria
      }))
      setShowJiraPicker(false)
      setSelectedProject('')
      setProjectIssues([])
      setSelectedIssue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Jira issue')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!results) return
    const rows: string[][] = []
    rows.push(['Test Case ID', 'Title', 'Category', 'Expected Result', 'Steps', 'Test Data'])
    results.cases.forEach(tc => {
      const steps = Array.isArray(tc.steps) ? tc.steps.join(' | ') : ''
      rows.push([tc.id, tc.title, tc.category, tc.expectedResult, steps, tc.testData || ''])
    })

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  

  const runEvalForTestCase = async (tc: any) => {
    setIsLoading(true)
    setError(null)
    try {
      await evaluateSingle(tc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DeepEval failed')
    } finally {
      setIsLoading(false)
    }
  }

  const evaluateSingle = async (tc: any, metrics?: string[]) => {
    const output = `${tc.id}: ${tc.title} -> ${tc.expectedResult}`
    const metricsToRun = metrics && metrics.length ? metrics : selectedMetrics.length ? selectedMetrics : ['answer_relevancy']
    const resultsForTc: Record<string, any> = {}
    for (const metric of metricsToRun) {
      const payload: any = { query: formData.storyTitle || undefined, output, metric }
      // include context for hallucination checks
      if (metric === 'hallucination') {
        const ctx: string[] = []
        if (formData.description) ctx.push(formData.description)
        if (formData.acceptanceCriteria) ctx.push(formData.acceptanceCriteria)
        if (formData.additionalInfo) ctx.push(formData.additionalInfo)
        if (selectedEvalIssue) {
          try {
            const issue = await fetchJiraIssue(selectedEvalIssue)
            if (issue.description) ctx.push(issue.description)
            if ((issue as any).acceptanceCriteria) ctx.push((issue as any).acceptanceCriteria)
          } catch (e) {
            // ignore
          }
        }
        if (ctx.length) payload.context = ctx
      }
      const resp = await evaluateWithDeepEval(payload)
      const evaluation = resp.evaluation || resp
      resultsForTc[metric] = evaluation
      setEvalMetrics(prev => ({ ...prev, [tc.id]: { ...(prev[tc.id] || {}), [metric]: evaluation } }))
    }
    return resultsForTc
  }

  const runEvalForSelected = async () => {
    if (!results) return
    const ids = selectedIds.length ? selectedIds : []
    if (ids.length === 0) return
    setIsLoading(true)
    setError(null)
    try {
      for (const id of ids) {
        const tc = results.cases.find((c: any) => c.id === id)
        if (!tc) continue
        await evaluateSingle(tc)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DeepEval failed')
    } finally {
      setIsLoading(false)
    }
  }

  const runEvalForAll = async () => {
    if (!results) return
    setIsLoading(true)
    setError(null)
    try {
      for (const tc of results.cases) {
        await evaluateSingle(tc)
      }
      setSelectedIds(results.cases.map((c: any) => c.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DeepEval failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <style>{`
        * { box-sizing: border-box; margin:0; padding:0 }
        body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f5f5f5; color:#333 }
        .app { display:flex; gap:24px; max-width:1200px; margin:20px auto; }
        .sidebar { width:260px; background:linear-gradient(180deg,#173a8a,#1e40af); color:#fff; padding:24px; border-radius:8px }
        .logo { font-weight:800; font-size:20px; margin-bottom:16px }
        .nav-item { padding:10px 12px; border-radius:8px; cursor:pointer; color:#e6eefc; font-weight:600 }
        .nav-item.active { background: rgba(255,255,255,0.08); color:#fff }
        .main { flex:1 }
        .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px }
        .title { font-size:24px; color:#21334a }
        .form-card, .results-card { background:#fff; border-radius:8px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06); margin-bottom:16px }
        .form-group { margin-bottom:12px }
        .form-label { display:block; font-weight:600; margin-bottom:6px }
        .form-input, .form-textarea, select { width:100%; padding:10px; border:1px solid #e6eefc; border-radius:6px }
        .submit-btn { background:#3498db; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700 }
        .submit-row { display:flex; gap:8px; align-items:center }
        .results-meta { color:#666; font-size:13px }
        .results-table { width:100%; border-collapse:collapse; margin-top:12px }
        .results-table th, .results-table td { padding:12px; border-bottom:1px solid #eef3fb; text-align:left }
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="logo">QA Suite</div>
          <div className={`nav-item ${currentTab === 'generate' ? 'active' : ''}`} onClick={() => setCurrentTab('generate')}>TestCase Generator</div>
          <div style={{ height:8 }} />
          <div className={`nav-item ${currentTab === 'evaluate' ? 'active' : ''}`} onClick={() => setCurrentTab('evaluate')}>Evaluate</div>
        </aside>

        <main className="main">
          <div className="header">
            <div>
              <div className="title">User Story to Tests</div>
              <div style={{ color:'#666', fontSize:13 }}>Generate test cases from user stories</div>
            </div>
          </div>

          {currentTab === 'generate' && (
            <div>
              <div className="form-card">
                <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                  <button className="submit-btn" onClick={() => {
                    setShowJiraPicker(s => { const next = !s; if (next && projects.length === 0) loadJiraProjects(); return next })
                  }}>{showJiraPicker ? 'Close JIRA Picker' : 'Add from JIRA'}</button>
                  {showJiraPicker && (
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <select value={selectedProject} onChange={async (e) => { const pk = e.target.value; setSelectedProject(pk); setSelectedIssue(''); setProjectIssues([]); if (pk) await loadIssuesForProject(pk) }}>
                        <option value="">-- Select Project --</option>
                        {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                      </select>
                      <select value={selectedIssue} onChange={(e) => setSelectedIssue(e.target.value)}>
                        <option value="">-- Select Story --</option>
                        {projectIssues.map(i => <option key={i.key} value={i.key}>{i.summary} ({i.key})</option>)}
                      </select>
                      <button className="submit-btn" onClick={() => selectedIssue && handleSelectIssue(selectedIssue)}>Confirm</button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Story Title *</label>
                    <input className="form-input" value={formData.storyTitle} onChange={(e) => handleInputChange('storyTitle', e.target.value)} placeholder="Enter the user story title..." required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} rows={3} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Acceptance Criteria *</label>
                    <textarea className="form-textarea" value={formData.acceptanceCriteria} onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)} rows={3} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Additional Info</label>
                    <textarea className="form-textarea" value={formData.additionalInfo} onChange={(e) => handleInputChange('additionalInfo', e.target.value)} rows={2} />
                  </div>

                  <div className="submit-row">
                    <button className="submit-btn" type="submit" disabled={isLoading}>{isLoading ? 'Generating...' : 'Generate'}</button>
                  </div>
                </form>
              </div>

              {error && <div style={{ background:'#fee', padding:12, borderRadius:6 }}>{error}</div>}

              {results && (
                <div className="results-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:700 }}>Generated Test Cases</div>
                      <div className="results-meta">{results.cases.length} test case(s) generated{results.model ? ` • Model: ${results.model}` : ''}</div>
                    </div>
                    <div>
                      <button className="submit-btn" onClick={downloadCSV}>Download CSV</button>
                    </div>
                  </div>

                  <table className="results-table">
                    <thead>
                          <tr><th>Test Case ID</th><th>Title</th><th>Category</th><th>Expected Result</th></tr>
                    </thead>
                    <tbody>
                      {results.cases.map(tc => (
                        <tr key={tc.id}>
                          <td>{tc.id}</td>
                          <td>{tc.title}</td>
                          <td>{tc.category}</td>
                          <td>{tc.expectedResult}</td>
                        
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {currentTab === 'evaluate' && (
            <div className="form-card">
              <div style={{ display:'flex', gap:8 }}>
                <button className="submit-btn" onClick={runEvalForSelected} disabled={isLoading || selectedIds.length === 0}>Evaluate Selected</button>
                <button className="submit-btn" onClick={runEvalForAll} disabled={isLoading || !results}>Evaluate All</button>
              </div>

              <div style={{ marginTop:12, display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <label style={{ fontWeight:700 }}>Metrics:</label>
                  <label><input type="checkbox" checked={selectedMetrics.includes('answer_relevancy')} onChange={(e) => {
                    if (e.target.checked) setSelectedMetrics(prev => Array.from(new Set([...prev, 'answer_relevancy'])))
                    else setSelectedMetrics(prev => prev.filter(m => m !== 'answer_relevancy'))
                  }} /> Answer Relevancy</label>
                  <label><input type="checkbox" checked={selectedMetrics.includes('faithfulness')} onChange={(e) => {
                    if (e.target.checked) setSelectedMetrics(prev => Array.from(new Set([...prev, 'faithfulness'])))
                    else setSelectedMetrics(prev => prev.filter(m => m !== 'faithfulness'))
                  }} /> Faithfulness</label>
                  <label><input type="checkbox" checked={selectedMetrics.includes('hallucination')} onChange={(e) => {
                    if (e.target.checked) setSelectedMetrics(prev => Array.from(new Set([...prev, 'hallucination'])))
                    else setSelectedMetrics(prev => prev.filter(m => m !== 'hallucination'))
                  }} /> Hallucination</label>
                </div>

                {/* Jira project/issue picker in Evaluate tab */}
                <div style={{ marginLeft:20, display:'flex', gap:8, alignItems:'center' }}>
                  <label style={{ fontWeight:700 }}>JIRA:</label>
                  <select value={selectedEvalProject} onChange={async (e) => { const pk = e.target.value; setSelectedEvalProject(pk); setSelectedEvalIssue(''); setProjectIssues([]); if (pk) await loadIssuesForProject(pk) }}>
                    <option value="">-- Project --</option>
                    {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                  <select value={selectedEvalIssue} onChange={(e) => setSelectedEvalIssue(e.target.value)}>
                    <option value="">-- Story --</option>
                    {projectIssues.map(i => <option key={i.key} value={i.key}>{i.summary} ({i.key})</option>)}
                  </select>
                  <button className="submit-btn" onClick={async () => {
                    if (!selectedEvalIssue) return
                    try {
                      setIsLoading(true)
                      const issue = await fetchJiraIssue(selectedEvalIssue)
                      const text = `${issue.key}: ${issue.summary}\n${issue.description || ''}`
                      // store as eval context (used for hallucination checks) — do NOT overwrite the model output
                      setEvalContext(text)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to fetch issue')
                    } finally {
                      setIsLoading(false)
                    }
                  }}>Load Story (as context)</button>
                </div>
              </div>
              {evalContext && (
                <div style={{ marginTop:8, background:'#fbfbff', padding:10, borderRadius:6 }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>Loaded story (used as evaluation context)</div>
                  <div style={{ color:'#333', whiteSpace:'pre-wrap' }}>{evalContext}</div>
                  <div style={{ fontSize:12, color:'#666', marginTop:6 }}>Note: this will be used as context for the <strong>hallucination</strong> metric and will not replace the model output you paste above.</div>
                </div>
              )}

              {/* Show generated testcases here with per-testcase evaluation */}
              {results && (
                <div style={{ marginTop:16 }} className="results-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:700 }}>Generated Test Cases</div>
                      <div className="results-meta">{results.cases.length} test case(s) generated{results.model ? ` • Model: ${results.model}` : ''}</div>
                    </div>
                    <div>
                      <button className="submit-btn" onClick={downloadCSV}>Download CSV</button>
                    </div>
                  </div>

                  <table className="results-table">
                    <thead>
                      <tr>
                        <th style={{ width:40 }}><input type="checkbox" onChange={(e) => {
                          if (!e.target.checked) { setSelectedIds([]); return }
                          setSelectedIds(results.cases.map((c: any) => c.id))
                        }} checked={results.cases.length > 0 && selectedIds.length === results.cases.length} /></th>
                        <th>Test Case ID</th><th>Title</th><th>Category</th><th>Expected Result</th><th>Eval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.cases.map((tc: any) => (
                        <tr key={tc.id}>
                          <td>
                            <input type="checkbox" checked={selectedIds.includes(tc.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedIds(prev => [...prev, tc.id])
                              else setSelectedIds(prev => prev.filter(id => id !== tc.id))
                            }} />
                          </td>
                          <td>{tc.id}</td>
                          <td>{tc.title}</td>
                          <td>{tc.category}</td>
                          <td>{tc.expectedResult}</td>
                          <td>
                            {evalMetrics[tc.id] ? (
                              <div>
                                {Object.keys(evalMetrics[tc.id]).map(metric => {
                                  const m = evalMetrics[tc.id][metric]
                                  const score = typeof m?.score !== 'undefined' ? m.score : m?.value ?? JSON.stringify(m)
                                  return (
                                    <div key={metric} style={{ marginBottom:6 }}>
                                      <div style={{ fontWeight:700 }}>{metric}: {String(score)}</div>
                                      {m?.explanation && <div style={{ color:'#666' }}>{m.explanation}</div>}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <button className="submit-btn" onClick={() => runEvalForTestCase(tc)} disabled={isLoading}>Evaluate</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* aggregated eval result removed; per-testcase metrics shown in the table above */}

              {error && <div style={{ marginTop:12, background:'#fee', padding:12, borderRadius:6 }}>{error}</div>}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default App
