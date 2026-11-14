import { useOutletContext } from 'react-router-dom'

export default function StudentCatalog() {
  const { catalog } = useOutletContext()

  return (
    <>
      <div className="card">
        <h2>Available collections <span className="heading-sub">(read-only)</span></h2>
        <p className="card-sub">
          You can see PDF names and generate content from these collections. There is no upload or
          preview — the corpus stays exactly as your teacher approved it.
        </p>

        {catalog.length === 0 ? (
          <p className="card-sub">No collections uploaded yet. Ask your teacher to upload textbooks or notes.</p>
        ) : (
          catalog.map((c) => (
            <div key={c.id} className="catalog-item">
              <div className="catalog-head">
                <b>{c.name}</b>
                <span className="badge badge-blue">{c.pdf_count} PDF{c.pdf_count === 1 ? '' : 's'}</span>
              </div>
              <div className="pick-meta">
                {c.subject} · {c.class_level || 'General'} · Teacher: {c.teacher_name} ({c.teacher_email})
              </div>
              {c.description && <div className="catalog-desc">{c.description}</div>}
              <div className="catalog-pdfs">
                <div className="catalog-sub">PDFs in this collection:</div>
                {c.pdf_names.length === 0 ? (
                  <span className="pick-meta">No PDFs yet</span>
                ) : (
                  <div className="chip-wrap">
                    {c.pdf_names.map((n, i) => (
                      <span key={i} className="chip">📄 {n}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="note-banner">
        <b>How this stays honest:</b> you can only query content from the PDFs above. If you ask
        something outside the syllabus, the system answers <i>"not found in uploaded syllabus"</i>
        {' '}instead of guessing.
      </div>
    </>
  )
}
