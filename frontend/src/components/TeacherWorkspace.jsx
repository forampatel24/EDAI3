import { useEffect, useState } from 'react'
import api from '../api'

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
  const [editText, setEditText] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [msg, setMsg] = useState('')

  const saveToNotes = async () => {
    if (!result || result.abstained) return
    try {
      const parsed = JSON.parse(editText)
      await api.post('/notes', {
        title: editTitle || result.title, collection_id: result.collection_id,
        source_type: 'workspace', source_ref_id: result.id,
        content: parsed, meta: { kind: result.kind, evidence: result.evidence_status },
      })
      setMsg('Saved to notes!')
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
  }

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
      setEditText(JSON.stringify(res.data.content, null, 2))
      setEditTitle(res.data.title)
      load()
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  const selectItem = (it) => {
    setResult(it)
    setEditText(JSON.stringify(it.content, null, 2))
    setEditTitle(it.title)
  }

  const saveEdit = async () => {
    if (!result) return
    try {
      const parsed = JSON.parse(editText)
      const res = await api.put(`/workspace/${result.id}`, { title: editTitle, content: parsed })
      setResult(res.data); setMsg('Saved!'); load()
    } catch (e) { setError(e.response?.data?.detail || e.message) }
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
    <div style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>📝 Teacher Workspace — Lessons & Assessments</h3>
      <p style={{ fontSize: 13, color: '#666' }}>Pick a template or write a custom query. Generation is evidence-gated from your collection. Edit before saving; publish to classroom arrives in Phase 3.</p>
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
      <textarea placeholder="Extra instructions or fully custom query (optional)" value={custom} onChange={e => setCustom(e.target.value)} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={generate} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>{loading ? 'Generating...' : 'Generate (Evidence-Gated)'}</button>
      </div>
      {error && <div style={{ marginTop: 10, color: 'red', background: '#ffebee', padding: 8, borderRadius: 6 }}>{error}</div>}
      {msg && <div style={{ marginTop: 10, background: '#e8f5e9', padding: 8, borderRadius: 6, fontSize: 13 }}>{msg}</div>}

      {result && (
        <div style={{ marginTop: 12, border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
          {result.abstained
            ? <div style={{ background: '#e3f2fd', padding: 10, borderRadius: 6, border: '1px solid #64b5f6' }}>🛑 {result.warning || 'Insufficient evidence — abstained.'}</div>
            : <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <b>{result.kind}</b>
                <span style={{ fontSize: 12, color: '#666' }}>Evidence: {result.evidence_status}{result.evidence_score != null ? ` (${result.evidence_score.toFixed(2)})` : ''}{result.repair_used ? ' • repaired' : ''}</span>
                <span style={{ fontSize: 12, background: result.status === 'ready' ? '#e8f5e9' : '#f5f5f5', padding: '2px 8px', borderRadius: 10 }}>{result.status}</span>
              </div>
              {result.warning && <div style={{ background: '#fff3e0', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 13 }}>⚠️ {result.warning}</div>}
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={14} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={saveEdit} style={btn}>Save Edits</button>
                <button onClick={saveToNotes} style={{ ...btn, background: '#2e7d32' }}>📌 Save to Notes</button>
                <button onClick={publish} style={{ ...btn, background: '#6a1b9a' }}>Mark Ready (Publish in Classroom ↓)</button>
              </div>
            </>}
        </div>
      )}

      <h4>My Workspace Items ({items.length})</h4>
      {items.length === 0 ? <div style={{ color: '#999', fontSize: 13 }}>Nothing saved yet. Generate above.</div> :
        items.map(it => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, border: '1px solid #eee', borderRadius: 6, marginBottom: 6 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => selectItem(it)}>
              <b>{it.title}</b> <span style={{ fontSize: 12, color: '#666' }}>({it.kind} • {it.collection_name} • {it.status}{it.abstained ? ' • abstained' : ''})</span>
            </div>
            <button onClick={() => delItem(it.id)} style={{ background: '#ffcdd2', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
          </div>
        ))}
    </div>
  )
}
const inp = { padding: 8, borderRadius: 6, border: '1px solid #ccc' }
const btn = { background: '#1a237e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }
