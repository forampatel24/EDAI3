import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import api from '../api'
import DashboardShell from './DashboardShell'

const ico = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z" /><path d="M20 4h-4a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20z" /></svg>
  ),
  spark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.5l-1.6-4.3L6 9.6 10.4 8z" /><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" /><path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.6" /></svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></svg>
  ),
  note: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /></svg>
  ),
}

const NAV = [
  { to: '.', label: 'Overview', desc: 'Your study space at a glance.', icon: ico.home },
  { to: 'catalog', label: 'Catalog', desc: 'Browse the approved syllabus collections your teachers share.', icon: ico.book },
  { to: 'generate', label: 'Generate', desc: 'Ask within a collection and get a cited, grounded study pack.', icon: ico.spark },
  { to: 'classroom', label: 'Classroom', desc: 'Join a class, submit assignments and take quizzes.', icon: ico.users },
  { to: 'practice', label: 'Practice', desc: 'Adaptive drills targeted at your weak concepts.', icon: ico.target },
  { to: 'notes', label: 'Notes', desc: 'Your saved study material, organised in folders.', icon: ico.note },
]

export default function StudentLayout() {
  const [catalog, setCatalog] = useState([])
  const [collections, setCollections] = useState([])

  const load = async () => {
    try {
      const [cat, cols] = await Promise.all([
        api.get('/catalog'),
        api.get('/collections'),
      ])
      setCatalog(cat.data)
      setCollections(cols.data)
    } catch {
      /* keep whatever we had; pages still render */
    }
  }

  useEffect(() => { load() }, [])

  return (
    <DashboardShell base="/student" roleLabel="Student space" nav={NAV}>
      <Outlet context={{ catalog, collections, reload: load }} />
    </DashboardShell>
  )
}