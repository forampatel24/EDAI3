import RichText, { InlineText } from './RichText'

// Labels shared by the notes and workspace structured editors.
const LABELS = {
  explanation: 'Explanation',
  key_concepts: 'Key concepts',
  worked_examples: 'Worked examples',
  mcqs: 'Multiple choice questions',
  descriptive_questions: 'Descriptive questions',
  quiz: 'Quiz',
  revision_notes: 'Revision notes',
  question: 'Question',
  questions: 'Questions',
  options: 'Options',
  answer: 'Answer',
  answer_key: 'Answer key',
  difficulty: 'Difficulty',
  marks: 'Marks',
  // workspace template shapes
  objectives: 'Objectives',
  introduction: 'Introduction',
  concepts: 'Concepts',
  examples: 'Examples',
  activities: 'Activities',
  assessment: 'Assessment',
  homework: 'Homework',
  citations: 'Citations',
  source: 'Source',
  page: 'Page',
  text_snippet: 'Text snippet',
  sections: 'Sections',
  name: 'Name',
  question_no: 'Question no',
  goal: 'Goal',
  materials: 'Materials',
  steps: 'Steps',
  duration_minutes: 'Duration (minutes)',
  warning: 'Warning',
  type: 'Type',
}

export const labelFor = (k) =>
  LABELS[k] || k.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

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

function StringEditor({ value, onChange, rows }) {
  return <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
}

function PrimitiveEditor({ value, onChange }) {
  if (typeof value === 'boolean') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value === 'true')}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    )
  }
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => {
        const raw = e.target.value
        if (typeof value === 'number') {
          const n = parseFloat(raw)
          onChange(Number.isNaN(n) ? raw : n)
        } else {
          onChange(raw)
        }
      }}
    />
  )
}

function StringListEditor({ value, onChange }) {
  const text = value.join('\n')
  return (
    <StringEditor
      value={text}
      onChange={(t) => onChange(t.split('\n').map((s) => s.trim()).filter(Boolean))}
      rows={Math.max(3, Math.min(12, value.length + 1))}
    />
  )
}

function ItemListEditor({ label, items, onChange }) {
  const setItem = (idx, v) => onChange(items.map((it, i) => (i === idx ? v : it)))
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx))
  const addItem = () => onChange([...items, emptyLike(items[items.length - 1])])

  return (
    <div className="field">
      <span className="field-label">{label} ({items.length})</span>
      {items.map((item, i) => (
        <div key={i} className="sub-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
            <button type="button" onClick={() => removeItem(i)} className="btn-tiny btn-danger">Remove</button>
          </div>
          {typeof item === 'object' && item !== null ? (
            <ObjectFields value={item} onChange={(v) => setItem(i, v)} />
          ) : (
            <StringEditor value={String(item ?? '')} onChange={(v) => setItem(i, v)} rows={2} />
          )}
        </div>
      ))}
      <button type="button" onClick={addItem} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>+ Add item</button>
    </div>
  )
}

function ObjectFields({ value, onChange }) {
  return (
    <div className="field-list">
      {Object.entries(value).map(([k, v]) => (
        <ValueEditor key={k} label={labelFor(k)} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  )
}

export function ValueEditor({ label, value, onChange }) {
  if (typeof value === 'string') {
    return (
      <label className="field">
        <span className="field-label">{label}</span>
        <StringEditor value={value} onChange={onChange} rows={Math.min(10, Math.max(2, Math.ceil(value.length / 80) || 2))} />
      </label>
    )
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return (
      <label className="field">
        <span className="field-label">{label}</span>
        <PrimitiveEditor value={value} onChange={onChange} />
      </label>
    )
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((x) => typeof x === 'string')) {
      return (
        <label className="field">
          <span className="field-label">{label}</span>
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
    <label className="field">
      <span className="field-label">{label}</span>
      <PrimitiveEditor value={value} onChange={onChange} />
    </label>
  )
}

function ReadValue({ value }) {
  if (typeof value === 'string') {
    return <RichText style={{ fontSize: 13.5 }}>{value}</RichText>
  }
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'string')) {
      return (
        <ul className="plain" style={{ margin: '4px 0', paddingLeft: 20 }}>
          {value.map((x, i) => <li key={i} style={{ marginBottom: 4 }}><InlineText>{x}</InlineText></li>)}
        </ul>
      )
    }
    return (
      <div className="field-list">
        {value.map((item, i) => (
          <div key={i} className="sub-card">
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
            {typeof item === 'object' && item !== null ? (
              <ReadObject value={item} />
            ) : (
              <InlineText>{String(item)}</InlineText>
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

export function ReadObject({ value }) {
  return (
    <div className="field-list">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <div className="field-label">{labelFor(k)}</div>
          <ReadValue value={v} />
        </div>
      ))}
    </div>
  )
}
