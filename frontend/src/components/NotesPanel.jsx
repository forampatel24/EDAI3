import { useEffect, useState } from 'react'
import api from '../api'

export default function NotesPanel() {
  const [folders, setFolders] = useState([])
  const [notes, setNotes] = useState([])
  const [folderFilter, setFolderFilter] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [selected, setSelected] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [f, n] = await Promise.all([
      api.get('/notes/folders'),
      api.get(folderFilter ? `/notes?folder_id=${folderFilter}` : '/notes'),
    ])
    setFolders(f.data); setNotes(n.data)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { api.get(folderFilter ? `/notes?folder_id=${folderFilter}` : '/notes').then(r => setNotes(r.data)).catch(() => {}) }, [folderFilter])

  const addFolder = async () => {
    if (!newFolder.trim()) return
    await api.post('/notes/folders', { name: newFolder })
    setNewFolder(''); load()
  }

  const select = (n) => {
    setSelected(n); setEditTitle(n.title)
    setEditText(JSON.stringify(n.content, null, 2))
  }

  const saveEdit = async () => {
    try {
      const parsed = JSON.parse(editText)
      const res = await api.put(`/notes/${selected.id}`, { title: editTitle, content: parsed })
      setSelected(res.data); setMsg('Note saved!'); load()
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
  }

  const delNote = async (id) => {
    if (!confirm('Delete this note?')) return
    await api.delete(`/notes/${id}`)
    if (selected?.id === id) setSelected(null)
    load()
  }

  return (
    <div style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>📌 Personalized Notes — My Revision Library</h3>
      <p style={{ fontSize: 13, color: '#666' }}>Save useful AI answers once, revisit before exams. Sources stay attached to every note.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input placeholder="New folder e.g., Physics Revision" value={newFolder} onChange={e => setNewFolder(e.target.value)} style={{ ...inp, flex: 1 }} />
        <button onClick={addFolder} style={btn}>Add Folder</button>
        <select value={folderFilter} onChange={e => setFolderFilter(e.target.value)} style={inp}>
          <option value="">All folders</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name} ({f.note_count})</option>)}
        </select>
      </div>
      {msg && <div style={{ background: '#e8f5e9', padding: 8, borderRadius: 6, fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <h5>Notes ({notes.length})</h5>
          {notes.length === 0 ? <div style={{ color: '#999', fontSize: 13 }}>No notes yet. Generate content above, then Save as Note.</div> :
            notes.map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, border: selected?.id === n.id ? '2px solid #1a237e' : '1px solid #eee', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ cursor: 'pointer' }} onClick={() => select(n)}>
                  <b>{n.title}</b>
                  <div style={{ fontSize: 11, color: '#666' }}>{n.folder_name || 'No folder'} • {n.collection_name || 'no collection'} • {n.source_type}</div>
                </div>
                <button onClick={() => delNote(n.id)} style={{ background: '#ffcdd2', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
              </div>
            ))}
        </div>
        <div>
          {selected ? (
            <>
              <h5>View / Edit</h5>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={14} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
              <button onClick={saveEdit} style={{ ...btn, marginTop: 8 }}>Save Changes</button>
              {selected.meta && Object.keys(selected.meta).length > 0 && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Sources: {JSON.stringify(selected.meta).slice(0, 200)}</div>
              )}
            </>
          ) : <div style={{ color: '#999', fontSize: 13 }}>Select a note to view or edit.</div>}
        </div>
      </div>
    </div>
  )
}
const inp = { padding: 8, borderRadius: 6, border: '1px solid #ccc' }
const btn = { background: '#1a237e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }
