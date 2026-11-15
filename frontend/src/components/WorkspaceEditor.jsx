import { useState, useEffect } from 'react'
import { labelFor, ValueEditor, ReadObject, inputStyle, textAreaStyle } from './StructuredFields'

const btn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }

export default function WorkspaceEditor({ item, saving, onSave, onSaveToNotes, onPublish }) {
  const [title, setTitle] = useState(item.title || '')
  const initialContent = item.content || {}
  const [content, setContent] = useState(initialContent)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initialContent, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [preview, setPreview] = useState(false)

  // keep jsonText in sync while in form/preview mode
  useEffect(() => {
    if (!jsonMode) setJsonText(JSON.stringify(content, null, 2))
  }, [content, jsonMode])

  // Resolve the content to persist, validating JSON mode first.
  const resolveContent = () => {
    if (!jsonMode) return content
    try {
      const parsed = JSON.parse(jsonText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Content must be a JSON object.')
        return null
      }
      setJsonError('')
      return parsed
    } catch (e) {
      setJsonError('Invalid JSON — ' + (e?.message || 'fix the syntax before saving.'))
      return null
    }
  }

  // Toggling JSON → Form: keep valid edits instead of silently discarding them.
  const toggleJsonMode = () => {
    if (jsonMode) {
      const parsed = resolveContent()
      if (parsed == null) return // stay in JSON mode while invalid
      setContent(parsed)
    }
    setJsonError('')
    setJsonMode(!jsonMode)
  }

  const doSave = () => {
    const final = resolveContent()
    if (final == null) return
    onSave({ title: title.trim() || item.title, content: final })
  }

  const doSaveToNotes = () => {
    const final = resolveContent()
    if (final == null) return
    onSaveToNotes({ title: title.trim() || item.title, content: final })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          style={{ ...inputStyle, flex: 1, minWidth: 220, fontSize: 14.5, fontWeight: 600 }}
        />
        <button type="button" onClick={toggleJsonMode} style={{ background: jsonMode ? 'var(--primary)' : 'var(--primary-dark)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {jsonMode ? 'Form mode' : 'JSON mode'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} style={{ background: preview ? 'var(--green)' : 'var(--primary-dark)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {preview ? 'Editor' : 'Preview'}
        </button>
      </div>

      {jsonError && <div style={{ color: 'var(--red)', background: 'var(--pink-soft)', padding: 8, borderRadius: 6, fontSize: 12 }}>{jsonError}</div>}

      {preview ? (
        <div style={{ maxHeight: '60vh', overflow: 'auto', padding: 12, background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--line)' }}>
          <ReadObject value={content || {}} />
        </div>
      ) : jsonMode ? (
        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ ...textAreaStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', minHeight: 300 }} />
      ) : (
        <div style={{ maxHeight: '60vh', overflow: 'auto', display: 'grid', gap: 12 }}>
          {Object.entries(content || {}).map(([k, v]) => (
            <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => setContent({ ...content, [k]: nv })} />
          ))}
          {(content && Object.keys(content).length === 0) && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No content — edit in JSON mode.</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={doSave} disabled={saving} style={{ ...btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save Edits'}</button>
        <button type="button" onClick={doSaveToNotes} disabled={saving} style={{ ...btn, background: 'var(--green)', opacity: saving ? 0.6 : 1 }}>📌 Save to Notes</button>
        <button type="button" onClick={onPublish} disabled={saving} style={{ ...btn, background: 'var(--primary-dark)' }}>Mark Ready (Publish in Classroom ↓)</button>
      </div>
    </div>
  )
}
