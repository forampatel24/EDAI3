import { useEffect, useState } from 'react'
import api from '../api'

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
    <div style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>🎯 Adaptive Learning — Practice What You Need</h3>
      {!overview || overview.total_attempts === 0 ? (
        <p style={{ fontSize: 13, color: '#666' }}>Attempt a classroom quiz first — your performance here will drive personalized practice.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#e8eaf6', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
              Accuracy: {(overview.overall_accuracy * 100).toFixed(0)}% over {overview.total_attempts} answers
            </span>
            <span style={{ background: '#fff9c4', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
              Suggested difficulty: {overview.suggested_difficulty}
            </span>
          </div>
          {overview.concepts.map(c => (
            <div key={c.concept} style={{ padding: 8, border: '1px solid #eee', borderRadius: 6, marginBottom: 6, background: c.possible_misconception ? '#fff3e0' : '#fafafa' }}>
              <b>{c.concept}</b>
              <span style={{ fontSize: 12, color: '#666' }}> • {c.correct}/{c.attempts} ({(c.accuracy * 100).toFixed(0)}%)</span>
              {c.possible_misconception && <span style={{ fontSize: 12, color: '#e65100' }}> • ⚠️ possible misconception — practice recommended</span>}
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
      {error && <div style={{ marginTop: 8, color: 'red', background: '#ffebee', padding: 8, borderRadius: 6 }}>{error}</div>}
      {practice && (
        <div style={{ marginTop: 12 }}>
          {practice.abstained
            ? <div style={{ background: '#e3f2fd', padding: 10, borderRadius: 6 }}>🛑 {practice.warning}</div>
            : <>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Difficulty: {practice.difficulty} • Evidence: {practice.evidence_score?.toFixed(2)}</div>
              {practice.questions.map((q, i) => (
                <div key={i} style={{ background: '#fafafa', padding: 10, borderRadius: 6, marginBottom: 6, border: '1px solid #eee' }}>
                  <b>Q{i + 1}: {q.question}</b>
                  {q.options?.length > 0 && <ul>{q.options.map((o, j) => <li key={j} style={{ fontSize: 13 }}>{o}</li>)}</ul>}
                  <div style={{ fontSize: 12, color: '#2e7d32' }}>Answer: {q.answer}</div>
                </div>
              ))}
            </>}
        </div>
      )}
    </div>
  )
}
const inp = { padding: 8, borderRadius: 6, border: '1px solid #ccc' }
const btn = { background: '#1a237e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }
