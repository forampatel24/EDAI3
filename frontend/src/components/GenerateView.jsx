import { useState, useEffect } from 'react'
import api from '../api'
import RichText, { InlineText } from './RichText'
import Icon from './Icon'

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const EXAMPLES = [
  "Create a lesson on Newton's laws for Class 11",
  'Explain photosynthesis with key points and examples',
  'Make 5 MCQs to test understanding of the water cycle',
  'Summarize this chapter into revision notes',
]

const GEN_STEPS = [
  'Retrieving curriculum chunks…',
  'Checking evidence coverage…',
  'Drafting the study pack…',
  'Attaching page-level citations…',
]

// Render a worked-example item that may be a plain string or an object.
function WorkedItem({ item }) {
  if (item == null) return null
  if (typeof item === 'string') {
    return <li><InlineText>{item}</InlineText></li>
  }
  if (typeof item === 'object') {
    const q = item.problem || item.question || item.statement || item.title
    const a = item.solution || item.answer || item.steps || item.explanation
    if (q || a) {
      return (
        <li>
          {q && <div className="q-stem"><InlineText>{typeof q === 'string' ? q : flatten(q)}</InlineText></div>}
          {a && <div><InlineText>{typeof a === 'string' ? a : flatten(a)}</InlineText></div>}
        </li>
      )
    }
    return <li><InlineText>{flatten(item)}</InlineText></li>
  }
  return <li>{String(item)}</li>
}

function flatten(obj) {
  if (Array.isArray(obj)) return obj.map((x) => (typeof x === 'string' ? x : flatten(x))).join('; ')
  return Object.entries(obj)
    .map(([k, v]) => `${k.replace(/[_-]+/g, ' ')}: ${typeof v === 'object' ? flatten(v) : v}`)
    .join(' · ')
}

// Some generator outputs leak "answer: B" / "explanation: ..." lines into the
// options array; peel them back out so they render as distinct fields.
function normalizeMcq(m) {
  if (!m || typeof m !== 'object') {
    return { question: String(m ?? ''), options: [], answer: '', explanation: '' }
  }
  const question = m.question || m.stem || m.title || ''
  const rawOptions = Array.isArray(m.options) ? m.options.map((o) => String(o ?? '').trim()).filter(Boolean) : []
  let answer = m.answer ? String(m.answer) : ''
  let explanation = m.explanation ? String(m.explanation) : ''
  let options = rawOptions
  const joined = rawOptions.join(' ')
  const cut = joined.search(/answer\s*:/i)
  if (cut >= 0) {
    const parts = joined.slice(0, cut).split(/\s+(?=[A-D]\))/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) options = parts
    const ans = joined.match(/answer\s*:\s*([A-Da-d])\b/)
    if (!answer && ans) answer = ans[1].toUpperCase()
    const exp = joined.match(/explanation\s*:\s*(.+)$/i)
    if (!explanation && exp) explanation = exp[1].trim()
  }
  return { question, options, answer, explanation }
}

export default function GenerateView({ collections, defaultCollectionId }) {
  const [collectionId, setCollectionId] = useState(defaultCollectionId || '')
  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [noteMsg, setNoteMsg] = useState('')
  const [folders, setFolders] = useState([])
  const [noteFolderId, setNoteFolderId] = useState('')
  const [genStep, setGenStep] = useState(0)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    api.get('/notes/folders').then((r) => setFolders(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setGenStep((s) => (s + 1) % GEN_STEPS.length), 1400)
    return () => clearInterval(t)
  }, [loading])

  const saveNote = async () => {
    if (!result) return
    const title = prompt.slice(0, 80) || 'Generated content'
    try {
      await api.post('/notes', {
        title,
        collection_id: parseInt(collectionId) || undefined,
        folder_id: noteFolderId ? parseInt(noteFolderId) : undefined,
        source_type: 'generate',
        content: result,
        meta: { prompt, difficulty, citations: result.citations?.length || 0, grounded: result.grounded },
      })
      setNoteMsg('Saved to notes!')
      setNoteFolderId('')
    } catch (e) { setNoteMsg(e.response?.data?.detail || e.message) }
  }

  const generate = async () => {
    if (!collectionId) return setError('Select a collection')
    if (!prompt.trim()) return setError('Enter a prompt')
    setLoading(true); setError(null); setResult(null); setNoteMsg(''); setGenStep(0)
    try {
      const res = await api.post('/generate', { collection_id: parseInt(collectionId), prompt, difficulty })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="card section-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h3>AI Generate Studio</h3>
          <p className="card-sub">Evidence-gated study packs built only from the PDFs in the collection you pick — every claim carries a page-level citation.</p>
        </div>
      </div>

      {/* Split Action Dashboard */}
      <div className="bento-grid-2" style={{ marginBottom: 20 }}>
        {/* Left Panel - Input Form */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
          <div className="gen-form">
            <label className="field">
              <span className="field-label">Collection</span>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                <option value="">Select a collection…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.subject} ({c.class_level || 'General'}){c.teacher_name ? ` · ${c.teacher_name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field-label">Difficulty</span>
              <div className="segmented" role="group" aria-label="Difficulty">
                {DIFFICULTIES.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    className={`seg-opt d-${d.value}${difficulty === d.value ? ' active' : ''}`}
                    aria-pressed={difficulty === d.value}
                    onClick={() => setDifficulty(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">What should the study pack cover?</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a lesson on Newton's laws for Class 11 students."
              rows={4}
            />
          </label>

          <div className="chip-row">
            <span className="chip-hint">Try:</span>
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="suggest-chip" onClick={() => setPrompt(ex)}>{ex}</button>
            ))}
          </div>

          <button onClick={generate} disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: 'auto' }}>
            {loading ? <><span className="spin" aria-hidden="true" /> Generating…</> : <><Icon name="sparkles" /> Generate study pack</>}
          </button>

          {error && <div className="banner banner-bad"><Icon name="alert" /><span>{error}</span></div>}
        </div>

        {/* Right Panel - Generation Status / Result Preview */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
              {/* Progressive RAG Stepper */}
              <div className="step-indicator">
                {GEN_STEPS.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className={`step-dot${idx < genStep ? ' complete' : idx === genStep ? ' active' : ''}`} />
                    <span className={`step-label${idx === genStep ? ' active' : ''}`}>{['Retrieve', 'Verify', 'Draft', 'Cite'][idx]}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <span className="spin" style={{ width: 40, height: 40, borderWidth: 3 }} aria-hidden="true" />
                <p style={{ marginTop: 12, fontSize: 15, color: 'var(--muted)', fontWeight: 500 }}>{GEN_STEPS[genStep]}</p>
              </div>

              <ResultSkeleton />
            </div>
          )}

          {result && !loading && (
            <Results
              result={result}
              folders={folders}
              noteFolderId={noteFolderId}
              setNoteFolderId={setNoteFolderId}
              onSaveNote={saveNote}
              noteMsg={noteMsg}
              showSources={showSources}
              setShowSources={setShowSources}
            />
          )}

          {!loading && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', color: 'var(--muted)', gap: 12 }}>
              <Icon name="sparkles" size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 15 }}>Select a collection, enter a prompt, and generate a grounded study pack.</p>
              <p style={{ fontSize: 13, maxWidth: 280 }}>Every answer cites its source pages. If the curriculum doesn't cover the topic, the system will tell you honestly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Results({ result, folders, noteFolderId, setNoteFolderId, onSaveNote, noteMsg, showSources, setShowSources }) {
  if (result.abstained) {
    return (
      <div style={{ marginTop: 18 }}>
        <div className="banner banner-info">
          <Icon name="shield" />
          <span><b>Not generated — insufficient curriculum evidence.</b> {result.warning}</span>
        </div>
      </div>
    )
  }

  const evidenceOk = result.evidence_status === 'sufficient'
  const citCount = result.citations?.length || 0
  const chunkCount = result.retrieved_chunks?.length || 0
  let n = 0
  const next = () => ++n

  return (
    <div style={{ marginTop: 18 }}>
      <div className="ground-summary">
        <div className="gs-head">
          <span className="gs-title">
            <Icon name={result.grounded ? 'shield' : 'alert'} />
            {result.grounded ? 'Grounded study pack' : 'Study pack (check grounding)'}
          </span>
          <div className="gs-actions">
            <select value={noteFolderId} onChange={(e) => setNoteFolderId(e.target.value)} aria-label="Note folder">
              <option value="">— No folder</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button onClick={onSaveNote} className="btn btn-ghost btn-sm"><Icon name="pin" size={15} /> Save as note</button>
          </div>
        </div>
        <div className="ground-pills">
          <span className={`pill ${result.grounded ? 'pill-ok' : 'pill-warn'}`}>
            <Icon name={result.grounded ? 'check' : 'alert'} />{result.grounded ? 'Grounded' : 'Ungrounded'}
          </span>
          {result.evidence_status && (
            <span className={`pill ${evidenceOk ? 'pill-ok' : 'pill-warn'}`}>
              <Icon name="target" />Evidence: {result.evidence_status}{result.evidence_score != null ? ` (${result.evidence_score.toFixed(2)})` : ''}
            </span>
          )}
          {result.repair_used && <span className="pill pill-info"><Icon name="wrench" />Repaired</span>}
          <span className="pill pill-muted"><Icon name="link" />{citCount} citation{citCount === 1 ? '' : 's'}</span>
          <span className="pill pill-muted"><Icon name="layers" />{chunkCount} chunk{chunkCount === 1 ? '' : 's'} retrieved</span>
        </div>
        {result.evidence_score != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            <span>Evidence signal</span>
            <div className="meter" style={{ maxWidth: 260 }}>
              <i style={{ width: `${Math.max(4, Math.min(100, Math.round(result.evidence_score * 100)))}%` }} />
            </div>
            <b style={{ color: evidenceOk ? 'var(--mint)' : 'var(--amber)' }}>{Math.round(result.evidence_score * 100)}%</b>
          </div>
        )}
      </div>

      {result.warning && <div className="banner banner-warn"><Icon name="alert" /><span>{result.warning}</span></div>}
      {result.alignment_warning && <div className="banner banner-info"><Icon name="target" /><span>{result.alignment_warning}</span></div>}
      {result.citation_issues?.length > 0 && <div className="banner banner-bad"><Icon name="paperclip" /><span>Citation check: {result.citation_issues.join(' ')}</span></div>}
      {noteMsg && <div className="banner banner-ok"><Icon name="check" /><span>{noteMsg}</span></div>}

      <div className="pack">
        {result.explanation && (
          <Section idx={next()} icon="file" title="Explanation">
            <RichText>{result.explanation}</RichText>
          </Section>
        )}

        <ListSection idx={next()} icon="list" title="Key concepts" accent="mint" items={result.key_concepts} />

        {result.worked_examples?.length > 0 && (
          <Section idx={next()} icon="bulb" title="Worked examples" accent="yellow">
            <ul className="plain">
              {result.worked_examples.map((it, i) => <WorkedItem key={i} item={it} />)}
            </ul>
          </Section>
        )}

        {result.mcqs?.length > 0 && (
          <Section idx={next()} icon="clipboard" title="Multiple choice questions" accent="pink">
            {result.mcqs.map((raw, i) => {
              const m = normalizeMcq(raw)
              return (
                <div className="q-item" key={i}>
                  <div className="q-stem">Q{i + 1}. <InlineText>{m.question}</InlineText></div>
                  {m.options.length > 0 && (
                    <ul className="q-options">
                      {m.options.map((o, j) => <li key={j}><InlineText>{o}</InlineText></li>)}
                    </ul>
                  )}
                  {m.answer && <div className="q-answer">Answer: <InlineText>{m.answer}</InlineText></div>}
                  {m.explanation && <div className="q-explain"><InlineText>{m.explanation}</InlineText></div>}
                </div>
              )
            })}
          </Section>
        )}

        {result.descriptive_questions?.length > 0 && (
          <Section idx={next()} icon="edit" title="Descriptive questions">
            {result.descriptive_questions.map((d, i) => (
              <div className="q-item" key={i}>
                <div className="q-stem">Q{i + 1}. <InlineText>{d.question}</InlineText></div>
                {d.answer && <RichText style={{ marginTop: 6 }}>{d.answer}</RichText>}
              </div>
            ))}
          </Section>
        )}

        {result.quiz?.length > 0 && (
          <Section idx={next()} icon="target" title="Difficulty-based quiz" accent="yellow">
            {result.quiz.map((q, i) => (
              <div className="q-item" key={i}>
                <div className="q-stem">
                  {q.difficulty && <span className={`diff-tag diff-${q.difficulty}`}>{q.difficulty}</span>}
                  Q{i + 1}. <InlineText>{q.question}</InlineText>
                </div>
                {q.answer && <div className="q-answer">Answer: <InlineText>{q.answer}</InlineText></div>}
              </div>
            ))}
          </Section>
        )}

        {result.revision_notes && (
          <Section idx={next()} icon="book" title="Revision notes" accent="mint">
            <RichText>{result.revision_notes}</RichText>
          </Section>
        )}
      </div>

      {/* Sources Panel - Collapsible Drawer */}
      {(citCount > 0 || chunkCount > 0) && (
        <div className="sources" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="link" /> Sources & retrieved context</h3>
            <button
              onClick={() => setShowSources(!showSources)}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name={showSources ? 'x' : 'layers'} size={14} />
              {showSources ? 'Hide' : 'View'} sources
            </button>
          </div>

          {showSources && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {citCount > 0 && (
                <div className="cites">
                  {result.citations.map((c, i) => (
                    <div className="cite-card" key={i}>
                      <span className="cite-ref">[{c.source}, p.{c.page}]</span>
                      <p>{c.text_snippet}</p>
                    </div>
                  ))}
                </div>
              )}
              {chunkCount > 0 && (
                <details className="rt-details chunks">
                  <summary>View retrieved chunks ({chunkCount})</summary>
                  {result.retrieved_chunks.map((ch, i) => (
                    <div className="chunk" key={i}>
                      <div className="chunk-meta">
                        {ch.score != null && <span>Score: {ch.score.toFixed(3)}</span>}
                        {ch.metadata?.source && <span>{ch.metadata.source} · p.{ch.metadata.page}</span>}
                      </div>
                      {ch.text ? ch.text.slice(0, 500) + (ch.text.length > 500 ? '…' : '') : ''}
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ idx, icon, title, accent, children }) {
  return (
    <div
      className={'sp-card' + (accent ? ` accent-${accent}` : '')}
      style={{ '--sp-i': Math.min(idx - 1, 7) }}
    >
      <div className="sp-head">
        <span className="sp-idx">{idx}</span>
        <span className="sp-title"><Icon name={icon} /> {title}</span>
      </div>
      <div className="sp-body">{children}</div>
    </div>
  )
}

function ListSection({ idx, icon, title, accent, items }) {
  if (!items || items.length === 0) return null
  return (
    <Section idx={idx} icon={icon} title={title} accent={accent}>
      <ul className="plain">
        {items.map((x, i) => (
          <li key={i}><InlineText>{typeof x === 'string' ? x : flatten(x)}</InlineText></li>
        ))}
      </ul>
    </Section>
  )
}

function ResultSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="skel-card">
        <div className="skel-line" style={{ width: '30%', height: 16 }} />
        <div className="skel-line" style={{ width: '90%' }} />
        <div className="skel-line" style={{ width: '80%' }} />
        <div className="skel-line" style={{ width: '60%' }} />
      </div>
      <div className="skel-card">
        <div className="skel-line" style={{ width: '24%', height: 16 }} />
        <div className="skel-line" style={{ width: '85%' }} />
        <div className="skel-line" style={{ width: '70%' }} />
      </div>
    </div>
  )
}