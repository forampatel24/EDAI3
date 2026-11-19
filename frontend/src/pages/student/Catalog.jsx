import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'

export default function StudentCatalog() {
  const { catalog } = useOutletContext()

  return (
    <>
      <div className="card">
        <h2>Available collections <span style={{ fontSize: '0.75em', color: 'var(--muted)', fontWeight: 500 }}> (read-only)</span></h2>
        <p className="card-sub">
          You can see PDF names and generate content from these collections. There is no upload or
          preview — the corpus stays exactly as your teacher approved it.
        </p>

        {catalog.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><Icon name="book" /></div>
            <div className="empty-title">No collections yet</div>
            <div className="empty-text">Ask your teacher to upload textbooks or notes — they'll show up here.</div>
          </div>
        ) : (
          catalog.map((c) => (
            <div key={c.id} className="list-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</div>
                <span className="badge badge-primary">{c.pdf_count} PDF{c.pdf_count === 1 ? '' : 's'}</span>
              </div>
              <div className="meta-line" style={{ marginBottom: 8 }}>
                {c.subject} · {c.class_level || 'General'} · Teacher: {c.teacher_name} ({c.teacher_email})
              </div>
              {c.description && <div style={{ fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>{c.description}</div>}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--muted)' }}>PDFs in this collection:</div>
                {c.pdf_names.length === 0 ? (
                  <span className="meta-line" style={{ fontSize: 13 }}>No PDFs yet</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {c.pdf_names.map((n, i) => (
                      <span key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '5px 11px', borderRadius: '8px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="file" size={13} /> {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="banner banner-info" style={{ marginTop: 16 }}>
        <b>How this stays honest:</b> you can only query content from the PDFs above. If you ask
        something outside the syllabus, the system answers <i>"not found in uploaded syllabus"</i>
        {' '}instead of guessing.
      </div>
    </>
  )
}