import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function EyeIcon({ off }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.53 9.53a3 3 0 1 0 4.24 4.24"/><path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><path d="M9.88 5.34A10.07 10.07 0 0 1 12 4c7 0 11 8 11 8a18.45 18.45 0 0 1-3.22 4.93"/></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )
}

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('teacher')
  const [error, setError] = useState('')
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault(); setError('')
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    if (!cleanEmail) return setError('Enter your email')
    try {
      const user = await signup(cleanEmail, password, role, cleanName || undefined)
      navigate(user.role==='teacher'?'/teacher':'/student')
    } catch (err) { setError(err.response?.data?.detail || err.message) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="eyebrow">Join EduGen</span>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Choose how you&apos;ll use the grounded content pipeline.</p>

        <form onSubmit={handle} className="auth-form">
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={e=>setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
          <div className="pw-field">
            <input
              className="input"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={()=>setShowPassword(s=>!s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>

          <div className="role-picker" role="radiogroup" aria-label="Account type">
            <button
              type="button"
              className={`role-opt ${role==='teacher' ? 'active' : ''}`}
              onClick={()=>setRole('teacher')}
              aria-pressed={role==='teacher'}
            >
              <b>Teacher</b>
              <small>Upload textbooks, build classrooms, publish material</small>
            </button>
            <button
              type="button"
              className={`role-opt ${role==='student' ? 'active' : ''}`}
              onClick={()=>setRole('student')}
              aria-pressed={role==='student'}
            >
              <b>Student</b>
              <small>Ask within the syllabus, save notes, practise</small>
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block">Create account</button>
        </form>

        <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
