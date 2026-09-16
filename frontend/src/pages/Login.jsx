import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <input placeholder="Password" type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} required style={{ ...inputStyle, flex:1, paddingRight:40 }} />
          <button type="button" onClick={()=>setShowPassword(s=>!s)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} style={{ position:'absolute', right:8, background:'transparent', border:'none', cursor:'pointer', padding:4, lineHeight:0, color:'#666' }}>
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.53 9.53a3 3 0 1 0 4.24 4.24"/><path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><path d="M9.88 5.34A10.07 10.07 0 0 1 12 4c7 0 11 8 11 8a18.45 18.45 0 0 1-3.22 4.93"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
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
