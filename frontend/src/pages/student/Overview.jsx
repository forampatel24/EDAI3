import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import api from '../../api'

export default function StudentOverview() {
  const { catalog } = useOutletContext()
  const [noteCount, setNoteCount] = useState(null)
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    let live = true
    Promise.allSettled([api.get('/notes'), api.get('/adaptive/overview')]).then(([notes, ov]) => {
      if (!live) return
      if (notes.status === 'fulfilled') setNoteCount(notes.value.data.length)
      if (ov.status === 'fulfilled') setOverview(ov.value.data)
    })
    return () => { live = false }
  }, [])

  const pdfs = catalog.reduce((sum, c) => sum + (c.pdf_count || 0), 0)
  const accuracy = overview?.total_attempts ? `${(overview.overall_accuracy * 100).toFixed(0)}%` : '—'

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-num">{catalog.length}</div>
          <div className="stat-label">Syllabus collections</div>
          <div className="stat-note">shared by your teachers</div>
        </div>
        <div className="stat stat-yellow">
          <div className="stat-num">{pdfs}</div>
          <div className="stat-label">PDFs available</div>
          <div className="stat-note">everything answers must cite</div>
        </div>
        <div className="stat stat-mint">
          <div className="stat-num">{noteCount ?? '—'}</div>
          <div className="stat-label">Notes saved</div>
          <div className="stat-note">your personal library</div>
        </div>
        <div className="stat">
          <div className="stat-num">{accuracy}</div>
          <div className="stat-label">Practice accuracy</div>
          <div className="stat-note">{overview?.total_attempts || 0} quiz answers</div>
        </div>
      </div>

      {catalog.length === 0 && (
        <div className="card onboarding">
          <h2>Nothing in the catalog yet</h2>
          <p className="card-sub">Your teachers haven't uploaded a syllabus collection yet. Once they do, it will appear in the Catalog and you can generate grounded content from it.</p>
        </div>
      )}

      <h2 className="quick-title">Jump back in</h2>
      <div className="quick-grid">
        <Link to="/student/catalog" className="quick">
          <span className="quick-ico" aria-hidden="true">📖</span>
          <span>
            <b>Browse the catalog</b>
            <small>See what's in your syllabus</small>
          </span>
        </Link>
        <Link to="/student/generate" className="quick">
          <span className="quick-ico" aria-hidden="true">✨</span>
          <span>
            <b>Generate content</b>
            <small>Cited answers and study packs</small>
          </span>
        </Link>
        <Link to="/student/practice" className="quick">
          <span className="quick-ico" aria-hidden="true">🎯</span>
          <span>
            <b>Practice</b>
            <small>Drills for your weak concepts</small>
          </span>
        </Link>
        <Link to="/student/classroom" className="quick">
          <span className="quick-ico" aria-hidden="true">🏫</span>
          <span>
            <b>Classroom</b>
            <small>Assignments and quizzes</small>
          </span>
        </Link>
      </div>
    </>
  )
}
