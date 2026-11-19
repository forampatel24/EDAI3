import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import NoteEditor from './NoteEditor'
import Icon from './Icon'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h3>Personalized notes</h3>
          <p className="card-sub" style={{ marginBottom: 12 }}>
            Save useful AI answers once, revisit before exams. Sources stay attached to every note.
          </p>
        </div>
      </div>

      {msg && <div className="banner banner-ok"><Icon name="check" /><span>{msg}</span></div>}

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          <span className="field-label">New folder</span>
          <input
            placeholder="e.g., Physics Revision"
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
          />
        </label>
        <button onClick={addFolder} className="btn btn-primary">Add folder</button>
      </div>

      <div className="notes-grid" style={{ gap: 20 }}>
        {/* Folders Sidebar */}
        <div style={{ minWidth: 280, maxWidth: 340, flexShrink: 0 }}>
          <h5 style={{ marginBottom: 12, color: 'var(--ink)' }}>Folders</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setFolderFilter('')}
              className={`folder-chip${folderFilter === '' ? ' active' : ''}`}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="layers" size={16} /> All notes</span>
              <span className="count">{notes.length}</span>
            </button>
            <button
              onClick={() => setFolderFilter('__none__')}
              className={`folder-chip muted${folderFilter === '__none__' ? ' active' : ''}`}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="file" size={16} /> No folder</span>
              <span className="count">{notes.filter((n) => !n.folder_id).length}</span>
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderFilter(String(f.id))}
                className={`folder-chip${folderFilter === String(f.id) ? ' active' : ''}`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="folder" size={16} /> {f.name}</span>
                <span className="count">{f.note_count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h5>Notes ({notes.length})</h5>
          </div>
          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-ico"><Icon name="edit" /></div>
              <div className="empty-title">{folderFilter ? 'Nothing in this folder' : 'No notes yet'}</div>
              <div className="empty-text">{folderFilter ? 'Move a note here from its ⋯ menu.' : 'Generate content, then choose Save as note.'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  onContextMenu={(e) => openMenu(e, n)}
                  onClick={() => startEdit(n)}
                  className={`note-row${editing?.id === n.id ? ' active' : ''}`}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    <div className="meta-line" style={{ marginTop: 4 }}>
                      <Icon name={n.folder_name ? 'folder' : 'file'} size={12} />
                      {n.folder_name || 'No folder'}
                      {n.collection_name && <> <span className="dot">•</span> {n.collection_name}</>}
                      <span className="dot">•</span> {n.source_type}
                    </div>
                  </div>
                  <button
                    className="note-more"
                    onClick={(e) => openMenuButton(e, n)}
                    aria-label="More actions"
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
        <div className="note-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="note-menu-item" onClick={() => { startEdit(menu.note); setMenu(null) }}>
            <Icon name="edit" /> Edit
          </div>
          <div className="note-menu-label">Move to folder</div>
          {folders.map((f) => (
            <div key={f.id} className="note-menu-item" onClick={() => moveTo(menu.note, f.id)}>
              <Icon name="folder" /> {f.name}
            </div>
          ))}
          <div className="note-menu-item" onClick={() => moveTo(menu.note, null)}>
            <Icon name="file" /> No folder
          </div>
          <div className="rt-hr" />
          <div className="note-menu-item danger" onClick={() => delNote(menu.note)}>
            <Icon name="trash" /> Delete
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-head">
              <h4>Edit note</h4>
              <button onClick={cancelEdit} className="icon-btn" aria-label="Close"><Icon name="x" /></button>
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