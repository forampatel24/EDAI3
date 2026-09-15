import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }
  return (
    <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 24px', background:'#1a237e', color:'white' }}>
      <Link to="/" style={{ color:'white', textDecoration:'none', fontWeight:700, fontSize:20 }}>📚 EDAI3 RAG</Link>
      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
        {user ? (
          <>
            <span style={{ background: user.role==='teacher' ? '#ff9800' : '#4caf50', padding:'4px 10px', borderRadius:12, fontSize:12, textTransform:'uppercase' }}>{user.role}</span>
            <span>{user.name} ({user.email})</span>
            {user.role==='teacher' && <Link to="/teacher" style={{ color:'white' }}>Teacher</Link>}
            {user.role==='student' && <Link to="/student" style={{ color:'white' }}>Student</Link>}
            <button onClick={handleLogout} style={{ background:'#e53935', color:'white', border:'none', padding:'6px 12px', borderRadius:6, cursor:'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color:'white' }}>Login</Link>
            <Link to="/signup" style={{ color:'white' }}>Signup</Link>
          </>
        )}
      </div>
    </nav>
  )
}
