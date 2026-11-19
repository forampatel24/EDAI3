import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import api, { API_BASE } from '../../api'
import Icon from '../../components/Icon'

export default function TeacherCollections() {
  const { myCollections, reload } = useOutletContext()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [classLevel, setClassLevel] = useState('Class 11')
  const [desc, setDesc] = useState('')
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [uploadFiles, setUploadFiles] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await api.post('/collections', { name, subject, class_level: classLevel, description: desc })
      setName(''); setSubject(''); setDesc('')
      setMsg('Collection created!')
      reload()
    } catch (err) { setMsg(err.response?.data?.detail || err.message) }
  }

  const selectCollection = async (c) => {
    setSelected(c)
    setMsg('')
    try {
      const res = await api.get(`/collections/${c.id}/documents`)
      setDocs(res.data)
    } catch (err) { setMsg(err.response?.data?.detail || err.message) }
  }

  const upload = async () => {
    if (!selected || !uploadFiles?.length) return setMsg('Select PDFs first')
    const form = new FormData()
    for (const f of uploadFiles) form.append('files', f)
    setBusy(true)
    setMsg('Uploading & embedding… (may take ~20s for large PDFs)')
    try {
      const res = await api.post(`/collections/${selected.id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg(`Uploaded ${res.data.files.length} PDFs and embedded their chunks.`)
      const r = await api.get(`/collections/${selected.id}/documents`)
      setDocs(r.data)
      reload()
    } catch (err) { setMsg(err.response?.data?.detail || err.message) }
    finally { setBusy(false); setUploadFiles(null) }
  }

  const delDoc = async (id) => {
    try {
      await api.delete(`/collections/documents/${id}`)
      setDocs(docs.filter((d) => d.id !== id))
      setMsg('Document deleted')
      reload()
    } catch (err) { setMsg(err.response?.data?.detail || err.message) }
  }

  const delCol = async (id) => {
    if (!confirm('Delete this collection and all of its PDFs?')) return
    try {
      await api.delete(`/collections/${id}`)
      setSelected(null)
      setDocs([])
      reload()
    } catch (err) { setMsg(err.response?.data?.detail || err.message) }
  }

  return (
    <>
      <div className="bento-grid bento-grid-2" style={{ marginBottom: 18 }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <h2>Create a collection</h2>
          <p className="card-sub">A collection is one subject corpus. Only PDFs in it can ground generated content.</p>
          <form onSubmit={create} className="editor-stack" style={{ gap: 12 }}>
            <input placeholder="Collection name, e.g. Physics — Mechanics" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="Subject, e.g. Physics" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <input placeholder="Class level, e.g. Class 11" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
            <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <button type="submit" className="btn btn-primary">Create collection</button>
          </form>
          {msg && <div className="banner banner-ok" style={{ marginTop: 10 }}><Icon name="check" /><span>{msg}</span></div>}
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <h2>My collections ({myCollections.length})</h2>
          {myCollections.length === 0 && (
            <div className="empty-state">
              <div className="empty-ico"><Icon name="folder" /></div>
              <div className="empty-title">No collections yet</div>
              <div className="empty-text">Create one on the left to start building your PDF corpus.</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myCollections.map((c) => (
              <div
                key={c.id}
                onClick={() => selectCollection(c)}
                className={`list-card${selected?.id === c.id ? ' active' : ''}`}
                style={{ cursor: 'pointer', padding: '14px 16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                    <div className="meta-line" style={{ marginTop: 2 }}>{c.subject} · {c.class_level}</div>
                    <div className="meta-line" style={{ marginTop: 2, fontSize: 12.5 }}>{c.document_count} PDF{c.document_count === 1 ? '' : 's'} · {c.chroma_collection_name}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); delCol(c.id) }} className="btn btn-xs btn-danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="glass-card" style={{ marginTop: 16, padding: 22 }}>
          <h2>Manage: {selected.name} <span style={{ fontSize: '0.75em', color: 'var(--muted)', fontWeight: 500 }}>({selected.subject})</span></h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' }}>
            <input type="file" multiple accept=".pdf" onChange={(e) => setUploadFiles(e.target.files)} />
            <button onClick={upload} disabled={busy} className="btn btn-primary">
              {busy ? 'Uploading…' : 'Upload PDFs'}
            </button>
          </div>
          <p className="card-sub">
            Chunked at ~600 tokens, embedded with MiniLM and stored in Chroma: <code>{selected.chroma_collection_name}</code>
          </p>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', margin: '16px 0 10px', color: 'var(--ink-strong)' }}>Uploaded PDFs ({docs.length})</h3>
          {docs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-ico"><Icon name="file" /></div>
              <div className="empty-title">No PDFs yet</div>
              <div className="empty-text">Upload source PDFs above — generated content can only cite these.</div>
            </div>
          ) : (
            docs.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: '10px', marginBottom: '8px', background: 'var(--card)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{d.original_filename}</div>
                  <div className="meta-line" style={{ marginTop: 2, fontSize: 12.5 }}>{d.pages} pages · {d.chunks} chunks · {new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <a href={`${API_BASE}/uploads/${d.filename}`} target="_blank" rel="noreferrer" style={{ background: 'var(--accent-blue)', padding: '6px 12px', borderRadius: '7px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', color: 'var(--primary-dark)', border: '1px solid var(--blue-border)' }}>Preview</a>
                  <button onClick={() => delDoc(d.id)} className="btn btn-xs btn-danger">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}