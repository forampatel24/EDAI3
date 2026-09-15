import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault(); setError('')
    try {
      const user = await login(email, password)
      navigate(user.role==='teacher'?'/teacher':'/student')
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  return (
    <div style={{ maxWidth:420, margin:'40px auto', background:'white', padding:24, borderRadius:12, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>Login</h2>
      <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={inputStyle} />
        {error && <div style={{ color:'red', background:'#ffebee', padding:8, borderRadius:6 }}>{error}</div>}
        <button type="submit" style={btnStyle}>Login</button>
      </form>
      <p style={{ marginTop:12 }}>No account? <Link to="/signup">Signup</Link></p>
      <div style={{ marginTop:12, fontSize:12, color:'#666', background:'#f5f5f5', padding:8, borderRadius:6 }}>
        Demo: create teacher or student account. Password is hashed (bcrypt) + JWT.
      </div>
    </div>
  )
}
const inputStyle = { padding:10, borderRadius:6, border:'1px solid #ccc' }
const btnStyle = { background:'#1a237e', color:'white', border:'none', padding:10, borderRadius:6, cursor:'pointer' }
