import { useEffect, useState } from 'react'
import api from '../api'
import GenerateView from '../components/GenerateView'

export default function TeacherDashboard() {
  const [collections, setCollections] = useState([])
  const [myCollections, setMyCollections] = useState([])
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [classLevel, setClassLevel] = useState('Class 11')
  const [desc, setDesc] = useState('')
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [uploadFiles, setUploadFiles] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await api.get('/collections')
    setCollections(res.data)
    const my = await api.get('/collections/my')
    setMyCollections(my.data)
  }
  useEffect(()=>{ load() }, [])

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.post('/collections', { name, subject, class_level: classLevel, description: desc })
      setName(''); setSubject(''); setDesc(''); setMsg('Collection created!')
      load()
    } catch(err){ setMsg(err.response?.data?.detail || err.message) }
  }

  const selectCollection = async (c) => {
    setSelected(c)
    const res = await api.get(`/collections/${c.id}/documents`)
    setDocs(res.data)
  }

  const upload = async () => {
    if(!selected || !uploadFiles) return setMsg('Select PDFs')
    const form = new FormData()
    for(let f of uploadFiles) form.append('files', f)
    try {
      setMsg('Uploading & embedding... (may take 20s for large PDFs)')
      const res = await api.post(`/collections/${selected.id}/upload`, form, { headers: {'Content-Type':'multipart/form-data'} })
      setMsg(`Uploaded ${res.data.files.length} PDFs, chunks created!`)
      const r = await api.get(`/collections/${selected.id}/documents`)
      setDocs(r.data); load()
    } catch(err){ setMsg(err.response?.data?.detail || err.message) }
  }

  const delDoc = async (id) => {
    await api.delete(`/collections/documents/${id}`)
    setDocs(docs.filter(d=>d.id!==id)); setMsg('Document deleted'); load()
  }
  const delCol = async (id) => {
    if(!confirm('Delete collection and all PDFs?')) return
    await api.delete(`/collections/${id}`)
    setSelected(null); load()
  }

  return (
    <div style={{ maxWidth:1100, margin:'20px auto', padding:'0 16px' }}>
      <h2>Teacher Dashboard</h2>
      <p style={{ color:'#666' }}>Create subject-wise collections, upload multiple PDFs per collection, manage & generate grounded content.</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'white', padding:16, borderRadius:12, border:'1px solid #ddd' }}>
          <h3>Create Collection</h3>
          <form onSubmit={create} style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <input placeholder="Collection Name e.g., Physics - Mechanics" value={name} onChange={e=>setName(e.target.value)} required style={inp} />
            <input placeholder="Subject e.g., Physics" value={subject} onChange={e=>setSubject(e.target.value)} required style={inp} />
            <input placeholder="Class Level e.g., Class 11" value={classLevel} onChange={e=>setClassLevel(e.target.value)} style={inp} />
            <input placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} style={inp} />
            <button type="submit" style={btn}>Create Collection</button>
          </form>
          {msg && <div style={{ marginTop:8, background:'#e8f5e9', padding:8, borderRadius:6, fontSize:13 }}>{msg}</div>}
        </div>

        <div style={{ background:'white', padding:16, borderRadius:12, border:'1px solid #ddd' }}>
          <h3>My Collections ({myCollections.length})</h3>
          {myCollections.length===0 && <div style={{ color:'#999' }}>No collections yet. Create one.</div>}
          {myCollections.map(c=>(
            <div key={c.id} onClick={()=>selectCollection(c)} style={{ padding:10, marginBottom:8, border: selected?.id===c.id?'2px solid #1a237e':'1px solid #ddd', borderRadius:8, cursor:'pointer', background: selected?.id===c.id?'#e8eaf6':'white' }}>
              <b>{c.name}</b> <span style={{ color:'#666', fontSize:12 }}>({c.subject} • {c.class_level})</span>
              <div style={{ fontSize:12, color:'#666' }}>{c.document_count} PDFs • {c.chroma_collection_name}</div>
              <button onClick={(e)=>{e.stopPropagation(); delCol(c.id)}} style={{ fontSize:11, background:'#ffcdd2', border:'none', padding:'2px 6px', borderRadius:4, cursor:'pointer', marginTop:4 }}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop:16, background:'white', padding:16, borderRadius:12, border:'1px solid #ddd' }}>
          <h3>Manage: {selected.name} ({selected.subject})</h3>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input type="file" multiple accept=".pdf" onChange={e=>setUploadFiles(e.target.files)} />
            <button onClick={upload} style={btn}>Upload PDFs to this Collection</button>
          </div>
          <p style={{ fontSize:12, color:'#666' }}>Upload multiple PDFs (textbooks, notes, question banks). Chunking 600 tokens, embedding with MiniLM, stored in Chroma: {selected.chroma_collection_name}</p>

          <h4>My Uploaded PDFs ({docs.length}) - With Preview</h4>
          {docs.length===0 ? <div style={{ color:'#999' }}>No PDFs yet. Upload to start RAG.</div> :
            docs.map(d=>(
              <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, border:'1px solid #eee', borderRadius:6, marginBottom:6 }}>
                <div><b>{d.original_filename}</b><div style={{ fontSize:12, color:'#666' }}>{d.pages} pages • {d.chunks} chunks • {new Date(d.created_at).toLocaleString()}</div></div>
                <div style={{ display:'flex', gap:6 }}>
                  <a href={`http://localhost:8000/uploads/${d.filename}`} target="_blank" style={{ background:'#e3f2fd', padding:'6px 10px', borderRadius:6, textDecoration:'none', fontSize:12 }}>Preview</a>
                  <button onClick={()=>delDoc(d.id)} style={{ background:'#ffcdd2', border:'none', padding:'6px 10px', borderRadius:6, cursor:'pointer', fontSize:12 }}>Delete</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <GenerateView collections={collections} defaultCollectionId={selected?.id} />

      <div style={{ marginTop:16, background:'white', padding:16, borderRadius:12, border:'1px solid #ddd' }}>
        <h4>All Collections Catalog (Teacher view - same as student but with preview access via Manage)</h4>
        {collections.map(c=>(
          <div key={c.id} style={{ fontSize:13, padding:6, borderBottom:'1px solid #f0f0f0' }}>
            <b>{c.name}</b> ({c.subject}) by {c.teacher_name} • {c.document_count} PDFs
          </div>
        ))}
      </div>
    </div>
  )
}
const inp = { padding:8, borderRadius:6, border:'1px solid #ccc' }
const btn = { background:'#1a237e', color:'white', border:'none', padding:'8px 14px', borderRadius:6, cursor:'pointer' }
