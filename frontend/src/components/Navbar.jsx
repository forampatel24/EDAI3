import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5C6.5 4 9 4 12 5.5c3-1.5 5.5-1.5 8 0v13c-2.5-1.5-5-1.5-8 0-3-1.5-5.5-1.5-8 0v-13z"
        fill="#fff"
        stroke="#22314f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 5.5v13" stroke="#22314f" strokeWidth="1.5" />
      <circle cx="18.4" cy="6.2" r="1.7" fill="#e9b949" stroke="#22314f" strokeWidth="1.2" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const home = user ? (user.role === 'teacher' ? '/teacher' : '/student') : '/'
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to={home} className="brand" aria-label="EduGen home">
          <span className="brand-mark"><Mark /></span>
          <span>
            <span className="brand-name">EduGen</span>
            <span className="brand-tag">Curriculum-grounded RAG</span>
          </span>
        </Link>

        <div className="nav-links">
          {user ? (
            <>
              <Link to={home} className="nav-link">Dashboard</Link>
              <span className={`badge ${user.role === 'teacher' ? 'badge-yellow' : 'badge-mint'}`}>
                {user.role}
              </span>
              <span className="nav-user">
                <b>{user.name || user.email}</b>
              </span>
              <button onClick={handleLogout} className="btn btn-ghost">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
