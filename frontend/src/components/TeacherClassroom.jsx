import { useEffect, useState } from 'react'
import api, { API_BASE } from '../api'

const LETTERS = ['A', 'B', 'C', 'D']
const blankQuestion = () => ({ question: '', type: 'MCQ', options: ['', '', '', ''], answer: 'A', marks: 1, difficulty: 'medium', explanation: '' })

export default function TeacherClassroom() {
  const [rooms, setRooms] = useState([])
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [classLevel, setClassLevel] = useState('Class 11')
  const [division, setDivision] = useState('')
  const [desc, setDesc] = useState('')
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('members')
  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [workspaceItems, setWorkspaceItems] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState(null)

  // assignment form
  const [aTitle, setATitle] = useState('')
  const [aDesc, setADesc] = useState('')
  const [aInstr, setAInstr] = useState('')
  const [aDeadline, setADeadline] = useState('')
  const [aFile, setAFile] = useState(null)
  const [subs, setSubs] = useState({})
  const [grade, setGrade] = useState({})
  // quiz form
  const [qTitle, setQTitle] = useState('')
  const [qTopic, setQTopic] = useState('')
  const [qDuration, setQDuration] = useState(20)
  const [qMaxAttempts, setQMaxAttempts] = useState(1)
  const [qQuestions, setQQuestions] = useState([blankQuestion()])
  const [attempts, setAttempts] = useState({})
  // publish
  const [pubItem, setPubItem] = useState('')
  const [pubTarget, setPubTarget] = useState('quiz')
  // insights
  const [insights, setInsights] = useState(null)

  const viewInsights = async () => {
    if (!selected) return
    try {
      const res = await api.get(`/adaptive/classroom/${selected.id}`)
      setInsights(res.data)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const load = async () => {
    try {
      const res = await api.get('/classrooms/my')
      setRooms(res.data)
      try {
        const w = await api.get('/workspace')
        setWorkspaceItems(w.data.filter(i => !i.abstained))
      } catch { /* workspace optional */ }
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault(); setError(null)
    try {
      await api.post('/classrooms', { name, subject, class_level: classLevel, division: division || undefined, description: desc || undefined })
      setName(''); setSubject(''); setDivision(''); setDesc(''); setMsg('Classroom created — share the code with students!')
      load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const select = async (c) => {
    setSelected(c); setTab('members'); setMsg(''); setError(null)
    // allSettled so one failing call doesn't blank the whole panel
    const [m, a, q] = await Promise.allSettled([
      api.get(`/classrooms/${c.id}/members`),
      api.get(`/classrooms/${c.id}/assignments`),
      api.get(`/classrooms/${c.id}/quizzes`),
    ])
    setMembers(m.status === 'fulfilled' ? m.value.data : [])
    setAssignments(a.status === 'fulfilled' ? a.value.data : [])
    setQuizzes(q.status === 'fulfilled' ? q.value.data : [])
    const failed = [m, a, q].filter(r => r.status === 'rejected')
    if (failed.length) setError('Some data failed to load: ' + failed.map(f => f.reason?.response?.data?.detail || f.reason?.message || 'unknown error').join('; '))
  }

  const refreshSelected = async () => { if (selected) { const c = rooms.find(r => r.id === selected.id) || selected; select(c) } }

  const delRoom = async (id) => {
    if (!confirm('Delete classroom and all assignments/quizzes?')) return
    try {
      await api.delete(`/classrooms/${id}`)
      setSelected(null); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const createAssignment = async () => {
    if (!aTitle.trim()) return setError('Assignment title required')
    const form = new FormData()
    form.append('title', aTitle)
    if (aDesc) form.append('description', aDesc)
    if (aInstr) form.append('instructions', aInstr)
    if (aDeadline) form.append('deadline', new Date(aDeadline).toISOString())
    if (aFile) form.append('file', aFile)
    try {
      await api.post(`/classrooms/${selected.id}/assignments`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setATitle(''); setADesc(''); setAInstr(''); setADeadline(''); setAFile(null); setMsg('Assignment posted!')
      refreshSelected(); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const viewSubs = async (aid) => {
    try {
      const res = await api.get(`/classrooms/assignments/${aid}/submissions`)
      setSubs(s => ({ ...s, [aid]: res.data }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const gradeSub = async (sid, aid) => {
    const g = grade[sid] || {}
    if (g.score === undefined || g.score === '') return setError('Enter a score')
    try {
      await api.put(`/classrooms/submissions/${sid}/grade`, { score: parseFloat(g.score), feedback: g.feedback || undefined })
      setMsg('Graded!'); viewSubs(aid)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  // --- quiz builder ---
  const setQ = (idx, field, value) => setQQuestions(qs => qs.map((qq, i) => i === idx ? { ...qq, [field]: value } : qq))
  const setOpt = (idx, oi, value) => setQQuestions(qs => qs.map((qq, i) =>
    i === idx ? { ...qq, options: qq.options.map((o, j) => j === oi ? value : o) } : qq))
  const addQuestion = () => setQQuestions(qs => [...qs, blankQuestion()])
  const removeQuestion = (idx) => setQQuestions(qs => qs.filter((_, i) => i !== idx))

  const buildQuestions = () => {
    const out = []
    for (let i = 0; i < qQuestions.length; i++) {
      const qq = qQuestions[i]
      const label = `Question ${i + 1}`
      if (!qq.question.trim()) throw new Error(`${label}: question text is required`)
      const item = {
        question: qq.question.trim(),
        type: qq.type,
        marks: Number(qq.marks) > 0 ? Number(qq.marks) : 1,
        difficulty: qq.difficulty,
      }
      if (qq.type === 'MCQ') {
        const opts = qq.options.map(o => o.trim()).filter(Boolean)
        if (opts.length < 2) throw new Error(`${label}: add at least 2 options`)
        item.options = opts.map((o, j) => /^[A-Da-d][).]/.test(o) ? o : `${LETTERS[j]}) ${o}`)
        const answerIdx = LETTERS.indexOf(qq.answer)
        if (answerIdx < 0 || answerIdx >= opts.length) throw new Error(`${label}: mark the correct option`)
        item.answer = qq.answer
      } else {
        item.answer = qq.answer.trim()
      }
      if (qq.explanation.trim()) item.explanation = qq.explanation.trim()
      out.push(item)
    }
    return out
  }

  const createQuiz = async () => {
    setError(null)
    let questions
    try { questions = buildQuestions() } catch (err) { return setError(err.message) }
    try {
      await api.post(`/classrooms/${selected.id}/quizzes`, {
        title: qTitle, topic: qTopic || undefined,
        duration_minutes: parseInt(qDuration) || undefined,
        max_attempts: Math.max(parseInt(qMaxAttempts) || 0, 0),
        questions,
      })
      setQTitle(''); setQTopic(''); setQQuestions([blankQuestion()]); setMsg('Quiz scheduled!')
      refreshSelected(); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const viewAttempts = async (qid) => {
    try {
      const res = await api.get(`/classrooms/quizzes/${qid}/attempts`)
      setAttempts(a => ({ ...a, [qid]: res.data }))
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const gradeAttempt = async (aid, qid) => {
    const g = grade[aid] || {}
    if (g.score === undefined || g.score === '') return setError('Enter a score')
    try {
      await api.put(`/classrooms/quiz-attempts/${aid}/grade`, { score: parseFloat(g.score), feedback: g.feedback || undefined })
      setMsg('Attempt graded!'); viewAttempts(qid)
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  const publishWorkspace = async () => {
    if (!pubItem) return setError('Select a workspace item')
    try {
      const res = await api.post(`/workspace/${pubItem}/publish`, { classroom_id: selected.id, target: pubTarget })
      setMsg(res.data.detail); refreshSelected(); load()
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  return (
    <div className="card section-card">
      <h3>Teach, assign, assess</h3>
      <p className="card-sub">Create a class, share the join code, post assignments & quizzes (or publish workspace material), track submissions and scores.</p>

      <div className="split">
        <div>
          <h4>Create Classroom</h4>
          <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Class name e.g., Class 11 Physics - Div A" value={name} onChange={e => setName(e.target.value)} required style={inp} />
            <input placeholder="Subject e.g., Physics" value={subject} onChange={e => setSubject(e.target.value)} required style={inp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Class level" value={classLevel} onChange={e => setClassLevel(e.target.value)} style={{ ...inp, flex: 1 }} />
              <input placeholder="Division (optional)" value={division} onChange={e => setDivision(e.target.value)} style={{ ...inp, flex: 1 }} />
            </div>
            <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} style={inp} />
            <button type="submit" style={btn}>Create Classroom</button>
          </form>
          {msg && <div style={{ marginTop: 8, background: 'var(--mint)', padding: 8, borderRadius: 6, fontSize: 13 }}>{msg}</div>}
          {error && <div style={{ marginTop: 8, color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 6 }}>{error}</div>}
        </div>
        <div>
          <h4>My Classrooms ({rooms.length})</h4>
          {rooms.length === 0 && <div style={{ color: 'var(--faint)' }}>No classrooms yet.</div>}
          {rooms.map(c => (
            <div key={c.id} onClick={() => select(c)} style={{ padding: 10, marginBottom: 8, border: selected?.id === c.id ? '2px solid var(--primary)' : '1px solid var(--line-strong)', borderRadius: 8, cursor: 'pointer', background: selected?.id === c.id ? 'var(--blue-soft)' : 'white' }}>
              <b>{c.name}</b> <span style={{ fontSize: 12, color: 'var(--muted)' }}>({c.subject} • {c.class_level})</span>
              <div style={{ fontSize: 13, marginTop: 4 }}>Join code: <b style={{ background: 'var(--yellow)', padding: '2px 8px', borderRadius: 4, letterSpacing: 2 }}>{c.code}</b></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.member_count} students • {c.assignment_count} assignments • {c.quiz_count} quizzes</div>
              <button onClick={(e) => { e.stopPropagation(); delRoom(c.id) }} style={{ fontSize: 11, background: 'var(--pink-soft)', color: 'var(--red)', fontWeight: 600, border: 'none', padding: '3px 10px', borderRadius: 999, cursor: 'pointer', marginTop: 4 }}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <h4>Manage: {selected.name} (code: {selected.code})</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {['members', 'assignments', 'quizzes', 'publish', 'insights'].map(t => (
              <button key={t} onClick={() => { setTab(t); if (t === 'insights') viewInsights() }} style={{ ...btn, background: tab === t ? 'var(--primary)' : 'var(--blue-soft)', color: tab === t ? 'white' : 'var(--primary-dark)' }}>{t}</button>
            ))}
          </div>

          {tab === 'members' && (
            <div>
              <h5>Students ({members.length})</h5>
              {members.length === 0 ? <div style={{ color: 'var(--faint)' }}>No students joined yet. Share the code: <b>{selected.code}</b></div> :
                members.map(m => <div key={m.student_id} style={{ fontSize: 13, padding: 6, borderBottom: '1px solid #eef3fb' }}><b>{m.name}</b> ({m.email}) • joined {new Date(m.joined_at).toLocaleString()}</div>)}
            </div>
          )}

          {tab === 'assignments' && (
            <div>
              <h5>Post Assignment</h5>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <input placeholder="Title" value={aTitle} onChange={e => setATitle(e.target.value)} style={{ ...inp, flex: 1 }} />
                <input type="datetime-local" value={aDeadline} onChange={e => setADeadline(e.target.value)} style={inp} />
                <input type="file" accept=".pdf" onChange={e => setAFile(e.target.files[0])} />
              </div>
              <input placeholder="Description (optional)" value={aDesc} onChange={e => setADesc(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
              <textarea placeholder="Instructions (optional)" value={aInstr} onChange={e => setAInstr(e.target.value)} rows={2} style={{ width: '100%' }} />
              <button onClick={createAssignment} style={{ ...btn, marginTop: 8 }}>Post Assignment</button>
              <h5 style={{ marginTop: 16 }}>Assignments ({assignments.length})</h5>
              {assignments.map(a => (
                <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <b>{a.title}</b> <span style={{ fontSize: 12, color: 'var(--muted)' }}>• {a.submission_count} submissions{a.deadline ? ` • due ${new Date(a.deadline).toLocaleString()}` : ''}</span>
                  {a.attachment_filename && <div style={{ fontSize: 12 }}><a href={`${API_BASE}/uploads/assignments/${a.attachment_file}`} target="_blank" rel="noreferrer">📎 {a.attachment_filename}</a></div>}
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => viewSubs(a.id)} style={smallBtn}>View Submissions</button>
                  </div>
                  {(subs[a.id] || []).map(s => (
                    <div key={s.id} style={{ fontSize: 12, background: 'var(--paper)', padding: 8, borderRadius: 6, marginTop: 6 }}>
                      <b>{s.student_name}</b> ({s.student_email}) • {new Date(s.submitted_at).toLocaleString()}
                      {s.text && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.text.slice(0, 300)}</div>}
                      {s.file_filename && <div><a href={`${API_BASE}/uploads/submissions/${s.file_stored}`} target="_blank" rel="noreferrer">📎 {s.file_filename}</a></div>}
                      <div style={{ marginTop: 4 }}>Score: <b>{s.score ?? '—'}</b> {s.feedback && <span>• {s.feedback}</span>}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input type="number" placeholder="Score" value={grade[s.id]?.score || ''} onChange={e => setGrade(g => ({ ...g, [s.id]: { ...g[s.id], score: e.target.value } }))} style={{ ...inp, width: 90 }} />
                        <input placeholder="Feedback" value={grade[s.id]?.feedback || ''} onChange={e => setGrade(g => ({ ...g, [s.id]: { ...g[s.id], feedback: e.target.value } }))} style={{ ...inp, flex: 1 }} />
                        <button onClick={() => gradeSub(s.id, a.id)} style={smallBtn}>Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'quizzes' && (
            <div>
              <h5>Schedule Quiz</h5>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <input placeholder="Quiz title" value={qTitle} onChange={e => setQTitle(e.target.value)} style={{ ...inp, flex: 1 }} />
                <input placeholder="Topic" value={qTopic} onChange={e => setQTopic(e.target.value)} style={inp} />
                <input type="number" min="1" placeholder="Duration (min)" value={qDuration} onChange={e => setQDuration(e.target.value)} style={{ ...inp, width: 130 }} />
                <input type="number" min="0" placeholder="Max attempts (0 = ∞)" value={qMaxAttempts} onChange={e => setQMaxAttempts(e.target.value)} style={{ ...inp, width: 170 }} title="Maximum attempts per student; 0 means unlimited" />
              </div>

              <h6 style={{ margin: '10px 0 6px', fontSize: 13, color: 'var(--muted)' }}>Questions ({qQuestions.length})</h6>
              {qQuestions.map((qq, idx) => (
                <div key={idx} style={{ border: '1px solid var(--line-strong)', borderRadius: 8, padding: 10, marginBottom: 8, background: 'var(--paper)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 12, color: 'var(--muted)' }}>Q{idx + 1}</b>
                    <select value={qq.type} onChange={e => setQ(idx, 'type', e.target.value)} style={{ ...inp, width: 130 }}>
                      <option value="MCQ">MCQ</option>
                      <option value="descriptive">Descriptive</option>
                    </select>
                    <input type="number" min="1" value={qq.marks} onChange={e => setQ(idx, 'marks', e.target.value)} style={{ ...inp, width: 80 }} title="Marks" />
                    <select value={qq.difficulty} onChange={e => setQ(idx, 'difficulty', e.target.value)} style={{ ...inp, width: 110 }}>
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                    {qQuestions.length > 1 && (
                      <button onClick={() => removeQuestion(idx)} style={{ ...smallBtn, background: 'var(--pink-soft)', color: 'var(--red)' }}>Remove</button>
                    )}
                  </div>
                  <textarea placeholder="Question text" value={qq.question} onChange={e => setQ(idx, 'question', e.target.value)} rows={2} style={{ width: '100%', marginBottom: 6 }} />
                  {qq.type === 'MCQ' ? (
                    <>
                      {qq.options.map((o, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, width: 70, display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }} title="Mark as correct answer">
                            <input type="radio" name={`ans-${idx}`} checked={qq.answer === LETTERS[oi]} onChange={() => setQ(idx, 'answer', LETTERS[oi])} />
                            {LETTERS[oi]})
                          </label>
                          <input placeholder={`Option ${LETTERS[oi]}`} value={o} onChange={e => setOpt(idx, oi, e.target.value)} style={{ ...inp, flex: 1 }} />
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Radio marks the correct option. Empty options are dropped.</div>
                    </>
                  ) : (
                    <input placeholder="Model answer / marking note (optional)" value={qq.answer} onChange={e => setQ(idx, 'answer', e.target.value)} style={{ ...inp, width: '100%', marginBottom: 6 }} />
                  )}
                  <input placeholder="Explanation (optional — shown in feedback)" value={qq.explanation} onChange={e => setQ(idx, 'explanation', e.target.value)} style={{ ...inp, width: '100%', marginTop: 6 }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addQuestion} style={smallBtn}>+ Add Question</button>
                <button onClick={createQuiz} style={btn}>Schedule Quiz</button>
              </div>

              <h5 style={{ marginTop: 16 }}>Quizzes ({quizzes.length})</h5>
              {quizzes.map(q => (
                <div key={q.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <b>{q.title}</b> <span style={{ fontSize: 12, color: 'var(--muted)' }}>• {q.questions.length} questions • {q.attempt_count} attempts{q.duration_minutes ? ` • ${q.duration_minutes} min` : ''}{q.max_attempts ? ` • max ${q.max_attempts} attempt${q.max_attempts === 1 ? '' : 's'}` : ''}</span>
                  <div style={{ marginTop: 6 }}><button onClick={() => viewAttempts(q.id)} style={smallBtn}>View Attempts</button></div>
                  {(attempts[q.id] || []).map(a => (
                    <div key={a.id} style={{ fontSize: 12, background: 'var(--paper)', padding: 8, borderRadius: 6, marginTop: 6 }}>
                      <b>{a.student_name}</b> • {a.score}/{a.total} • {new Date(a.submitted_at).toLocaleString()}
                      {a.details.filter(d => d.needs_review).length > 0 && <span style={{ color: 'var(--yellow-ink)' }}> • needs review (descriptive)</span>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input type="number" placeholder="Override score" value={grade[a.id]?.score || ''} onChange={e => setGrade(g => ({ ...g, [a.id]: { ...g[a.id], score: e.target.value } }))} style={{ ...inp, width: 120 }} />
                        <button onClick={() => gradeAttempt(a.id, q.id)} style={smallBtn}>Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'publish' && (
            <div>
              <h5>Publish Workspace Material</h5>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Turn a workspace lesson/quiz into a classroom assignment or quiz. Abstained items are excluded.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={pubItem} onChange={e => setPubItem(e.target.value)} style={{ ...inp, flex: 1 }}>
                  <option value="">Select workspace item</option>
                  {workspaceItems.map(w => <option key={w.id} value={w.id}>{w.title} ({w.kind} • {w.status})</option>)}
                </select>
                <select value={pubTarget} onChange={e => setPubTarget(e.target.value)} style={inp}>
                  <option value="quiz">As Quiz</option>
                  <option value="assignment">As Assignment</option>
                </select>
                <button onClick={publishWorkspace} style={btn}>Publish to {selected.name}</button>
              </div>
            </div>
          )}

          {tab === 'insights' && (
            <div>
              <h5>📊 Learning Insights — weak concepts & misconceptions</h5>
              {!insights ? <div style={{ color: 'var(--faint)' }}>Loading…</div> : (
                <>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Overall accuracy: <b>{(insights.overall_accuracy * 100).toFixed(0)}%</b> over {insights.total_attempts} answers
                    {insights.weak_concepts.length > 0 && <span> • weak: <b>{insights.weak_concepts.join(', ')}</b></span>}
                  </div>
                  {insights.concepts.map(c => (
                    <div key={c.concept} style={{ fontSize: 13, padding: 6, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 4, background: c.possible_misconception ? 'var(--yellow-soft)' : 'var(--paper)' }}>
                      <b>{c.concept}</b> • {c.correct}/{c.attempts} ({(c.accuracy * 100).toFixed(0)}%)
                      {c.possible_misconception && <span style={{ color: 'var(--yellow-ink)' }}> • ⚠️ possible misconception</span>}
                    </div>
                  ))}
                  <h5>Per Student</h5>
                  {insights.per_student.map(s => (
                    <div key={s.student_id} style={{ fontSize: 12, padding: 6, borderBottom: '1px solid #eef3fb' }}>
                      <b>{s.name}</b> • {(s.accuracy * 100).toFixed(0)}% over {s.attempts} answers
                      {s.weak_concepts.length > 0 && <span> • needs: {s.weak_concepts.join(', ')}</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
const inp = {}
const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }
const smallBtn = { background: 'var(--blue-soft)', color: 'var(--primary-dark)', border: 'none', padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }
