import { useEffect, useState } from 'react'
import api from '../api'

const API_BASE = 'http://localhost:8000'

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

  const viewFeedback = async (aid) => {
    try {
      const res = await api.get(`/adaptive/feedback/${aid}`)
      setFeedback(f => ({ ...f, [aid]: res.data }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const load = async () => {
    const res = await api.get('/classrooms/joined/list')
    setJoined(res.data)
  }
  useEffect(() => { load() }, [])

  const join = async (e) => {
    e.preventDefault(); setError(null); setMsg('')
    try {
      const res = await api.post('/classrooms/join', { code })
      setCode(''); setMsg(`Joined ${res.data.name}!`); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const select = async (c) => {
    setSelected(c); setError(null); setMsg('')
    const [a, q] = await Promise.all([
      api.get(`/classrooms/${c.id}/assignments`),
      api.get(`/classrooms/${c.id}/quizzes`),
    ])
    setAssignments(a.data); setQuizzes(q.data)
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

  const attemptQuiz = async (qid, questions) => {
    const ans = questions.map((_, i) => answers[`${qid}_${i}`] || '')
    if (ans.every(a => !a.trim())) return setError('Answer at least one question')
    try {
      const res = await api.post(`/classrooms/quizzes/${qid}/attempt`, { answers: ans })
      const mine = await api.get(`/classrooms/quizzes/${qid}/my`)
      setMyAttempts(m => ({ ...m, [qid]: mine.data }))
      setMsg(`Quiz submitted! Score: ${res.data.score}/${res.data.total}`)
      select(selected)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const viewMyAttempts = async (qid) => {
    const res = await api.get(`/classrooms/quizzes/${qid}/my`)
    setMyAttempts(m => ({ ...m, [qid]: res.data }))
  }

  return (
    <div style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>🏫 My Classrooms — Assignments & Quizzes</h3>
      <form onSubmit={join} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Enter class code (e.g., AB12CD)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ ...inp, flex: 1 }} />
        <button type="submit" style={btn}>Join Class</button>
      </form>
      {msg && <div style={{ background: '#e8f5e9', padding: 8, borderRadius: 6, fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      {error && <div style={{ color: 'red', background: '#ffebee', padding: 8, borderRadius: 6, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {joined.length === 0 && <span style={{ color: '#999' }}>Not in any classroom yet. Ask your teacher for the code.</span>}
        {joined.map(c => (
          <button key={c.id} onClick={() => select(c)} style={{ ...btn, background: selected?.id === c.id ? '#1a237e' : '#9fa8da' }}>
            {c.name} ({c.subject})
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <h4>{selected.name} — {selected.subject} ({selected.class_level})</h4>
          <h5>📚 Assignments ({assignments.length})</h5>
          {assignments.map(a => (
            <div key={a.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <b>{a.title}</b>
              <span style={{ fontSize: 12, color: a.my_submitted ? '#2e7d32' : '#666' }}> • {a.my_submitted ? `Submitted${a.my_score != null ? ` • Score: ${a.my_score}` : ''}` : 'Not submitted'}</span>
              {a.deadline && <span style={{ fontSize: 12, color: '#666' }}> • due {new Date(a.deadline).toLocaleString()}</span>}
              {a.description && <div style={{ fontSize: 13, marginTop: 4 }}>{a.description}</div>}
              {a.instructions && <div style={{ fontSize: 12, color: '#555', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.instructions}</div>}
              {a.attachment_filename && <div style={{ fontSize: 12 }}><a href={`${API_BASE}/uploads/assignments/${a.attachment_file}`} target="_blank" rel="noreferrer">📎 {a.attachment_filename}</a></div>}
              <textarea placeholder="Write your answer..." value={subText[a.id] || ''} onChange={e => setSubText(s => ({ ...s, [a.id]: e.target.value }))} rows={3} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <input type="file" onChange={e => setSubFile(s => ({ ...s, [a.id]: e.target.files[0] }))} />
                <button onClick={() => submitAssignment(a.id)} style={btn}>Submit</button>
              </div>
              {mySubs[a.id]?.feedback && <div style={{ fontSize: 12, marginTop: 4, background: '#e8f5e9', padding: 6, borderRadius: 4 }}>Feedback: {mySubs[a.id].feedback}</div>}
            </div>
          ))}

          <h5>📝 Quizzes ({quizzes.length})</h5>
          {quizzes.map(q => (
            <div key={q.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <b>{q.title}</b>
              <span style={{ fontSize: 12, color: '#666' }}> • {q.questions.length} questions{q.duration_minutes ? ` • ${q.duration_minutes} min` : ''}{q.my_attempts ? ` • attempted ${q.my_attempts}x${q.my_best != null ? ` • best ${q.my_best}` : ''}` : ''}</span>
              {q.topic && <div style={{ fontSize: 12, color: '#666' }}>Topic: {q.topic}</div>}
              {q.questions.map((qq, i) => (
                <div key={i} style={{ marginTop: 8, background: '#fafafa', padding: 8, borderRadius: 6 }}>
                  <b>Q{i + 1}: {qq.question}</b> <span style={{ fontSize: 11, color: '#666' }}>({qq.marks || 1} marks)</span>
                  {qq.options && qq.options.length > 0 ? (
                    <div style={{ marginTop: 4 }}>
                      {qq.options.map((o, j) => (
                        <label key={j} style={{ display: 'block', fontSize: 13, padding: 2 }}>
                          <input type="radio" name={`${q.id}_${i}`} checked={answers[`${q.id}_${i}`] === o} onChange={() => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: o }))} /> {o}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea value={answers[`${q.id}_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`${q.id}_${i}`]: e.target.value }))} rows={2} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} placeholder="Write your answer..." />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => attemptQuiz(q.id, q.questions)} style={btn}>Submit Attempt</button>
                <button onClick={() => viewMyAttempts(q.id)} style={{ ...btn, background: '#6a1b9a' }}>My Attempts</button>
              </div>
              {(myAttempts[q.id] || []).map(at => (
                <div key={at.id} style={{ fontSize: 12, marginTop: 4, background: '#e8f5e9', padding: 6, borderRadius: 4 }}>
                  Score: <b>{at.score}/{at.total}</b> • {new Date(at.submitted_at).toLocaleString()}
                  {at.details.filter(d => d.needs_review).length > 0 && <span> • descriptive answers need teacher review</span>}
                  <div style={{ marginTop: 4 }}><button onClick={() => viewFeedback(at.id)} style={{ background: '#6a1b9a', color: 'white', border: 'none', padding: '2px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Targeted Feedback</button></div>
                  {(feedback[at.id]?.items || []).map((fb, fi) => (
                    <div key={fi} style={{ marginTop: 4, background: 'white', padding: 6, borderRadius: 4, borderLeft: fb.was_correct ? '3px solid #4caf50' : '3px solid #e65100' }}>
                      <b>Q{fb.question_no} ({fb.concept}): {fb.was_correct ? '✅' : '❌'}</b>
                      {!fb.was_correct && fb.study_pointer && <div style={{ marginTop: 2 }}>📖 {fb.study_pointer}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
const inp = { padding: 8, borderRadius: 6, border: '1px solid #ccc' }
const btn = { background: '#1a237e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }
