import { useEffect, useState } from 'react'
import api from '../api'
import MathText from './MathText'

export default function StudentAdaptive({ collections }) {
  const [overview, setOverview] = useState(null)
  const [concept, setConcept] = useState('')
  const [customConcept, setCustomConcept] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [difficulty, setDifficulty] = useState('auto')
  const [practice, setPractice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const res = await api.get('/adaptive/overview')
      setOverview(res.data)
    } catch { /* no attempts yet */ }
  }
  useEffect(() => { load() }, [])

  const genPractice = async () => {
    const c = concept === '__custom' ? customConcept : concept
    if (!collectionId) return setError('Select a collection')
    if (!c.trim()) return setError('Select or type a concept')
    setLoading(true); setError(null); setPractice(null)
    try {
      const res = await api.post('/adaptive/practice', {
        collection_id: parseInt(collectionId), concept: c, difficulty,
      })
      setPractice(res.data)
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="card section-card">
      <h3>Adaptive learning — practice what you need</h3>
      {!overview || overview.total_attempts === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Attempt a classroom quiz first — your performance here will drive personalized practice.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--blue-soft)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
              Accuracy: {(overview.overall_accuracy * 100).toFixed(0)}% over {overview.total_attempts} answers
            </span>
            <span style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-border)', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>
              Suggested difficulty: {overview.suggested_difficulty}
            </span>
          </div>
          {overview.concepts.map(c => (
            <div key={c.concept} style={{ padding: 8, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6, background: c.possible_misconception ? 'var(--yellow-soft)' : 'var(--paper)' }}>
              <b>{c.concept}</b>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}> • {c.correct}/{c.attempts} ({(c.accuracy * 100).toFixed(0)}%)</span>
              {c.possible_misconception && <span style={{ fontSize: 12, color: 'var(--yellow-ink)' }}> • ⚠️ possible misconception — practice recommended</span>}
            </div>
          ))}
        </>
      )}

      <h4>Follow-up Practice (grounded in your collection)</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <select value={collectionId} onChange={e => setCollectionId(e.target.value)} style={{ ...inp, flex: 1 }}>
          <option value="">Select Collection</option>
          {(collections || []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>)}
        </select>
        <select value={concept} onChange={e => setConcept(e.target.value)} style={{ ...inp, flex: 1 }}>
          <option value="">Select concept</option>
          {(overview?.concepts || []).map(c => <option key={c.concept} value={c.concept}>{c.concept} ({(c.accuracy * 100).toFixed(0)}%)</option>)}
          <option value="__custom">Type my own…</option>
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inp}>
          <option value="auto">Auto (from my performance)</option>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      {concept === '__custom' && (
        <input placeholder="Type concept e.g., Kinetic Energy" value={customConcept} onChange={e => setCustomConcept(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
      )}
      <button onClick={genPractice} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>{loading ? 'Generating...' : 'Generate Practice'}</button>
      {error && <div style={{ marginTop: 8, color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 10 }}>{error}</div>}
      {practice && (
        <div style={{ marginTop: 12 }}>
          {practice.abstained
            ? <div style={{ background: 'var(--blue-soft)', padding: 10, borderRadius: 6 }}>🛑 {practice.warning}</div>
            : <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Difficulty: {practice.difficulty} • Evidence: {practice.evidence_score?.toFixed(2)}</div>
              {practice.questions.map((q, i) => (
                <div key={i} style={{ background: 'var(--paper)', padding: 10, borderRadius: 6, marginBottom: 6, border: '1px solid var(--line)' }}>
                  <MathText as="div" style={{ fontWeight: 600 }}>{'Q' + (i + 1) + ': ' + q.question}</MathText>
                  {q.options?.length > 0 && <ul>{q.options.map((o, j) => <li key={j} style={{ fontSize: 13 }}><MathText as="span">{o}</MathText></li>)}</ul>}
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>Answer: <MathText as="span">{q.answer}</MathText></div>
                </div>
              ))}
            </>}
        </div>
      )}
    </div>
  )
}
const inp = {}
const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }
