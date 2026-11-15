import { useEffect, useState } from 'react'
import api, { API_BASE } from '../api'
import MathText from './MathText'

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function StudentClassroom() {
  const [joined, setJoined] = useState([])
  const [code, setCode] = useState('')
  const [selected, setSelected] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState(null)
  const [subText, setSubText] = useState({})
  const [subFile, setSubFile] = useState({})
  const [mySubs, setMySubs] = useState({})
  const [answers, setAnswers] = useState({})
  const [myAttempts, setMyAttempts] = useState({})
  const [feedback, setFeedback] = useState({})
  // active time-boxed quiz sessions: { [quizId]: { attemptId, endsAt, submitting } }
  const [quizSession, setQuizSession] = useState({})
  const [tick, setTick] = useState(0)

  const viewFeedback = async (aid) => {
    try {
      const res = await api.get(`/adaptive/feedback/${aid}`)
      setFeedback(f => ({ ...f, [aid]: res.data }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const load = async () => {
    try {
      const res = await api.get('/classrooms/joined/list')
      setJoined(res.data)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }
  useEffect(() => { load() }, [])

  // 1-second heartbeat while any quiz countdown is running (also drives auto-submit)
  useEffect(() => {
    const hasTimer = Object.values(quizSession).some(s => s.endsAt)
    if (!hasTimer) return
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [quizSession])

  const remainingFor = (qid) => {
    const s = quizSession[qid]
    if (!s || !s.endsAt) return null
    return Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000))
  }

  // auto-submit when the countdown hits zero
  useEffect(() => {
    if (!tick) return
    Object.entries(quizSession).forEach(([qid, s]) => {
      if (!s.endsAt || s.submitting || Date.now() < s.endsAt) return
      const quiz = quizzes.find(q => String(q.id) === qid)
      if (!quiz) return
      setQuizSession(ss => ({ ...ss, [qid]: { ...ss[qid], submitting: true } }))
      submitQuiz(quiz, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const join = async (e) => {
    e.preventDefault(); setError(null); setMsg('')
    try {
      const res = await api.post('/classrooms/join', { code })
      setCode(''); setMsg(`Joined ${res.data.name}!`); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const select = async (c) => {
    setSelected(c); setError(null); setMsg('')
    // allSettled so one failing call doesn't blank the whole panel
    const [a, q] = await Promise.allSettled([
      api.get(`/classrooms/${c.id}/assignments`),
      api.get(`/classrooms/${c.id}/quizzes`),
    ])
    setAssignments(a.status === 'fulfilled' ? a.value.data : [])
    setQuizzes(q.status === 'fulfilled' ? q.value.data : [])
    const failed = [a, q].filter(r => r.status === 'rejected')
    if (failed.length) setError('Some data failed to load: ' + failed.map(f => f.reason?.response?.data?.detail || f.reason?.message || 'unknown error').join('; '))
  }

  const submitAssignment = async (aid) => {
    const text = subText[aid] || ''
    const file = subFile[aid]
    if (!text.trim() && !file) return setError('Write an answer or attach a file')
    const form = new FormData()
    if (text.trim()) form.append('text', text)
    if (file) form.append('file', file)
    try {
      const res = await api.post(`/classrooms/assignments/${aid}/submit`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMySubs(s => ({ ...s, [aid]: res.data }))
      setMsg(`Submitted!${res.data.score != null ? ` Score: ${res.data.score}` : ''}`)
      select(selected)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const startQuiz = async (q) => {
    setError(null); setMsg('')
    try {
      const res = await api.post(`/classrooms/quizzes/${q.id}/start`)
      const { attempt_id, remaining_seconds } = res.data
      setQuizSession(s => ({
        ...s,
        [q.id]: { attemptId: attempt_id, endsAt: remaining_seconds != null ? Date.now() + remaining_seconds * 1000 : null },
      }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const submitQuiz = async (q, auto = false) => {
    const qid = q.id
    const sess = quizSession[qid]
    const ans = q.questions.map((_, i) => answers[`${qid}_${i}`] || '')
    if (!auto && ans.every(a => !a.trim())) return setError('Answer at least one question')
    try {
      const res = await api.post(`/classrooms/quizzes/${qid}/attempt`, { answers: ans, attempt_id: sess?.attemptId })
      const mine = await api.get(`/classrooms/quizzes/${qid}/my`)
      setMyAttempts(m => ({ ...m, [qid]: mine.data }))
      setQuizSession(s => { const copy = { ...s }; delete copy[qid]; return copy })
      setMsg(`${auto ? 'Time up — auto-submitted! ' : 'Quiz submitted! '}Score: ${res.data.score}/${res.data.total}`)
      select(selected)
    } catch (err) {
      setQuizSession(s => { const copy = { ...s }; delete copy[qid]; return copy })
      setError(err.response?.data?.detail || err.message)
    }
  }

  const viewMyAttempts = async (qid) => {
    try {
      const res = await api.get(`/classrooms/quizzes/${qid}/my`)
      setMyAttempts(m => ({ ...m, [qid]: res.data }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  return (
    <div className="card section-card">
      <h3>My classrooms — assignments &amp; quizzes</h3>
      <form onSubmit={join} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Enter class code (e.g., AB12CD)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ ...inp, flex: 1 }} />
        <button type="submit" style={btn}>Join Class</button>
      </form>
      {msg && <div style={{ background: 'var(--mint)', padding: 8, borderRadius: 6, fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      {error && <div style={{ color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 6, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {joined.length === 0 && <span style={{ color: 'var(--faint)' }}>Not in any classroom yet. Ask your teacher for the code.</span>}
        {joined.map(c => (
          <button key={c.id} onClick={() => select(c)} style={{ ...btn, background: selected?.id === c.id ? 'var(--primary)' : 'var(--blue-soft)', color: selected?.id === c.id ? 'white' : 'var(--primary-dark)' }}>
            {c.name} ({c.subject})
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <h4>{selected.name} — {selected.subject} ({selected.class_level})</h4>
          <h5>📚 Assignments ({assignments.length})</h5>
          {assignments.map(a => (
            <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <b>{a.title}</b>
              <span style={{ fontSize: 12, color: a.my_submitted ? 'var(--green)' : 'var(--muted)' }}> • {a.my_submitted ? `Submitted${a.my_score != null ? ` • Score: ${a.my_score}` : ''}` : 'Not submitted'}</span>
              {a.deadline && <span style={{ fontSize: 12, color: 'var(--muted)' }}> • due {new Date(a.deadline).toLocaleString()}</span>}
              {a.description && <div style={{ fontSize: 13, marginTop: 4 }}>{a.description}</div>}
              {a.instructions && <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.instructions}</div>}
              {a.attachment_filename && <div style={{ fontSize: 12 }}><a href={`${API_BASE}/uploads/assignments/${a.attachment_file}`} target="_blank" rel="noreferrer">📎 {a.attachment_filename}</a></div>}
              <textarea placeholder="Write your answer..." value={subText[a.id] || ''} onChange={e => setSubText(s => ({ ...s, [a.id]: e.target.value }))} rows={3} style={{ width: '100%', marginTop: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <input type="file" onChange={e => setSubFile(s => ({ ...s, [a.id]: e.target.files[0] }))} />
                <button onClick={() => submitAssignment(a.id)} style={btn}>Submit</button>
              </div>
              {mySubs[a.id]?.feedback && <div style={{ fontSize: 12, marginTop: 4, background: 'var(--mint)', padding: 6, borderRadius: 4 }}>Feedback: {mySubs[a.id].feedback}</div>}
            </div>
          ))}

          <h5>📝 Quizzes ({quizzes.length})</h5>
          {quizzes.map(q => {
            const sess = quizSession[q.id]
            const rem = remainingFor(q.id)
            const maxed = q.max_attempts > 0 && q.my_attempts >= q.max_attempts
            return (
              <div key={q.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <b>{q.title}</b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}> • {q.questions.length} questions{q.duration_minutes ? ` • ${q.duration_minutes} min` : ''}{q.max_attempts ? ` • max ${q.max_attempts} attempt${q.max_attempts === 1 ? '' : 's'}` : ''}{q.my_attempts ? ` • attempted ${q.my_attempts}x${q.my_best != null ? ` • best ${q.my_best}` : ''}` : ''}</span>
                {q.topic && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Topic: {q.topic}</div>}

                {sess ? (
                  <>
                    {rem != null && (
                      <div style={{ marginTop: 6, background: rem <= 60 ? 'var(--pink-soft)' : 'var(--yellow-soft)', padding: '4px 10px', borderRadius: 999, display: 'inline-block', fontSize: 13, fontWeight: 700 }}>
                        ⏱ {fmt(rem)} left
                      </div>
                    )}
                    {q.questions.map((qq, i) => (
                      <div key={i} style={{ marginTop: 8, background: 'var(--paper)', padding: 8, borderRadius: 6 }}>
                        <MathText as="div" style={{ fontWeight: 600 }}>{'Q' + (i + 1) + ': ' + qq.question}</MathText> <span style={{ fontSize: 11, color: 'var(--muted)' }}>({qq.marks || 1} marks)</span>
                        {qq.options && qq.options.length > 0 ? (
                          <div style={{ marginTop: 4 }}>
                            {qq.options.map((o, j) => (
                              <label key={j} style={{ display: 'block', fontSize: 13, padding: 2 }}>
                                <input type="radio" name={`${q.id}_${i}`} checked={answers[`${q.id}_${i}`] === o} onChange={() => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: o }))} /> <MathText as="span">{o}</MathText>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea value={answers[`${q.id}_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: e.target.value }))} rows={2} style={{ width: '100%', marginTop: 4 }} placeholder="Write your answer..." />
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => submitQuiz(q)} disabled={sess.submitting} style={{ ...btn, opacity: sess.submitting ? 0.6 : 1 }}>{sess.submitting ? 'Submitting…' : 'Submit Attempt'}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => startQuiz(q)} disabled={maxed} style={{ ...btn, opacity: maxed ? 0.5 : 1 }} title={q.duration_minutes ? `You will have ${q.duration_minutes} minutes` : 'Start the quiz'}>
                      {maxed ? 'No attempts left' : q.duration_minutes ? `Start Quiz (${q.duration_minutes} min)` : 'Start Quiz'}
                    </button>
                    <button onClick={() => viewMyAttempts(q.id)} style={{ ...btn, background: 'var(--primary-dark)' }}>My Attempts</button>
                  </div>
                )}
                {(myAttempts[q.id] || []).map(at => (
                  <div key={at.id} style={{ fontSize: 12, marginTop: 4, background: 'var(--mint)', padding: 6, borderRadius: 4 }}>
                    Score: <b>{at.score}/{at.total}</b> • {new Date(at.submitted_at).toLocaleString()}
                    {at.details.filter(d => d.needs_review).length > 0 && <span> • descriptive answers need teacher review</span>}
                    <div style={{ marginTop: 4 }}><button onClick={() => viewFeedback(at.id)} style={{ background: 'var(--primary-dark)', color: 'white', border: 'none', padding: '2px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Targeted Feedback</button></div>
                    {(feedback[at.id]?.items || []).map((fb, fi) => (
                      <div key={fi} style={{ marginTop: 4, background: 'var(--card)', padding: 6, borderRadius: 8, borderLeft: fb.was_correct ? '3px solid var(--green)' : '3px solid var(--yellow-deep)' }}>
                        <MathText as="span" style={{ fontWeight: 600 }}>{`Q${fb.question_no} (${fb.concept}): ${fb.was_correct ? '✅' : '❌'}`}</MathText>
                        {!fb.was_correct && fb.study_pointer && <div style={{ marginTop: 2 }}>📖 {fb.study_pointer}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
const inp = {}
const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }
