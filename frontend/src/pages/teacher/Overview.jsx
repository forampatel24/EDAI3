import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import api from '../../api'

export default function TeacherOverview() {
  const { myCollections, collections } = useOutletContext()
  const [roomCount, setRoomCount] = useState(null)
  const [itemCount, setItemCount] = useState(null)
  const [noteCount, setNoteCount] = useState(null)

  useEffect(() => {
    let live = true
    Promise.allSettled([
      api.get('/classrooms/my'),
      api.get('/workspace'),
      api.get('/notes'),
    ]).then(([rooms, items, notes]) => {
      if (!live) return
      if (rooms.status === 'fulfilled') setRoomCount(rooms.value.data.length)
      if (items.status === 'fulfilled') setItemCount(items.value.data.length)
      if (notes.status === 'fulfilled') setNoteCount(notes.value.data.length)
    })
    return () => { live = false }
  }, [])

  const pdfs = myCollections.reduce((sum, c) => sum + (c.document_count || 0), 0)

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-num">{myCollections.length}</div>
          <div className="stat-label">My collections</div>
          <div className="stat-note">of {collections.length} in the catalog</div>
        </div>
        <div className="stat stat-yellow">
          <div className="stat-num">{pdfs}</div>
          <div className="stat-label">PDFs uploaded</div>
          <div className="stat-note">approved source material</div>
        </div>
        <div className="stat">
          <div className="stat-num">{roomCount ?? '—'}</div>
          <div className="stat-label">Classrooms</div>
          <div className="stat-note">active classes you run</div>
        </div>
        <div className="stat stat-mint">
          <div className="stat-num">{itemCount ?? '—'}</div>
          <div className="stat-label">Workspace drafts</div>
          <div className="stat-note">{noteCount ?? '—'} saved in notes</div>
        </div>
      </div>

      {myCollections.length === 0 && (
        <div className="card onboarding">
          <h2>Get started in three steps</h2>
          <ol className="onboard-steps">
            <li><b>Create a collection</b> for a subject you teach.</li>
            <li><b>Upload the approved PDFs</b> — that corpus is the only thing the generator may use.</li>
            <li><b>Draft material</b> in the Workspace or ask in Generate, then share it in a Classroom.</li>
          </ol>
          <Link to="/teacher/collections" className="btn btn-primary">Create your first collection</Link>
        </div>
      )}

      <h2 className="quick-title">Jump back in</h2>
      <div className="quick-grid">
        <Link to="/teacher/collections" className="quick">
          <span className="quick-ico" aria-hidden="true">📚</span>
          <span>
            <b>Collections & uploads</b>
            <small>Manage subjects and their PDF corpus</small>
          </span>
        </Link>
        <Link to="/teacher/generate" className="quick">
          <span className="quick-ico" aria-hidden="true">✨</span>
          <span>
            <b>Generate content</b>
            <small>Cited answers, summaries and notes</small>
          </span>
        </Link>
        <Link to="/teacher/workspace" className="quick">
          <span className="quick-ico" aria-hidden="true">🧰</span>
          <span>
            <b>Workspace</b>
            <small>Lesson plans, quizzes, question papers</small>
          </span>
        </Link>
        <Link to="/teacher/classroom" className="quick">
          <span className="quick-ico" aria-hidden="true">🏫</span>
          <span>
            <b>Classroom</b>
            <small>Publish, assign, grade and track</small>
          </span>
        </Link>
      </div>
    </>
  )
}
