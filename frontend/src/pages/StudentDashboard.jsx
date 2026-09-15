import { useEffect, useState } from 'react'
import api from '../api'
import GenerateView from '../components/GenerateView'

export default function StudentDashboard() {
  const [catalog, setCatalog] = useState([])
  const [collections, setCollections] = useState([])

  const load = async () => {
    const cat = await api.get('/catalog')
    setCatalog(cat.data)
    const cols = await api.get('/collections')
    setCollections(cols.data)
  }
  useEffect(()=>{ load() }, [])

  return (
    <div style={{ maxWidth:1100, margin:'20px auto', padding:'0 16px' }}>
      <h2>Student Dashboard</h2>
      <p style={{ color:'#666' }}>You can only <b>view PDF names</b> and generate content from teacher-uploaded collections. No upload, no preview - to stay grounded and avoid out-of-syllabus queries.</p>

      <div style={{ background:'white', padding:16, borderRadius:12, border:'1px solid #ddd' }}>
        <h3>📚 Available Collections / Syllabus (Read-Only)</h3>
        {catalog.length===0 ? <div style={{ color:'#999' }}>No collections uploaded yet by teachers. Ask your teacher to upload textbooks/notes.</div> :
          catalog.map(c=>(
            <div key={c.id} style={{ padding:12, border:'1px solid #eee', borderRadius:8, marginBottom:10, background:'#fafafa' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <b>{c.name}</b> <span style={{ background:'#e3f2fd', padding:'2px 8px', borderRadius:12, fontSize:12 }}>{c.pdf_count} PDFs</span>
              </div>
              <div style={{ fontSize:13, color:'#666' }}>{c.subject} • {c.class_level || 'General'} • Teacher: {c.teacher_name} ({c.teacher_email})</div>
              {c.description && <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{c.description}</div>}
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:12, fontWeight:600 }}>📄 PDFs Uploaded (names only - no preview):</div>
                {c.pdf_names.length===0 ? <span style={{ fontSize:12, color:'#999' }}>No PDFs yet</span> :
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {c.pdf_names.map((n,i)=><span key={i} style={{ background:'white', border:'1px solid #ddd', padding:'4px 8px', borderRadius:6, fontSize:12 }}>📄 {n}</span>)}
                  </div>
                }
              </div>
              <div style={{ fontSize:11, color:'#999', marginTop:6 }}>ID: {c.id} • Use this collection in Generate below</div>
            </div>
          ))
        }
      </div>

      <GenerateView collections={collections} />

      <div style={{ marginTop:16, background:'#fff3e0', padding:12, borderRadius:8, border:'1px solid #ffe0b2', fontSize:13 }}>
        <b>Note for Students:</b> You can only query content from PDFs listed above. If you ask something not in syllabus, the system will reply <i>"Not found in uploaded syllabus"</i> to prevent hallucination. This ensures syllabus coverage and factual correctness.
      </div>
    </div>
  )
}
