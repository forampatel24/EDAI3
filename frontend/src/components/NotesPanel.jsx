import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import NoteEditor from './NoteEditor'

export default function NotesPanel() {
  const [folders, setFolders] = useState([])
  const [notes, setNotes] = useState([])
  const [folderFilter, setFolderFilter] = useState('')   // '', '__none__', or folder id string
  const [newFolder, setNewFolder] = useState('')
  const [editing, setEditing] = useState(null)           // note object being edited
  const [menu, setMenu] = useState(null)                 // { x, y, note }
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      let notesData
      if (folderFilter === '__none__') {
        const res = await api.get('/notes')
        notesData = res.data.filter((n) => !n.folder_id)
      } else {
        const url = folderFilter ? `/notes?folder_id=${folderFilter}` : '/notes'
        const res = await api.get(url)
        notesData = res.data
      }
      const fRes = await api.get('/notes/folders')
      setFolders(fRes.data)
      setNotes(notesData)
    } catch (e) {
      setMsg(e.response?.data?.detail || e.message)
    }
  }, [folderFilter])

  useEffect(() => { load() }, [load])

  // close context menu on outside click / escape / scroll / resize
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    document.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [menu])

  // close edit modal on Escape
  useEffect(() => {
    if (!editing) return
    const onKey = (e) => { if (e.key === 'Escape') setEditing(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  const addFolder = async () => {
    if (!newFolder.trim()) return
    try {
      await api.post('/notes/folders', { name: newFolder.trim() })
      setNewFolder('')
      setMsg('Folder created')
      load()
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
  }

  const startEdit = (note) => {
    setEditing(note)
    setMenu(null)
  }

  const cancelEdit = () => {
    setEditing(null)
  }

  const saveNote = async (draft) => {
    if (!editing) return
    setSaving(true)
    try {
      const payload = { title: draft.title, content: draft.content }
      if (draft.folderAction) {
        if (draft.folderAction.folder_id) payload.folder_id = draft.folderAction.folder_id
        if (draft.folderAction.clear_folder) payload.clear_folder = true
      }
      const res = await api.put(`/notes/${editing.id}`, payload)
      setEditing(res.data)
      setMsg('Note saved!')
      load()
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  const moveTo = async (note, folderId) => {
    setMenu(null)
    try {
      const payload = folderId ? { folder_id: folderId } : { clear_folder: true }
      const res = await api.put(`/notes/${note.id}`, payload)
      const destination = res.data.folder_name || 'No folder'
      setMsg(`Moved "${note.title}" to ${destination}`)
      if (editing?.id === note.id) setEditing(res.data)
      load()
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
  }

  const delNote = async (note) => {
    setMenu(null)
    if (!confirm(`Delete note "${note.title}"?`)) return
    try {
      await api.delete(`/notes/${note.id}`)
      if (editing?.id === note.id) setEditing(null)
      setMsg('Note deleted')
      load()
    } catch (e) { setMsg(e.response?.data?.detail || e.message) }
  }

  const openMenu = (e, note) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, note })
  }

  const openMenuButton = (e, note) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({ x: r.left, y: r.bottom + 4, note })
  }

  return (
    <div className="card section-card" style={{ position: 'relative' }}>
      <h3>Personalized notes</h3>
      <p className="card-sub" style={{ marginBottom: 12 }}>
        Save useful AI answers once, revisit before exams. Sources stay attached to every note.
      </p>

      {msg && (
        <div style={{ background: 'var(--mint)', border: '1px solid var(--mint-border)', padding: 8, borderRadius: 8, fontSize: 13, marginBottom: 8 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          placeholder="New folder e.g., Physics Revision"
          value={newFolder}
          onChange={e => setNewFolder(e.target.value)}
          style={{ ...inp, flex: 1 }}
        />
        <button onClick={addFolder} style={btn}>Add Folder</button>
      </div>

      <div className="notes-grid">
        <div style={{ minWidth: 260, maxWidth: 320, flexShrink: 0 }}>
          <h5>Folders</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setFolderFilter('')}
              style={{
                ...folderChipStyle,
                background: folderFilter === '' ? 'var(--primary)' : 'var(--card)',
                color: folderFilter === '' ? 'white' : 'var(--ink)',
                borderColor: folderFilter === '' ? 'var(--primary)' : 'var(--line)',
              }}
            >
              <span>📂 All notes</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>{notes.length}</span>
            </button>
            <button
              onClick={() => setFolderFilter('__none__')}
              style={{
                ...folderChipStyle,
                background: folderFilter === '__none__' ? 'var(--yellow-soft)' : 'var(--card)',
                color: folderFilter === '__none__' ? 'var(--yellow-ink)' : 'var(--ink)',
                borderColor: folderFilter === '__none__' ? 'var(--yellow-border)' : 'var(--line)',
              }}
            >
              <span>📄 No folder</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>
                {notes.filter((n) => !n.folder_id).length}
              </span>
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderFilter(String(f.id))}
                style={{
                  ...folderChipStyle,
                  background: folderFilter === String(f.id) ? 'var(--blue-soft)' : 'var(--card)',
                  color: folderFilter === String(f.id) ? 'var(--primary-dark)' : 'var(--ink)',
                  borderColor: folderFilter === String(f.id) ? 'var(--blue-border)' : 'var(--line)',
                }}
              >
                <span>📁 {f.name}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{f.note_count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h5>Notes ({notes.length})</h5>
          {notes.length === 0 ? (
            <div style={{ color: 'var(--faint)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              {folderFilter ? 'No notes in this folder.' : 'No notes yet. Generate content, then Save as Note.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  onContextMenu={(e) => openMenu(e, n)}
                  onClick={() => startEdit(n)}
                  className="note-row"
                  style={{
                    ...noteRowStyle,
                    borderColor: editing?.id === n.id ? 'var(--primary)' : 'var(--line)',
                    background: editing?.id === n.id ? 'var(--blue-soft)' : 'var(--card)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {n.folder_name ? `📁 ${n.folder_name}` : '📄 No folder'}
                      {n.collection_name && ` • ${n.collection_name}`}
                      {` • ${n.source_type}`}
                    </div>
                  </div>
                  <button
                    className="note-more"
                    onClick={(e) => openMenuButton(e, n)}
                    aria-label="More actions"
                    style={noteMoreStyle}
                  >
                    ⋯
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context menu for move/delete */}
      {menu && (
        <div
          style={{
            position: 'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 1000,
            background: 'var(--card)',
            border: '1px solid var(--line-strong)',
            borderRadius: 10,
            boxShadow: 'var(--shadow)',
            minWidth: 200,
            padding: '6px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => { startEdit(menu.note); setMenu(null) }}
            style={menuItemStyle}
          >
            ✏️ Edit
          </div>
          <div style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Move to folder
          </div>
          {folders.map((f) => (
            <div
              key={f.id}
              onClick={() => moveTo(menu.note, f.id)}
              style={menuItemStyle}
            >
              📁 {f.name}
            </div>
          ))}
          <div
            onClick={() => moveTo(menu.note, null)}
            style={menuItemStyle}
          >
            📄 No folder
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '6px 0' }} />
          <div
            onClick={() => delNote(menu.note)}
            style={{ ...menuItemStyle, color: 'var(--red)' }}
          >
            🗑 Delete
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" onClick={cancelEdit} style={overlayStyle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Edit Note</h4>
              <button onClick={cancelEdit} style={closeBtn} aria-label="Close">✕</button>
            </div>
            <NoteEditor
              note={editing}
              folders={folders}
              onSave={saveNote}
              onCancel={cancelEdit}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const inp = { padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)', fontSize: 13.5 }
const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }
const folderChipStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid', borderRadius: 10, cursor: 'pointer', fontSize: 13, textAlign: 'left', width: '100%' }
const noteRowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid', borderRadius: 10, cursor: 'pointer', transition: 'background 0.1s, border-color 0.1s' }
const noteMoreStyle = { opacity: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4, color: 'var(--muted)', transition: 'opacity 0.15s' }
const menuItemStyle = { padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--ink)' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modalStyle = { background: 'var(--card)', border: '1px solid var(--line-strong)', borderRadius: 14, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }
const closeBtn = { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: 4 }