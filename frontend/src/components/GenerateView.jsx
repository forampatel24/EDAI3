import { useState, useEffect } from 'react'
import api from '../api'
import MathText from './MathText'

export default function GenerateView({ collections, defaultCollectionId }) {
  const [collectionId, setCollectionId] = useState(defaultCollectionId || '')
  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [noteMsg, setNoteMsg] = useState('')
  const [folders, setFolders] = useState([])
  const [noteFolderId, setNoteFolderId] = useState('')

  useEffect(() => {
    api.get('/notes/folders').then(r => setFolders(r.data)).catch(() => {})
  }, [])

  const saveNote = async () => {
    if (!result) return
    const title = prompt.slice(0, 80) || 'Generated content'
    try {
      await api.post('/notes', {
        title,
        collection_id: parseInt(collectionId) || undefined,
        folder_id: noteFolderId ? parseInt(noteFolderId) : undefined,
        source_type: 'generate',
        content: result,
        meta: { prompt, difficulty, citations: result.citations?.length || 0, grounded: result.grounded },
      })
      setNoteMsg('Saved to notes!')
      setNoteFolderId('')
    } catch (e) { setNoteMsg(e.response?.data?.detail || e.message) }
  }

  const generate = async () => {
    if (!collectionId) return setError('Select a collection')
    if (!prompt.trim()) return setError('Enter a prompt')
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await api.post('/generate', { collection_id: parseInt(collectionId), prompt, difficulty })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="card section-card">
      <h3>Generate grounded content</h3>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12, marginTop:10 }}>
        <select value={collectionId} onChange={e=>setCollectionId(e.target.value)} style={{ flex:1 }}>
          <option value="">Select Collection/Subject</option>
          {collections.map(c=> <option key={c.id} value={c.id}>{c.name} - {c.subject} ({c.class_level||''}) {c.teacher_name? `by ${c.teacher_name}`:''} </option>)}
        </select>
        <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="e.g., Create a lesson on Newton's laws for Class 11 students." rows={3} style={{ width:'100%' }} />
      <button onClick={generate} disabled={loading} className="btn btn-primary" style={{ marginTop:12, opacity: loading?0.6:1 }}>
        {loading ? 'Generating...' : 'Generate (RAG Grounded)'}
      </button>
      {error && <div style={{ marginTop:12, color:'var(--red)', background:'var(--pink-soft)', padding:10, borderRadius:10 }}>{error}</div>}
      {result && (
        <div style={{ marginTop:20 }}>
          {result.abstained && <div style={{ background:'var(--blue-soft)', padding:10, borderRadius:10, marginBottom:12, border:'1px solid var(--blue-border)' }}>🛑 Not generated — insufficient curriculum evidence. {result.warning}</div>}
          {!result.abstained && result.warning && <div style={{ background:'var(--yellow-soft)', padding:10, borderRadius:10, marginBottom:12, border:'1px solid var(--yellow-border)' }}>⚠️ {result.warning}</div>}
          <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ background: result.grounded ? 'var(--mint)' : 'var(--pink-soft)', padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:600 }}>{result.grounded ? '✅ Grounded' : '⚠️ Ungrounded'}</span>
            <span style={{ fontSize:12, color:'var(--muted)' }}>{result.citations.length} citations • {result.retrieved_chunks.length} chunks retrieved</span>
            {result.evidence_status && <span style={{ background: result.evidence_status==='sufficient' ? 'var(--mint)' : 'var(--pink-soft)', padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:600 }}>Evidence: {result.evidence_status}{result.evidence_score!=null ? ` (${result.evidence_score.toFixed(2)})` : ''}{result.repair_used ? ' • repaired' : ''}</span>}
            {!result.abstained && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={noteFolderId} onChange={e=>setNoteFolderId(e.target.value)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)', fontSize: 12 }}>
                  <option value="">— No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button onClick={saveNote} style={{ background:'var(--primary-dark)', color:'white', border:'none', padding:'5px 14px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:600 }}>📌 Save as Note</button>
              </div>
            )}
          </div>
          {noteMsg && <div style={{ fontSize:12, color:'var(--green)', marginBottom:8 }}>{noteMsg}</div>}
          {result.alignment_warning && <div style={{ background:'var(--lavender)', padding:10, borderRadius:10, marginBottom:12, border:'1px solid var(--lavender-line)', fontSize:13 }}>📐 {result.alignment_warning}</div>}
          {result.citation_issues && result.citation_issues.length>0 && <div style={{ background:'var(--pink-soft)', padding:10, borderRadius:10, marginBottom:12, border:'1px solid var(--pink)', fontSize:13 }}>📎 Citation check: {result.citation_issues.join(' ')}</div>}

          <Section title="Explanation" content={result.explanation} />
          <ListSection title="Key Concepts" items={result.key_concepts} />
          <ListSection title="Worked Examples" items={result.worked_examples} />
          <MCQSection mcqs={result.mcqs} />
          <DescriptiveSection items={result.descriptive_questions} />
          <QuizSection quiz={result.quiz} />
          <Section title="Revision Notes" content={result.revision_notes} />

          <div style={{ marginTop:16, background:'var(--paper)', padding:12, borderRadius:12, border:'1px solid var(--line)' }}>
            <h4 style={{ marginTop:0 }}>Source references &amp; retrieved chunks</h4>
            {result.citations.map((c,i)=><div key={i} style={{ fontSize:13, marginBottom:6, background:'var(--card)', padding:8, borderRadius:8, border:'1px solid var(--line)' }}><b>[{c.source}, p.{c.page}]</b> - {c.text_snippet}</div>)}
            <details style={{ marginTop:10 }}><summary style={{ cursor:'pointer', fontSize:13, fontWeight:600 }}>View Retrieved Chunks ({result.retrieved_chunks.length})</summary>
              {result.retrieved_chunks.map((ch,i)=><div key={i} style={{ fontSize:12, background:'var(--card)', margin:'6px 0', padding:8, borderRadius:8, borderLeft:'3px solid var(--primary)' }}><div style={{ color:'var(--muted)' }}>Score: {ch.score?.toFixed(3)} | Source: {ch.metadata?.source} p.{ch.metadata?.page}</div>{ch.text.slice(0,500)}...</div>)}
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, content }) {
  if(!content) return null
  return <div style={{ marginTop:16 }}><h4>{title}</h4><MathText style={{ whiteSpace:'pre-wrap', background:'var(--paper)', padding:12, borderRadius:6, border:'1px solid var(--line)' }}>{content}</MathText></div>
}
function ListSection({ title, items }) {
  if(!items || items.length===0) return null
  return <div style={{ marginTop:16 }}><h4>{title}</h4><ul style={{ background:'var(--paper)', padding:'12px 12px 12px 24px', borderRadius:6, border:'1px solid var(--line)' }}>{items.map((x,i)=><li key={i} style={{ marginBottom:6 }}><MathText as="span">{x}</MathText></li>)}</ul></div>
}
function MCQSection({ mcqs }) {
  if(!mcqs || mcqs.length===0) return null
  return <div style={{ marginTop:16 }}><h4>Multiple choice questions</h4>{mcqs.map((m,i)=><div key={i} style={{ background:'var(--paper)', padding:12, borderRadius:6, marginBottom:8, border:'1px solid var(--line)' }}><MathText as="div" style={{ fontWeight:600 }}>{'Q' + (i+1) + ': ' + m.question}</MathText><ul>{m.options?.map((o,j)=><li key={j}><MathText as="span">{o}</MathText></li>)}</ul><div style={{ color:'var(--green)', fontWeight:600 }}>Answer: <MathText as="span">{m.answer}</MathText></div>{m.explanation && <MathText style={{ fontSize:13, color:'var(--muted)' }}>{m.explanation}</MathText>}</div>)}</div>
}
function DescriptiveSection({ items }) {
  if(!items || items.length===0) return null
  return <div style={{ marginTop:16 }}><h4>Descriptive questions</h4>{items.map((d,i)=><div key={i} style={{ background:'var(--paper)', padding:12, borderRadius:6, marginBottom:8, border:'1px solid var(--line)' }}><MathText as="div" style={{ fontWeight:600 }}>{'Q' + (i+1) + ': ' + d.question}</MathText><MathText style={{ marginTop:6, whiteSpace:'pre-wrap' }}>{d.answer}</MathText></div>)}</div>
}
function QuizSection({ quiz }) {
  if(!quiz || quiz.length===0) return null
  return <div style={{ marginTop:16 }}><h4>Difficulty-based quiz</h4>{quiz.map((q,i)=><div key={i} style={{ background:'var(--paper)', padding:12, borderRadius:6, marginBottom:8, border:'1px solid var(--line)' }}><span style={{ background: q.difficulty==='easy'?'var(--mint)': q.difficulty==='hard'?'var(--pink-soft)':'var(--yellow-soft)', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:600 }}>{q.difficulty}</span><MathText as="span" style={{ fontWeight:600 }}>{' Q' + (i+1) + ': ' + q.question}</MathText><MathText style={{ marginTop:6 }}>{q.answer}</MathText></div>)}</div>
}
