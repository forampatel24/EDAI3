import { useState, useEffect } from 'react'
import { labelFor, ValueEditor, ReadObject, inputStyle, textAreaStyle } from './StructuredFields'

export default function NoteEditor({ note, folders, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(note.title)
  const [folderId, setFolderId] = useState(note.folder_id == null ? '' : String(note.folder_id))
  const [content, setContent] = useState(note.content || {})
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState(() => JSON.stringify(note.content || {}, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [preview, setPreview] = useState(false)

  // keep jsonText in sync when not in jsonMode
  useEffect(() => {
    if (!jsonMode) setJsonText(JSON.stringify(content, null, 2))
  }, [content, jsonMode])

  const handleSave = () => {
    let finalContent = content
    if (jsonMode) {
      try {
        finalContent = JSON.parse(jsonText)
        setJsonError('')
      } catch (e) {
        setJsonError('Invalid JSON — ' + (e?.message || 'fix the syntax before saving.'))
        return
      }
    }
    const origId = note.folder_id == null ? null : Number(note.folder_id)
    const chosen = folderId === '' ? null : parseInt(folderId)
    let folderAction = null
    if (chosen !== origId) folderAction = chosen ? { folder_id: chosen } : { clear_folder: true }
    onSave({ title: title.trim() || note.title, content: finalContent, folderAction })
  }

  const folderOptions = [
    { value: '', label: '— No folder' },
    ...folders.map((f) => ({ value: String(f.id), label: f.name })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 14.5, fontWeight: 600 }}
        />
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)} style={inputStyle}>
          {folderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={() => { setJsonMode(!jsonMode); setJsonError('') }} style={{ background: jsonMode ? 'var(--primary)' : 'var(--primary-dark)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {jsonMode ? 'Form mode' : 'JSON mode'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} style={{ background: preview ? 'var(--green)' : 'var(--primary-dark)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {preview ? 'Editor' : 'Preview'}
        </button>
      </div>

      {jsonError && <div style={{ color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 6, fontSize: 12 }}>{jsonError}</div>}

      {preview ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 12, background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--line)' }}>
          <ReadObject value={content || {}} />
        </div>
      ) : jsonMode ? (
        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ ...textAreaStyle, flex: 1, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', minHeight: 300 }} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 12 }}>
          {Object.entries(content || {}).map(([k, v]) => (
            <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => setContent({ ...content, [k]: nv })} />
          ))}
          {(content && Object.keys(content).length === 0) && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No content yet — edit in JSON mode or add fields programmatically.</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onCancel} disabled={saving} style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', padding: '8px 18px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
