import { useEffect, useState } from 'react'
import api, { API_BASE } from '../api'
import { InlineText } from './RichText'
import Icon from './Icon'

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
      <h3>My classrooms — assignments & quizzes</h3>
      <p className="card-sub">Join with the code your teacher shares, then submit work and take timed quizzes here.</p>

      <form onSubmit={join} className="toolbar">
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          <span className="field-label">Class code</span>
          <input placeholder="e.g., AB12CD" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
        </label>
        <button type="submit" className="btn btn-primary">Join class</button>
      </form>

      {msg && <div className="banner banner-ok"><Icon name="check" /><span>{msg}</span></div>}
      {error && <div className="banner banner-bad"><Icon name="alert" /><span>{error}</span></div>}

      {joined.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 14 }}>
          <div className="empty-ico"><Icon name="users" /></div>
          <div className="empty-title">Not in a classroom yet</div>
          <div className="empty-text">Ask your teacher for the class code and join above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {joined.map(c => (
            <button
              key={c.id}
              onClick={() => select(c)}
              className={`room-card${selected?.id === c.id ? ' active' : ''}`}
              style={{ marginBottom: 0, textAlign: 'left' }}
            >
              <b>{c.name}</b> <span className="meta-line" style={{ display: 'inline' }}>· {c.subject}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div>
          <h4>{selected.name} — {selected.subject} ({selected.class_level})</h4>

          <h5 className="sp-title" style={{ margin: '16px 0 8px' }}><Icon name="book" /> Assignments ({assignments.length})</h5>
          {assignments.length === 0 && <div className="meta-hint">No assignments yet.</div>}
          {assignments.map(a => (
            <div key={a.id} className="list-card">
              <div className="list-card-head">
                <Icon name="file" />
                <b>{a.title}</b>
                <span className={`pill ${a.my_submitted ? 'pill-ok' : 'pill-muted'}`}>
                  {a.my_submitted ? `Submitted${a.my_score != null ? ` · ${a.my_score}` : ''}` : 'Not submitted'}
                </span>
              </div>
              {a.deadline && <div className="meta-line"><Icon name="clock" size={13} /> due {new Date(a.deadline).toLocaleString()}</div>}
              {a.description && <div style={{ fontSize: 13, marginTop: 6 }}>{a.description}</div>}
              {a.instructions && <div style={{ fontSize: 12.5, color: 'var(--ink)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.instructions}</div>}
              {a.attachment_filename && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <a href={`${API_BASE}/uploads/assignments/${a.attachment_file}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <Icon name="paperclip" size={13} /> {a.attachment_filename}
                  </a>
                </div>
              )}
              <textarea placeholder="Write your answer…" value={subText[a.id] || ''} onChange={e => setSubText(s => ({ ...s, [a.id]: e.target.value }))} rows={3} style={{ marginTop: 8 }} />
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <input type="file" onChange={e => setSubFile(s => ({ ...s, [a.id]: e.target.files[0] }))} />
                <button onClick={() => submitAssignment(a.id)} className="btn btn-primary btn-sm">Submit</button>
              </div>
              {mySubs[a.id]?.feedback && (
                <div className="fb-card ok">
                  <div className="fb-head ok"><Icon name="check" />Feedback</div>
                  {mySubs[a.id].feedback}
                </div>
              )}
            </div>
          ))}

          <h5 className="sp-title" style={{ margin: '20px 0 8px' }}><Icon name="clipboard" /> Quizzes ({quizzes.length})</h5>
          {quizzes.length === 0 && <div className="meta-hint">No quizzes yet.</div>}
          {quizzes.map(q => {
            const sess = quizSession[q.id]
            const rem = remainingFor(q.id)
            const maxed = q.max_attempts > 0 && q.my_attempts >= q.max_attempts
            return (
              <div key={q.id} className="list-card">
                <div className="list-card-head">
                  <Icon name="clipboard" />
                  <b>{q.title}</b>
                </div>
                <div className="meta-line">
                  {q.questions.length} questions
                  {q.duration_minutes ? <> <span className="dot">·</span> {q.duration_minutes} min</> : ''}
                  {q.max_attempts ? <> <span className="dot">·</span> max {q.max_attempts} attempt{q.max_attempts === 1 ? '' : 's'}</> : ''}
                  {q.my_attempts ? <> <span className="dot">·</span> attempted {q.my_attempts}x{q.my_best != null ? ` · best ${q.my_best}` : ''}</> : ''}
                </div>
                {q.topic && <div className="meta-line">Topic: {q.topic}</div>}

                {sess ? (
                  <>
                    {rem != null && (
                      <div className={`timer-pill${rem <= 60 ? ' urgent' : ''}`}><Icon name="clock" />{fmt(rem)} left</div>
                    )}
                    {q.questions.map((qq, i) => (
                      <div key={i} className="quiz-q">
                        <div className="quiz-q-label">Q{i + 1}: <InlineText>{qq.question}</InlineText> <span className="marks">({qq.marks || 1} marks)</span></div>
                        {qq.options && qq.options.length > 0 ? (
                          <div style={{ marginTop: 4 }}>
                            {qq.options.map((o, j) => (
                              <label key={j} className="opt-row">
                                <input type="radio" name={`${q.id}_${i}`} checked={answers[`${q.id}_${i}`] === o} onChange={() => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: o }))} />
                                <InlineText>{o}</InlineText>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea value={answers[`${q.id}_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: e.target.value }))} rows={2} style={{ marginTop: 4 }} placeholder="Write your answer…" />
                        )}
                      </div>
                    ))}
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                      <button onClick={() => submitQuiz(q)} disabled={sess.submitting} className="btn btn-primary">{sess.submitting ? 'Submitting…' : 'Submit attempt'}</button>
                    </div>
                  </>
                ) : (
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <button onClick={() => startQuiz(q)} disabled={maxed} className="btn btn-primary" title={q.duration_minutes ? `You will have ${q.duration_minutes} minutes` : 'Start the quiz'}>
                      {maxed ? 'No attempts left' : q.duration_minutes ? `Start quiz (${q.duration_minutes} min)` : 'Start quiz'}
                    </button>
                    <button onClick={() => viewMyAttempts(q.id)} className="btn btn-ghost">My attempts</button>
                  </div>
                )}
                {(myAttempts[q.id] || []).map(at => (
                  <div key={at.id} className="sub-card" style={{ marginTop: 8 }}>
                    <div className="list-card-head">
                      <span className={`score-chip${at.total ? (at.score / at.total >= 0.7 ? '' : at.score / at.total >= 0.4 ? ' mid' : ' low') : ''}`}>Score {at.score}/{at.total}</span>
                      <span className="meta-line">{new Date(at.submitted_at).toLocaleString()}</span>
                    </div>
                    {at.details.filter(d => d.needs_review).length > 0 && <div className="meta-line">Descriptive answers need teacher review</div>}
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => viewFeedback(at.id)} className="btn btn-ghost btn-sm">Targeted feedback</button>
                    </div>
                    {(feedback[at.id]?.items || []).map((fb, fi) => (
                      <div key={fi} className={`fb-card${fb.was_correct ? ' ok' : ''}`}>
                        <div className={`fb-head ${fb.was_correct ? 'ok' : 'bad'}`}>
                          <Icon name={fb.was_correct ? 'check' : 'x'} /> Q{fb.question_no} ({fb.concept})
                        </div>
                        {!fb.was_correct && fb.study_pointer && (
                          <div className="fb-pointer"><Icon name="book" />{fb.study_pointer}</div>
                        )}
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