import { useEffect, useState } from 'react'
import api from '../api'
import WorkspaceEditor from './WorkspaceEditor'
import Icon from './Icon'

const KINDS = [
  { value: 'lesson_plan', label: 'Lesson Plan' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'question_paper', label: 'Question Paper' },
  { value: 'activity', label: 'Classroom Activity' },
  { value: 'explanation', label: 'Explanation' },
  { value: 'custom', label: 'Custom Query' },
]

export default function TeacherWorkspace({ myCollections }) {
  const [kind, setKind] = useState('lesson_plan')
  const [collectionId, setCollectionId] = useState('')
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [duration, setDuration] = useState(45)
  const [numQuestions, setNumQuestions] = useState(10)
  const [questionType, setQuestionType] = useState('MCQ')
  const [objectives, setObjectives] = useState('')
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/workspace')
      setItems(res.data)
    } catch { /* teacher-only route; ignore when unauthorized */ }
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (!collectionId) return setError('Select a collection')
    if (!topic.trim()) return setError('Enter a topic')
    setLoading(true); setError(null); setResult(null); setMsg('')
    try {
      const res = await api.post('/workspace/generate', {
        collection_id: parseInt(collectionId), kind, topic,
        title: title || undefined, difficulty,
        duration_minutes: kind === 'lesson_plan' || kind === 'activity' ? parseInt(duration) : undefined,
        num_questions: kind === 'quiz' || kind === 'question_paper' ? parseInt(numQuestions) : undefined,
        question_type: kind === 'quiz' || kind === 'question_paper' ? questionType : undefined,
        objectives: objectives || undefined,
        custom_instructions: custom || undefined,
      })
      setResult(res.data)
      load()
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const selectItem = (it) => {
    setResult(it)
    setMsg('')
  }

  const saveEdits = async ({ title: newTitle, content }) => {
    if (!result) return
    setSaving(true); setError(null); setMsg('')
    try {
      const res = await api.put(`/workspace/${result.id}`, { title: newTitle, content })
      setResult(res.data); setMsg('Saved!'); load()
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  const saveToNotes = async ({ title: noteTitle, content }) => {
    if (!result || result.abstained) return
    setSaving(true); setError(null); setMsg('')
    try {
      await api.post('/notes', {
        title: noteTitle || result.title, collection_id: result.collection_id,
        source_type: 'workspace', source_ref_id: result.id,
        content, meta: { kind: result.kind, evidence: result.evidence_status },
      })
      setMsg('Saved to notes!')
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  const delItem = async (id) => {
    if (!confirm('Delete this workspace item?')) return
    await api.delete(`/workspace/${id}`)
    if (result?.id === id) setResult(null)
    load()
  }

  const publish = async () => {
    if (!result) return
    const res = await api.post(`/workspace/${result.id}/publish`)
    setMsg(res.data.detail); load()
  }

  return (
    <div className="card section-card">
      <h3>Lessons & assessments</h3>
      <p className="card-sub">Pick a template or write a custom query. Generation is evidence-gated from your collection. Edit before saving, then publish to a classroom.</p>

      {/* Split Dashboard */}
      <div className="bento-grid-2" style={{ marginBottom: 20 }}>
        {/* Left Panel - Generator */}
        <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
            <label className="field w-170">
              <span className="field-label">Template</span>
              <select value={kind} onChange={e => setKind(e.target.value)}>
                {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Collection</span>
              <select value={collectionId} onChange={e => setCollectionId(e.target.value)}>
                <option value="">Select collection</option>
                {(myCollections || []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>)}
              </select>
            </label>
            <label className="field w-130">
              <span className="field-label">Difficulty</span>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </label>
          </div>

          <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field-label">Topic (required)</span>
              <input placeholder="e.g., Newton's laws of motion" value={topic} onChange={e => setTopic(e.target.value)} />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field-label">Title (optional)</span>
              <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            </label>
          </div>

          {(kind === 'lesson_plan' || kind === 'activity') && (
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
              <label className="field w-130">
                <span className="field-label">Duration (min)</span>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                <span className="field-label">Learning objectives (optional)</span>
                <input placeholder="What should students learn?" value={objectives} onChange={e => setObjectives(e.target.value)} />
              </label>
            </div>
          )}

          {(kind === 'quiz' || kind === 'question_paper') && (
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
              <label className="field w-130">
                <span className="field-label">Questions</span>
                <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} />
              </label>
              <label className="field w-130">
                <span className="field-label">Question type</span>
                <select value={questionType} onChange={e => setQuestionType(e.target.value)}>
                  <option value="MCQ">MCQ</option><option value="descriptive">Descriptive</option><option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                <span className="field-label">Objectives (optional)</span>
                <input placeholder="Objectives" value={objectives} onChange={e => setObjectives(e.target.value)} />
              </label>
            </div>
          )}

          <label className="field" style={{ marginBottom: 10 }}>
            <span className="field-label">Extra instructions or fully custom query</span>
            <textarea placeholder="Optional — e.g., focus on real-world applications" value={custom} onChange={e => setCustom(e.target.value)} rows={2} />
          </label>

          <button onClick={generate} disabled={loading} className="btn btn-primary btn-block">
            {loading ? <><span className="spin" aria-hidden="true" /> Generating…</> : <><Icon name="sparkles" /> Generate (evidence-gated)</>}
          </button>

          {error && <div className="banner banner-bad" style={{ marginTop: 12 }}><Icon name="alert" /><span>{error}</span></div>}
          {msg && <div className="banner banner-ok" style={{ marginTop: 12 }}><Icon name="check" /><span>{msg}</span></div>}
        </div>

        {/* Right Panel - Result Preview */}
        <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          {result && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {result.abstained ? (
                <div className="banner banner-info"><Icon name="shield" /><span>{result.warning || 'Insufficient evidence — abstained.'}</span></div>
              ) : (
                <>
                  <div className="ground-pills" style={{ marginBottom: 10 }}>
                    <span className="pill pill-info"><Icon name="file" />{labelForKind(result.kind)}</span>
                    <span className={`pill ${result.evidence_status === 'sufficient' ? 'pill-ok' : 'pill-warn'}`}>
                      <Icon name="target" />Evidence: {result.evidence_status}{result.evidence_score != null ? ` (${result.evidence_score.toFixed(2)})` : ''}
                    </span>
                    {result.repair_used && <span className="pill pill-info"><Icon name="wrench" />Repaired</span>}
                    <span className={`pill ${result.status === 'ready' ? 'pill-ok' : 'pill-muted'}`}>{result.status}</span>
                  </div>
                  {result.warning && <div className="banner banner-warn"><Icon name="alert" /><span>{result.warning}</span></div>}
                  <WorkspaceEditor
                    key={result.id}
                    item={result}
                    saving={saving}
                    onSave={saveEdits}
                    onSaveToNotes={saveToNotes}
                    onPublish={publish}
                  />
                </>
              )}
            </div>
          )}

          {!result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', color: 'var(--muted)', gap: 12 }}>
              <Icon name="folder" size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 15 }}>Generate a lesson or quiz to see the editable preview here.</p>
              <p style={{ fontSize: 13, maxWidth: 280 }}>Edit content, save changes, and publish directly to your classroom.</p>
            </div>
          )}
        </div>
      </div>

      <h4 style={{ marginTop: 20 }}>My workspace items ({items.length})</h4>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico"><Icon name="folder" /></div>
          <div className="empty-title">Nothing saved yet</div>
          <div className="empty-text">Generate a lesson or quiz above to build your workspace.</div>
        </div>
      ) : (
        items.map(it => (
          <div key={it.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => selectItem(it)}>
              <b>{it.title}</b>
              <div className="meta-line">
                {labelForKind(it.kind)} <span className="dot">·</span> {it.collection_name} <span className="dot">·</span> {it.status}
                {it.abstained && <> <span className="dot">·</span> abstained</>}
              </div>
            </div>
            <button onClick={() => delItem(it.id)} className="btn-tiny btn-danger" style={{ flexShrink: 0 }}>Delete</button>
          </div>
        ))
      )}
    </div>
  )
}

function labelForKind(kind) {
  const found = KINDS.find(k => k.value === kind)
  return found ? found.label : kind
}