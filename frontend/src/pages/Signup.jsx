import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('teacher')
  const [error, setError] = useState('')
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault(); setError('')
    try {
      const user = await signup(email, password, role, name)
      navigate(user.role==='teacher'?'/teacher':'/student')
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  return (
    <div style={{ maxWidth:420, margin:'40px auto', background:'white', padding:24, borderRadius:12, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>Signup</h2>
      <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={inputStyle} />
        <select value={role} onChange={e=>setRole(e.target.value)} style={inputStyle}>
          <option value="teacher">Teacher (can upload & generate)</option>
          <option value="student">Student (view & generate only)</option>
        </select>
        {error && <div style={{ color:'red', background:'#ffebee', padding:8, borderRadius:6 }}>{error}</div>}
        <button type="submit" style={btnStyle}>Create Account</button>
      </form>
      <p style={{ marginTop:12 }}>Have account? <Link to="/login">Login</Link></p>
    </div>
  )
}
const inputStyle = { padding:10, borderRadius:6, border:'1px solid #ccc' }
const btnStyle = { background:'#1a237e', color:'white', border:'none', padding:10, borderRadius:6, cursor:'pointer' }
