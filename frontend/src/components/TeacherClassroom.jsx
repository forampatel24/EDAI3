import { useEffect, useState } from 'react'
import api, { API_BASE } from '../api'
import Icon from './Icon'

const LETTERS = ['A', 'B', 'C', 'D']
const blankQuestion = () => ({ question: '', type: 'MCQ', options: ['', '', '', ''], answer: 'A', marks: 1, difficulty: 'medium', explanation: '' })

const TABS = [
  { key: 'members', label: 'Members', icon: 'users' },
  { key: 'assignments', label: 'Assignments', icon: 'file' },
  { key: 'quizzes', label: 'Quizzes', icon: 'clipboard' },
  { key: 'publish', label: 'Publish', icon: 'send' },
  { key: 'insights', label: 'Insights', icon: 'chart' },
]

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

      <div className="bento-grid-2" style={{ marginBottom: 18 }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <h4>Create classroom</h4>
          <form onSubmit={create} className="editor-stack" style={{ gap: 12 }}>
            <input placeholder="Class name e.g., Class 11 Physics - Div A" value={name} onChange={e => setName(e.target.value)} required />
            <input placeholder="Subject e.g., Physics" value={subject} onChange={e => setSubject(e.target.value)} required />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Class level" value={classLevel} onChange={e => setClassLevel(e.target.value)} style={{ flex: 1 }} />
              <input placeholder="Division (optional)" value={division} onChange={e => setDivision(e.target.value)} style={{ flex: 1 }} />
            </div>
            <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <button type="submit" className="btn btn-primary">Create classroom</button>
          </form>
          {msg && <div className="banner banner-ok" style={{ marginTop: 10 }}><Icon name="check" /><span>{msg}</span></div>}
          {error && <div className="banner banner-bad" style={{ marginTop: 10 }}><Icon name="alert" /><span>{error}</span></div>}
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <h4>My classrooms ({rooms.length})</h4>
          {rooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-ico"><Icon name="users" /></div>
              <div className="empty-title">No classrooms yet</div>
              <div className="empty-text">Create your first class on the left to start assigning work.</div>
            </div>
          ) : (
            rooms.map(c => (
              <div key={c.id} onClick={() => select(c)} className={`room-card${selected?.id === c.id ? ' active' : ''}`}>
                <b>{c.name}</b> <span className="meta-line" style={{ display: 'inline' }}>· {c.subject} · {c.class_level}</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>Join code: <span className="join-code">{c.code}</span></div>
                <div className="meta-line">{c.member_count} students · {c.assignment_count} assignments · {c.quiz_count} quizzes</div>
                <button onClick={(e) => { e.stopPropagation(); delRoom(c.id) }} className="btn-tiny btn-danger" style={{ marginTop: 6 }}>Delete</button>
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <h4>Manage: {selected.name} <span className="meta-line" style={{ display: 'inline' }}>· code {selected.code}</span></h4>
          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'insights') viewInsights() }} className={`tab-btn${tab === t.key ? ' active' : ''}`}>
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'members' && (
            <div>
              <h5 className="sp-title" style={{ margin: '4px 0 8px' }}><Icon name="users" /> Students ({members.length})</h5>
              {members.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-ico"><Icon name="users" /></div>
                  <div className="empty-title">No students yet</div>
                  <div className="empty-text">Share the join code <span className="join-code">{selected.code}</span> with your class.</div>
                </div>
              ) : (
                members.map(m => (
                  <div key={m.student_id} className="list-card-head" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <Icon name="users" />
                    <b>{m.name}</b>
                    <span className="meta-line">{m.email} · joined {new Date(m.joined_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'assignments' && (
            <div>
              <h5 className="sp-title" style={{ margin: '4px 0 8px' }}><Icon name="plus" /> Post assignment</h5>
              <div className="toolbar">
                <label className="field">
                  <span className="field-label">Title</span>
                  <input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Assignment title" />
                </label>
                <label className="field w-170">
                  <span className="field-label">Deadline</span>
                  <input type="datetime-local" value={aDeadline} onChange={e => setADeadline(e.target.value)} />
                </label>
                <label className="field">
                  <span className="field-label">Attachment (PDF)</span>
                  <input type="file" accept=".pdf" onChange={e => setAFile(e.target.files[0])} />
                </label>
              </div>
              <label className="field" style={{ marginBottom: 8 }}>
                <span className="field-label">Description (optional)</span>
                <input value={aDesc} onChange={e => setADesc(e.target.value)} placeholder="Short description" />
              </label>
              <label className="field" style={{ marginBottom: 10 }}>
                <span className="field-label">Instructions (optional)</span>
                <textarea value={aInstr} onChange={e => setAInstr(e.target.value)} rows={2} />
              </label>
              <button onClick={createAssignment} className="btn btn-primary btn-sm">Post assignment</button>

              <h5 className="sp-title" style={{ margin: '18px 0 8px' }}><Icon name="file" /> Assignments ({assignments.length})</h5>
              {assignments.length === 0 && <div className="meta-hint">No assignments posted yet.</div>}
              {assignments.map(a => (
                <div key={a.id} className="list-card">
                  <div className="list-card-head">
                    <Icon name="file" />
                    <b>{a.title}</b>
                    <span className="meta-line">{a.submission_count} submissions{a.deadline ? ` · due ${new Date(a.deadline).toLocaleString()}` : ''}</span>
                  </div>
                  {a.attachment_filename && (
                    <div style={{ fontSize: 12 }}>
                      <a href={`${API_BASE}/uploads/assignments/${a.attachment_file}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Icon name="paperclip" size={13} /> {a.attachment_filename}
                      </a>
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => viewSubs(a.id)} className="btn btn-ghost btn-sm">View submissions</button>
                  </div>
                  {(subs[a.id] || []).map(s => (
                    <div key={s.id} className="sub-card">
                      <div className="list-card-head">
                        <b>{s.student_name}</b>
                        <span className="meta-line">{s.student_email} · {new Date(s.submitted_at).toLocaleString()}</span>
                      </div>
                      {s.text && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{s.text.slice(0, 300)}</div>}
                      {s.file_filename && (
                        <div style={{ fontSize: 12 }}>
                          <a href={`${API_BASE}/uploads/submissions/${s.file_stored}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <Icon name="paperclip" size={13} /> {s.file_filename}
                          </a>
                        </div>
                      )}
                      <div style={{ marginTop: 4, fontSize: 12.5 }}>Score: <b>{s.score ?? '—'}</b> {s.feedback && <span>· {s.feedback}</span>}</div>
                      <div className="toolbar" style={{ marginTop: 4, marginBottom: 0 }}>
                        <input type="number" placeholder="Score" value={grade[s.id]?.score || ''} onChange={e => setGrade(g => ({ ...g, [s.id]: { ...g[s.id], score: e.target.value } }))} className="w-90" />
                        <input placeholder="Feedback" value={grade[s.id]?.feedback || ''} onChange={e => setGrade(g => ({ ...g, [s.id]: { ...g[s.id], feedback: e.target.value } }))} style={{ flex: 1 }} />
                        <button onClick={() => gradeSub(s.id, a.id)} className="btn btn-primary btn-sm">Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'quizzes' && (
            <div>
              <h5 className="sp-title" style={{ margin: '4px 0 8px' }}><Icon name="plus" /> Schedule quiz</h5>
              <div className="toolbar">
                <label className="field">
                  <span className="field-label">Quiz title</span>
                  <input placeholder="Quiz title" value={qTitle} onChange={e => setQTitle(e.target.value)} />
                </label>
                <label className="field w-130">
                  <span className="field-label">Topic</span>
                  <input placeholder="Topic" value={qTopic} onChange={e => setQTopic(e.target.value)} />
                </label>
                <label className="field w-130">
                  <span className="field-label">Duration (min)</span>
                  <input type="number" min="1" value={qDuration} onChange={e => setQDuration(e.target.value)} />
                </label>
                <label className="field w-170">
                  <span className="field-label">Max attempts (0 = ∞)</span>
                  <input type="number" min="0" value={qMaxAttempts} onChange={e => setQMaxAttempts(e.target.value)} title="Maximum attempts per student; 0 means unlimited" />
                </label>
              </div>

              <h6 className="field-label" style={{ margin: '10px 0 6px' }}>Questions ({qQuestions.length})</h6>
              {qQuestions.map((qq, idx) => (
                <div key={idx} className="quiz-q">
                  <div className="toolbar" style={{ marginTop: 0, marginBottom: 6 }}>
                    <b className="quiz-q-label">Q{idx + 1}</b>
                    <select value={qq.type} onChange={e => setQ(idx, 'type', e.target.value)} className="w-130">
                      <option value="MCQ">MCQ</option>
                      <option value="descriptive">Descriptive</option>
                    </select>
                    <input type="number" min="1" value={qq.marks} onChange={e => setQ(idx, 'marks', e.target.value)} className="w-90" title="Marks" />
                    <select value={qq.difficulty} onChange={e => setQ(idx, 'difficulty', e.target.value)} className="w-110">
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                    {qQuestions.length > 1 && (
                      <button onClick={() => removeQuestion(idx)} className="btn-tiny btn-danger">Remove</button>
                    )}
                  </div>
                  <textarea placeholder="Question text" value={qq.question} onChange={e => setQ(idx, 'question', e.target.value)} rows={2} style={{ marginBottom: 6 }} />
                  {qq.type === 'MCQ' ? (
                    <>
                      {qq.options.map((o, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, width: 70, display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }} title="Mark as correct answer">
                            <input type="radio" name={`ans-${idx}`} checked={qq.answer === LETTERS[oi]} onChange={() => setQ(idx, 'answer', LETTERS[oi])} />
                            {LETTERS[oi]})
                          </label>
                          <input placeholder={`Option ${LETTERS[oi]}`} value={o} onChange={e => setOpt(idx, oi, e.target.value)} style={{ flex: 1 }} />
                        </div>
                      ))}
                      <div className="meta-line">Radio marks the correct option. Empty options are dropped.</div>
                    </>
                  ) : (
                    <input placeholder="Model answer / marking note (optional)" value={qq.answer} onChange={e => setQ(idx, 'answer', e.target.value)} style={{ marginBottom: 6 }} />
                  )}
                  <input placeholder="Explanation (optional — shown in feedback)" value={qq.explanation} onChange={e => setQ(idx, 'explanation', e.target.value)} style={{ marginTop: 6 }} />
                </div>
              ))}
              <div className="toolbar">
                <button onClick={addQuestion} className="btn btn-ghost btn-sm">+ Add question</button>
                <button onClick={createQuiz} className="btn btn-primary">Schedule quiz</button>
              </div>

              <h5 className="sp-title" style={{ margin: '18px 0 8px' }}><Icon name="clipboard" /> Quizzes ({quizzes.length})</h5>
              {quizzes.length === 0 && <div className="meta-hint">No quizzes scheduled yet.</div>}
              {quizzes.map(q => (
                <div key={q.id} className="list-card">
                  <div className="list-card-head">
                    <Icon name="clipboard" />
                    <b>{q.title}</b>
                    <span className="meta-line">{q.questions.length} questions · {q.attempt_count} attempts{q.duration_minutes ? ` · ${q.duration_minutes} min` : ''}{q.max_attempts ? ` · max ${q.max_attempts} attempt${q.max_attempts === 1 ? '' : 's'}` : ''}</span>
                  </div>
                  <div style={{ marginTop: 6 }}><button onClick={() => viewAttempts(q.id)} className="btn btn-ghost btn-sm">View attempts</button></div>
                  {(attempts[q.id] || []).map(a => (
                    <div key={a.id} className="sub-card">
                      <div className="list-card-head">
                        <b>{a.student_name}</b>
                        <span className={`score-chip${a.total ? (a.score / a.total >= 0.7 ? '' : a.score / a.total >= 0.4 ? ' mid' : ' low') : ''}`}>{a.score}/{a.total}</span>
                        <span className="meta-line">{new Date(a.submitted_at).toLocaleString()}</span>
                      </div>
                      {a.details.filter(d => d.needs_review).length > 0 && <div className="meta-line" style={{ color: 'var(--amber)' }}>Needs review (descriptive)</div>}
                      <div className="toolbar" style={{ marginTop: 4, marginBottom: 0 }}>
                        <input type="number" placeholder="Override score" value={grade[a.id]?.score || ''} onChange={e => setGrade(g => ({ ...g, [a.id]: { ...g[a.id], score: e.target.value } }))} className="w-120" />
                        <button onClick={() => gradeAttempt(a.id, q.id)} className="btn btn-primary btn-sm">Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'publish' && (
            <div>
              <h5 className="sp-title" style={{ margin: '4px 0 8px' }}><Icon name="send" /> Publish workspace material</h5>
              <p className="card-sub">Turn a workspace lesson/quiz into a classroom assignment or quiz. Abstained items are excluded.</p>
              <div className="toolbar">
                <label className="field">
                  <span className="field-label">Workspace item</span>
                  <select value={pubItem} onChange={e => setPubItem(e.target.value)}>
                    <option value="">Select workspace item</option>
                    {workspaceItems.map(w => <option key={w.id} value={w.id}>{w.title} ({w.kind} · {w.status})</option>)}
                  </select>
                </label>
                <label className="field w-130">
                  <span className="field-label">Publish as</span>
                  <select value={pubTarget} onChange={e => setPubTarget(e.target.value)}>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </label>
                <button onClick={publishWorkspace} className="btn btn-primary">Publish to {selected.name}</button>
              </div>
            </div>
          )}

          {tab === 'insights' && (
            <div>
              <h5 className="sp-title" style={{ margin: '4px 0 8px' }}><Icon name="chart" /> Learning insights — weak concepts & misconceptions</h5>
              {!insights ? <div className="meta-hint">Loading…</div> : (
                <>
                  <div className="ground-pills" style={{ marginBottom: 10 }}>
                    <span className="pill pill-info"><Icon name="chart" />Overall accuracy: {(insights.overall_accuracy * 100).toFixed(0)}% over {insights.total_attempts} answers</span>
                    {insights.weak_concepts.length > 0 && <span className="pill pill-warn"><Icon name="alert" />Weak: {insights.weak_concepts.join(', ')}</span>}
                  </div>
                  {insights.concepts.map(c => (
                    <div key={c.concept} className={`concept-row${c.possible_misconception ? ' warn' : ''}`}>
                      <b>{c.concept}</b> <span className="meta-line">{c.correct}/{c.attempts} ({(c.accuracy * 100).toFixed(0)}%)</span>
                      {c.possible_misconception && <span className="accent"><span className="pill pill-warn"><Icon name="alert" />Misconception</span></span>}
                    </div>
                  ))}
                  <h5 className="sp-title" style={{ margin: '16px 0 8px' }}><Icon name="users" /> Per student</h5>
                  {insights.per_student.map(s => (
                    <div key={s.student_id} className="list-card-head" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <b>{s.name}</b>
                      <span className={`score-chip${(s.accuracy >= 0.7 ? '' : s.accuracy >= 0.4 ? ' mid' : ' low')}`}>{(s.accuracy * 100).toFixed(0)}%</span>
                      <span className="meta-line">{s.attempts} answers{s.weak_concepts.length > 0 ? ` · needs: ${s.weak_concepts.join(', ')}` : ''}</span>
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