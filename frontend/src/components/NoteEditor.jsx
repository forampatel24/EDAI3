import { useState, useEffect } from 'react'
import { labelFor, ValueEditor, ReadObject } from './StructuredFields'

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
    <div className="editor-stack" style={{ height: '100%' }}>
      <div className="editor-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          style={{ flex: 1, minWidth: 220, fontSize: 15, fontWeight: 600 }}
        />
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)} style={{ minWidth: 180 }}>
          {folderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={() => { setJsonMode(!jsonMode); setJsonError('') }} className={`btn btn-sm ${jsonMode ? 'btn-primary' : 'btn-ghost'}`}>
          {jsonMode ? 'Form mode' : 'JSON mode'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} className={`btn btn-sm ${preview ? 'btn-primary' : 'btn-ghost'}`}>
          {preview ? 'Editor' : 'Preview'}
        </button>
      </div>

      {jsonError && <div className="banner banner-bad"><span>{jsonError}</span></div>}

      {preview ? (
        <div className="editor-pane" style={{ flex: 1, minHeight: 300 }}>
          <ReadObject value={content || {}} />
        </div>
      ) : jsonMode ? (
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 13, resize: 'vertical', minHeight: 300, lineHeight: 1.6 }}
        />
      ) : (
        <div className="editor-pane scroll" style={{ flex: 1, minHeight: 300 }}>
          <div className="field-list">
            {Object.entries(content || {}).map(([k, v]) => (
              <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => setContent({ ...content, [k]: nv })} />
            ))}
            {(content && Object.keys(content).length === 0) && (
              <div className="meta-hint">No content yet — edit in JSON mode or add fields programmatically.</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <button type="button" onClick={onCancel} disabled={saving} className="btn btn-ghost">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}