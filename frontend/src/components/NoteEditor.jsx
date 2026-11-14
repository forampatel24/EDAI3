import { useState, useEffect } from 'react'
import MathText from './MathText'

const LABELS = {
  explanation: 'Explanation',
  key_concepts: 'Key concepts',
  worked_examples: 'Worked examples',
  mcqs: 'Multiple choice questions',
  descriptive_questions: 'Descriptive questions',
  quiz: 'Quiz',
  revision_notes: 'Revision notes',
  question: 'Question',
  options: 'Options',
  answer: 'Answer',
  difficulty: 'Difficulty',
  marks: 'Marks',
}

const labelFor = (k) => LABELS[k] || k.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

function emptyLike(sample) {
  if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
    const obj = {}
    for (const [k, v] of Object.entries(sample)) {
      obj[k] = Array.isArray(v) ? [] : typeof v === 'string' ? '' : typeof v === 'number' ? 0 : false
    }
    return obj
  }
  if (Array.isArray(sample)) return []
  return ''
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 4 }
const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--ink)' }
const card = { border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 6, background: 'var(--paper)' }
const smallDanger = { background: 'var(--pink-soft)', color: 'var(--red)', border: 'none', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }
const smallAdd = { marginTop: 8, background: 'var(--blue-soft)', color: 'var(--primary-dark)', border: 'none', padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600 }
const textAreaStyle = { width: '100%', fontSize: 13, fontFamily: 'inherit', padding: 8, borderRadius: 6, border: '1px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)' }
const inputStyle = { width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)' }

function StringEditor({ value, onChange, rows }) {
  return <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} style={textAreaStyle} />
}

function PrimitiveEditor({ value, onChange }) {
  return <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
}

function StringListEditor({ value, onChange }) {
  const text = value.join('\n')
  return (
    <StringEditor
      value={text}
      onChange={(t) => onChange(t.split('\n').map(s => s.trim()).filter(Boolean))}
      rows={Math.max(3, Math.min(12, value.length + 1))}
    />
  )
}

function ItemListEditor({ label, items, onChange }) {
  const setItem = (idx, v) => onChange(items.map((it, i) => (i === idx ? v : it)))
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx))
  const addItem = () => onChange([...items, emptyLike(items[items.length - 1])])

  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label} ({items.length})</span>
      {items.map((item, i) => (
        <div key={i} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
            <button type="button" onClick={() => removeItem(i)} style={smallDanger}>Remove</button>
          </div>
          {typeof item === 'object' && item !== null ? (
            <ObjectFields value={item} onChange={(v) => setItem(i, v)} />
          ) : (
            <StringEditor value={String(item ?? '')} onChange={(v) => setItem(i, v)} rows={2} />
          )}
        </div>
      ))}
      <button type="button" onClick={addItem} style={smallAdd}>+ Add item</button>
    </div>
  )
}

function ObjectFields({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(value).map(([k, v]) => (
        <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  )
}

function ValueEditor({ label, value, onChange }) {
  if (typeof value === 'string') {
    return (
      <label style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
        <StringEditor value={value} onChange={onChange} rows={Math.min(10, Math.max(2, Math.ceil(value.length / 80) || 2))} />
      </label>
    )
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return (
      <label style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
        <PrimitiveEditor value={value} onChange={onChange} />
      </label>
    )
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((x) => typeof x === 'string')) {
      return (
        <label style={fieldStyle}>
          <span style={labelStyle}>{label}</span>
          <StringListEditor value={value} onChange={onChange} />
        </label>
      )
    }
    return <ItemListEditor label={label} items={value} onChange={onChange} />
  }
  if (value && typeof value === 'object') {
    return <ObjectFields value={value} onChange={onChange} />
  }
  // null / undefined
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <PrimitiveEditor value={value} onChange={onChange} />
    </label>
  )
}

function ReadValue({ value }) {
  if (typeof value === 'string') {
    return <MathText style={{ whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{value}</MathText>
  }
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'string')) {
      return (
        <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
          {value.map((x, i) => <li key={i} style={{ marginBottom: 4 }}><MathText as="span">{x}</MathText></li>)}
        </ul>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {value.map((item, i) => (
          <div key={i} style={card}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
            {typeof item === 'object' && item !== null ? (
              <ReadObject value={item} />
            ) : (
              <MathText as="span">{String(item)}</MathText>
            )}
          </div>
        ))}
      </div>
    )
  }
  if (value && typeof value === 'object') {
    return <ReadObject value={value} />
  }
  return <span>{String(value)}</span>
}

function ReadObject({ value }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <div style={labelStyle}>{labelFor(k)}</div>
          <ReadValue value={v} />
        </div>
      ))}
    </div>
  )
}

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