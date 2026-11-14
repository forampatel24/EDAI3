import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import api, { API_BASE } from '../../api'

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
      <div className="split">
        <div className="card">
          <h2>Create a collection</h2>
          <p className="card-sub">A collection is one subject corpus. Only PDFs in it can ground generated content.</p>
          <form onSubmit={create} className="form-col">
            <input placeholder="Collection name, e.g. Physics — Mechanics" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="Subject, e.g. Physics" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <input placeholder="Class level, e.g. Class 11" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
            <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <button type="submit" className="btn btn-primary">Create collection</button>
          </form>
          {msg && <div className="inline-msg">{msg}</div>}
        </div>

        <div className="card">
          <h2>My collections ({myCollections.length})</h2>
          {myCollections.length === 0 && <p className="card-sub">No collections yet — create one on the left.</p>}
          <div className="pick-list">
            {myCollections.map((c) => (
              <div
                key={c.id}
                onClick={() => selectCollection(c)}
                className={'pick-item' + (selected?.id === c.id ? ' active' : '')}
              >
                <div className="pick-title">
                  <b>{c.name}</b>
                  <span className="pick-meta">{c.subject} · {c.class_level}</span>
                </div>
                <div className="pick-meta">{c.document_count} PDF{c.document_count === 1 ? '' : 's'} · {c.chroma_collection_name}</div>
                <button onClick={(e) => { e.stopPropagation(); delCol(c.id) }} className="btn-tiny btn-danger">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="card section-gap">
          <h2>Manage: {selected.name} <span className="heading-sub">({selected.subject})</span></h2>
          <div className="row-wrap">
            <input type="file" multiple accept=".pdf" onChange={(e) => setUploadFiles(e.target.files)} />
            <button onClick={upload} disabled={busy} className="btn btn-primary">
              {busy ? 'Uploading…' : 'Upload PDFs'}
            </button>
          </div>
          <p className="card-sub">
            Chunked at ~600 tokens, embedded with MiniLM and stored in Chroma: <code>{selected.chroma_collection_name}</code>
          </p>

          <h3 className="inner-title">Uploaded PDFs ({docs.length})</h3>
          {docs.length === 0 ? (
            <p className="card-sub">No PDFs yet — upload some to start grounding.</p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="doc-row">
                <div>
                  <b>{d.original_filename}</b>
                  <div className="pick-meta">{d.pages} pages · {d.chunks} chunks · {new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div className="row-actions">
                  <a href={`${API_BASE}/uploads/${d.filename}`} target="_blank" rel="noreferrer" className="link-chip">Preview</a>
                  <button onClick={() => delDoc(d.id)} className="btn-tiny btn-danger">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
