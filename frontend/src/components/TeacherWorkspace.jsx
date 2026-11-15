import { useEffect, useState } from 'react'
import api from '../api'
import WorkspaceEditor from './WorkspaceEditor'

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
      <h3>Lessons &amp; assessments</h3>
      <p className="card-sub">Pick a template or write a custom query. Generation is evidence-gated from your collection. Edit before saving; publish to classroom arrives in Phase 3.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={kind} onChange={e => setKind(e.target.value)} style={inp}>
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select value={collectionId} onChange={e => setCollectionId(e.target.value)} style={{ ...inp, flex: 1 }}>
          <option value="">Select Collection</option>
          {(myCollections || []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>)}
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inp}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input placeholder="Topic (required)" value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inp, flex: 2 }} />
        <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inp, flex: 1 }} />
      </div>
      {(kind === 'lesson_plan' || kind === 'activity') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="number" placeholder="Duration (min)" value={duration} onChange={e => setDuration(e.target.value)} style={inp} />
          <input placeholder="Learning objectives (optional)" value={objectives} onChange={e => setObjectives(e.target.value)} style={{ ...inp, flex: 1 }} />
        </div>
      )}
      {(kind === 'quiz' || kind === 'question_paper') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="number" placeholder="No. of questions" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} style={inp} />
          <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={inp}>
            <option value="MCQ">MCQ</option><option value="descriptive">Descriptive</option><option value="mixed">Mixed</option>
          </select>
          <input placeholder="Objectives (optional)" value={objectives} onChange={e => setObjectives(e.target.value)} style={{ ...inp, flex: 1 }} />
        </div>
      )}
      <textarea placeholder="Extra instructions or fully custom query (optional)" value={custom} onChange={e => setCustom(e.target.value)} rows={2} style={{ width: '100%' }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={generate} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>{loading ? 'Generating...' : 'Generate (Evidence-Gated)'}</button>
      </div>
      {error && <div style={{ marginTop: 10, color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 6 }}>{error}</div>}
      {msg && <div style={{ marginTop: 10, background: 'var(--mint)', padding: 8, borderRadius: 6, fontSize: 13 }}>{msg}</div>}

      {result && (
        <div style={{ marginTop: 14, border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--paper)' }}>
          {result.abstained
            ? <div style={{ background: 'var(--blue-soft)', padding: 10, borderRadius: 6, border: '1px solid var(--blue-border)' }}>🛑 {result.warning || 'Insufficient evidence — abstained.'}</div>
            : <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <b>{result.kind}</b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Evidence: {result.evidence_status}{result.evidence_score != null ? ` (${result.evidence_score.toFixed(2)})` : ''}{result.repair_used ? ' • repaired' : ''}</span>
                <span style={{ fontSize: 12, background: result.status === 'ready' ? 'var(--mint)' : 'var(--card)', padding: '2px 8px', borderRadius: 10 }}>{result.status}</span>
              </div>
              {result.warning && <div style={{ background: 'var(--yellow-soft)', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 13 }}>⚠️ {result.warning}</div>}
              <WorkspaceEditor
                key={result.id}
                item={result}
                saving={saving}
                onSave={saveEdits}
                onSaveToNotes={saveToNotes}
                onPublish={publish}
              />
            </>}
        </div>
      )}

      <h4>My Workspace Items ({items.length})</h4>
      {items.length === 0 ? <div style={{ color: 'var(--faint)', fontSize: 13 }}>Nothing saved yet. Generate above.</div> :
        items.map(it => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => selectItem(it)}>
              <b>{it.title}</b> <span style={{ fontSize: 12, color: 'var(--muted)' }}>({it.kind} • {it.collection_name} • {it.status}{it.abstained ? ' • abstained' : ''})</span>
            </div>
            <button onClick={() => delItem(it.id)} style={{ background: 'var(--pink-soft)', color: 'var(--red)', fontWeight: 600, border: 'none', padding: '4px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12 }}>Delete</button>
          </div>
        ))}
    </div>
  )
}
const inp = {}
const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }
