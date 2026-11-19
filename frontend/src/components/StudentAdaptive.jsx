import { useEffect, useState } from 'react'
import api from '../api'
import { InlineText } from './RichText'
import Icon from './Icon'

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

  const getConceptStatus = (accuracy) => {
    if (accuracy >= 0.7) return { level: 'mastered', color: 'mint', label: 'Mastered' }
    if (accuracy >= 0.4) return { level: 'mixed', color: 'amber', label: 'Needs practice' }
    return { level: 'struggling', color: 'pink', label: 'Review needed' }
  }

  return (
    <div className="card section-card">
      <h3>Adaptive learning — practice what you need</h3>
      <p className="card-sub">Targeted practice, grounded in your collection and tuned to how you've performed so far.</p>

      {!overview || overview.total_attempts === 0 ? (
        <div className="empty-state" style={{ marginBottom: 18 }}>
          <div className="empty-ico"><Icon name="target" /></div>
          <div className="empty-title">No attempts yet</div>
          <div className="empty-text">Attempt a classroom quiz first — your performance here will drive personalized practice.</div>
        </div>
      ) : (
        <>
          <div className="ground-pills" style={{ marginBottom: 12 }}>
            <span className="pill pill-info"><Icon name="chart" />Accuracy: {(overview.overall_accuracy * 100).toFixed(0)}% over {overview.total_attempts} answers</span>
            <span className="pill pill-warn"><Icon name="target" />Suggested difficulty: {overview.suggested_difficulty}</span>
          </div>
          {overview.concepts.map((c) => {
            const status = getConceptStatus(c.accuracy)
            return (
              <div key={c.concept} className={`concept-row${status.level === 'mixed' ? ' warn' : status.level === 'struggling' ? ' struggling' : ''}`}>
                <div style={{ flex: 1 }}>
                  <b>{c.concept}</b>
                  <div className="meta-line" style={{ marginTop: 2 }}>
                    {c.correct}/{c.attempts} ({(c.accuracy * 100).toFixed(0)}%)
                    <span className="dot">•</span>
                    <span className={`pill pill-${status.color}`} style={{ fontSize: 11, padding: '2px 8px' }}>{status.label}</span>
                  </div>
                </div>
                {c.possible_misconception && (
                  <span className="pill pill-warn" style={{ flexShrink: 0 }}><Icon name="alert" size={13} />Misconception — practice</span>
                )}
              </div>
            )
          })}
        </>
      )}

      <h4 style={{ marginTop: 20 }}>Follow-up practice</h4>
      <div className="toolbar">
        <label className="field">
          <span className="field-label">Collection</span>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">Select collection</option>
            {(collections || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Concept</span>
          <select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option value="">Select concept</option>
            {(overview?.concepts || []).map((c) => (
              <option key={c.concept} value={c.concept}>{c.concept} ({(c.accuracy * 100).toFixed(0)}%)</option>
            ))}
            <option value="__custom">Type my own…</option>
          </select>
        </label>
        <label className="field w-170">
          <span className="field-label">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="auto">Auto (my performance)</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      {concept === '__custom' && (
        <label className="field" style={{ marginBottom: 12 }}>
          <span className="field-label">Your concept</span>
          <input placeholder="e.g., Kinetic Energy" value={customConcept} onChange={(e) => setCustomConcept(e.target.value)} />
        </label>
      )}
      <button onClick={genPractice} disabled={loading} className="btn btn-primary">
        {loading ? <><span className="spin" aria-hidden="true" /> Generating…</> : <><Icon name="sparkles" /> Generate practice</>}
      </button>

      {error && <div className="banner banner-bad" style={{ marginTop: 12 }}><Icon name="alert" /><span>{error}</span></div>}

      {practice && (
        <div style={{ marginTop: 16 }}>
          {practice.abstained ? (
            <div className="banner banner-info"><Icon name="shield" /><span>{practice.warning}</span></div>
          ) : (
            <>
              <div className="ground-pills" style={{ marginBottom: 12 }}>
                <span className="pill pill-info"><Icon name="target" />Difficulty: {practice.difficulty}</span>
                {practice.evidence_score != null && (
                  <span className="pill pill-muted"><Icon name="chart" />Evidence {practice.evidence_score.toFixed(2)}</span>
                )}
              </div>
              {practice.questions.map((q, i) => (
                <div className="q-item" key={i}>
                  <div className="q-stem">Q{i + 1}. <InlineText>{q.question}</InlineText></div>
                  {q.options?.length > 0 && (
                    <ul className="q-options">
                      {q.options.map((o, j) => <li key={j}><InlineText>{o}</InlineText></li>)}
                    </ul>
                  )}
                  <div className="q-answer">Answer: <InlineText>{q.answer}</InlineText></div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}