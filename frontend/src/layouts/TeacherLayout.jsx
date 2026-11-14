import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import api from '../api'
import DashboardShell from './DashboardShell'

const ico = {
  home: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  folder: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
  ),
  spark: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.5l-1.6-4.3L6 9.6 10.4 8z" /><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></svg>
  ),
  tools: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  users: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" /><path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.6" /></svg>
  ),
  note: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /></svg>
  ),
}

const NAV = [
  { to: '.', label: 'Overview', desc: 'Your teaching space at a glance.', icon: ico.home, end: true },
  { to: 'collections', label: 'Collections', desc: 'Create subject collections and upload the approved PDF corpus.', icon: ico.folder },
  { to: 'generate', label: 'Generate', desc: 'Ask within a collection and get a cited, grounded study pack.', icon: ico.spark },
  { to: 'workspace', label: 'Workspace', desc: 'Draft lesson plans, quizzes and papers from templates.', icon: ico.tools },
  { to: 'classroom', label: 'Classroom', desc: 'Run classes, publish material and review student performance.', icon: ico.users },
  { to: 'notes', label: 'Notes', desc: 'Your saved teaching material, organised in folders.', icon: ico.note },
]

export default function TeacherLayout() {
  const [collections, setCollections] = useState([])
  const [myCollections, setMyCollections] = useState([])

  const load = async () => {
    try {
      const [all, mine] = await Promise.all([
        api.get('/collections'),
        api.get('/collections/my'),
      ])
      setCollections(all.data)
      setMyCollections(mine.data)
    } catch {
      /* keep whatever we had; pages still render */
    }
  }

  useEffect(() => { load() }, [])

  return (
    <DashboardShell base="/teacher" roleLabel="Teacher workspace" nav={NAV}>
      <Outlet context={{ collections, myCollections, reload: load }} />
    </DashboardShell>
  )
}
