import { useState, useEffect } from 'react'
import { labelFor, ValueEditor, ReadObject } from './StructuredFields'
import Icon from './Icon'

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
    <div className="editor-stack">
      <div className="editor-toolbar">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          style={{ flex: 1, minWidth: 220, fontSize: 14.5, fontWeight: 600 }}
        />
        <button type="button" onClick={toggleJsonMode} className={`btn btn-sm ${jsonMode ? 'btn-primary' : 'btn-ghost'}`}>
          {jsonMode ? 'Form mode' : 'JSON mode'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} className={`btn btn-sm ${preview ? 'btn-primary' : 'btn-ghost'}`}>
          {preview ? 'Editor' : 'Preview'}
        </button>
      </div>

      {jsonError && <div className="banner banner-bad"><span>{jsonError}</span></div>}

      {preview ? (
        <div className="editor-pane scroll">
          <ReadObject value={content || {}} />
        </div>
      ) : jsonMode ? (
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, resize: 'vertical', minHeight: 300 }}
        />
      ) : (
        <div className="editor-pane scroll">
          <div className="field-list">
            {Object.entries(content || {}).map(([k, v]) => (
              <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => setContent({ ...content, [k]: nv })} />
            ))}
            {(content && Object.keys(content).length === 0) && (
              <div className="meta-hint">No content yet — edit in JSON mode.</div>
            )}
          </div>
        </div>
      )}

      <div className="editor-toolbar">
        <button type="button" onClick={doSave} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save Edits'}</button>
        <button type="button" onClick={doSaveToNotes} disabled={saving} className="btn btn-ghost"><Icon name="pin" size={15} /> Save to Notes</button>
        <button type="button" onClick={onPublish} disabled={saving} className="btn btn-ghost">Mark Ready (Publish in Classroom)</button>
      </div>
    </div>
  )
}
