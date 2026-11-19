import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import api from '../../api'
import Icon from '../../components/Icon'

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
  const accuracyValue = overview?.total_attempts ? overview.overall_accuracy : 0
  const totalAttempts = overview?.total_attempts || 0

  // Progress ring circumference for SVG
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - accuracyValue)

  return (
    <>
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-banner-content">
          <div className="hero-banner-greeting">Welcome back</div>
          <h1 className="hero-banner-title">Your study space</h1>
          <p className="hero-banner-sub">Generate grounded content from your syllabus, practice weak concepts, and build your personal notes library.</p>
          <div className="hero-banner-actions">
            <Link to="/student/generate" className="btn btn-primary"><Icon name="sparkles" /> Generate content</Link>
            <Link to="/student/practice" className="btn btn-ghost"><Icon name="target" /> Practice now</Link>
          </div>
        </div>
      </div>

      {/* Stat Bento Grid */}
      <div className="stat-grid">
        <div className="stat stat-primary">
          <div className="stat-icon stat-primary"><Icon name="book" size={20} /></div>
          <div className="stat-num">{catalog.length}</div>
          <div className="stat-label">Syllabus collections</div>
          <div className="stat-note">shared by your teachers</div>
        </div>
        <div className="stat stat-amber">
          <div className="stat-icon stat-amber"><Icon name="file" size={20} /></div>
          <div className="stat-num">{pdfs}</div>
          <div className="stat-label">PDFs available</div>
          <div className="stat-note">everything answers must cite</div>
        </div>
        <div className="stat stat-mint">
          <div className="stat-icon stat-mint"><Icon name="note" size={20} /></div>
          <div className="stat-num">{noteCount ?? '—'}</div>
          <div className="stat-label">Notes saved</div>
          <div className="stat-note">your personal library</div>
        </div>
        <div className="stat stat-with-progress">
          <div className="progress-ring" role="img" aria-label={`Practice accuracy ${accuracy}`}>
            <svg width="68" height="68">
              <circle className="progress-ring-bg" cx="34" cy="34" r={radius} />
              <circle
                className="progress-ring-fill"
                cx="34"
                cy="34"
                r={radius}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            </svg>
          </div>
          <div>
            <div className="stat-num">{accuracy}</div>
            <div className="stat-label">Practice accuracy</div>
            <div className="stat-note">{totalAttempts} quiz answers</div>
          </div>
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
          <span className="quick-ico" aria-hidden="true"><Icon name="book" /></span>
          <span>
            <b>Browse the catalog</b>
            <small>See what's in your syllabus</small>
          </span>
        </Link>
        <Link to="/student/generate" className="quick">
          <span className="quick-ico" aria-hidden="true"><Icon name="sparkles" /></span>
          <span>
            <b>Generate content</b>
            <small>Cited answers and study packs</small>
          </span>
        </Link>
        <Link to="/student/practice" className="quick">
          <span className="quick-ico" aria-hidden="true"><Icon name="target" /></span>
          <span>
            <b>Practice</b>
            <small>Drills for your weak concepts</small>
          </span>
        </Link>
        <Link to="/student/classroom" className="quick">
          <span className="quick-ico" aria-hidden="true"><Icon name="users" /></span>
          <span>
            <b>Classroom</b>
            <small>Assignments and quizzes</small>
          </span>
        </Link>
      </div>
    </>
  )
}