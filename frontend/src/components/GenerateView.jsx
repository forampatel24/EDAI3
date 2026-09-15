import { useState } from 'react'
import api from '../api'

export default function GenerateView({ collections, defaultCollectionId }) {
  const [collectionId, setCollectionId] = useState(defaultCollectionId || '')
  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

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
    <div style={{ marginTop:24, border:'1px solid #ddd', borderRadius:12, padding:20, background:'white' }}>
      <h3 style={{ marginTop:0 }}>Generate Grounded Content</h3>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
        <select value={collectionId} onChange={e=>setCollectionId(e.target.value)} style={{ flex:1, padding:8, borderRadius:6, border:'1px solid #ccc' }}>
          <option value="">Select Collection/Subject</option>
          {collections.map(c=> <option key={c.id} value={c.id}>{c.name} - {c.subject} ({c.class_level||''}) {c.teacher_name? `by ${c.teacher_name}`:''} </option>)}
        </select>
        <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} style={{ padding:8, borderRadius:6, border:'1px solid #ccc' }}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="e.g., Create a lesson on Newton's laws for Class 11 students." rows={3} style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc' }} />
      <button onClick={generate} disabled={loading} style={{ marginTop:10, background:'#1a237e', color:'white', border:'none', padding:'10px 18px', borderRadius:6, cursor:'pointer', opacity: loading?0.6:1 }}>
        {loading ? 'Generating...' : 'Generate (RAG Grounded)'}
      </button>
      {error && <div style={{ marginTop:12, color:'red', background:'#ffebee', padding:10, borderRadius:6 }}>{error}</div>}
      {result && (
        <div style={{ marginTop:20 }}>
          {result.warning && <div style={{ background:'#fff3e0', padding:10, borderRadius:6, marginBottom:12, border:'1px solid #ffb74d' }}>⚠️ {result.warning}</div>}
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <span style={{ background: result.grounded ? '#e8f5e9' : '#ffebee', padding:'4px 8px', borderRadius:6, fontSize:12 }}>{result.grounded ? '✅ Grounded' : '⚠️ Ungrounded'}</span>
            <span style={{ fontSize:12, color:'#666' }}>{result.citations.length} citations • {result.retrieved_chunks.length} chunks retrieved</span>
          </div>

          <Section title="📖 Explanation" content={result.explanation} />
          <ListSection title="🔑 Key Concepts" items={result.key_concepts} />
          <ListSection title="📝 Worked Examples" items={result.worked_examples} />
          <MCQSection mcqs={result.mcqs} />
          <DescriptiveSection items={result.descriptive_questions} />
          <QuizSection quiz={result.quiz} />
          <Section title="📋 Revision Notes" content={result.revision_notes} />

          <div style={{ marginTop:16, background:'#f5f5f5', padding:12, borderRadius:8 }}>
            <h4>📚 Source References & Retrieved Chunks</h4>
            {result.citations.map((c,i)=><div key={i} style={{ fontSize:13, marginBottom:6, background:'white', padding:8, borderRadius:6 }}><b>[{c.source}, p.{c.page}]</b> - {c.text_snippet}</div>)}
            <details style={{ marginTop:10 }}><summary style={{ cursor:'pointer' }}>View Retrieved Chunks ({result.retrieved_chunks.length})</summary>
              {result.retrieved_chunks.map((ch,i)=><div key={i} style={{ fontSize:12, background:'white', margin:'6px 0', padding:8, borderRadius:6, borderLeft:'3px solid #1a237e' }}><div style={{ color:'#666' }}>Score: {ch.score?.toFixed(3)} | Source: {ch.metadata?.source} p.{ch.metadata?.page}</div>{ch.text.slice(0,500)}...</div>)}
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, content }) {
  if(!content) return null
  return <div style={{ marginTop:16 }}><h4>{title}</h4><div style={{ whiteSpace:'pre-wrap', background:'#fafafa', padding:12, borderRadius:6, border:'1px solid #eee' }}>{content}</div></div>
}
function ListSection({ title, items }) {
  if(!items || items.length===0) return null
  return <div style={{ marginTop:16 }}><h4>{title}</h4><ul style={{ background:'#fafafa', padding:'12px 12px 12px 24px', borderRadius:6, border:'1px solid #eee' }}>{items.map((x,i)=><li key={i} style={{ marginBottom:6 }}>{x}</li>)}</ul></div>
}
function MCQSection({ mcqs }) {
  if(!mcqs || mcqs.length===0) return null
  return <div style={{ marginTop:16 }}><h4>❓ Multiple Choice Questions</h4>{mcqs.map((m,i)=><div key={i} style={{ background:'#fafafa', padding:12, borderRadius:6, marginBottom:8, border:'1px solid #eee' }}><b>Q{i+1}: {m.question}</b><ul>{m.options?.map((o,j)=><li key={j}>{o}</li>)}</ul><div style={{ color:'#2e7d32', fontWeight:600 }}>Answer: {m.answer}</div>{m.explanation && <div style={{ fontSize:13, color:'#666' }}>{m.explanation}</div>}</div>)}</div>
}
function DescriptiveSection({ items }) {
  if(!items || items.length===0) return null
  return <div style={{ marginTop:16 }}><h4>✍️ Descriptive Questions</h4>{items.map((d,i)=><div key={i} style={{ background:'#fafafa', padding:12, borderRadius:6, marginBottom:8, border:'1px solid #eee' }}><b>Q{i+1}: {d.question}</b><div style={{ marginTop:6, whiteSpace:'pre-wrap' }}>{d.answer}</div></div>)}</div>
}
function QuizSection({ quiz }) {
  if(!quiz || quiz.length===0) return null
  return <div style={{ marginTop:16 }}><h4>🎯 Difficulty-Based Quiz</h4>{quiz.map((q,i)=><div key={i} style={{ background:'#fafafa', padding:12, borderRadius:6, marginBottom:8, border:'1px solid #eee' }}><span style={{ background: q.difficulty==='easy'?'#c8e6c9': q.difficulty==='hard'?'#ffcdd2':'#fff9c4', padding:'2px 6px', borderRadius:4, fontSize:11 }}>{q.difficulty}</span><b> Q{i+1}: {q.question}</b><div style={{ marginTop:6 }}>{q.answer}</div></div>)}</div>
}
