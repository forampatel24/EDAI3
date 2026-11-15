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
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h2 className="auth-title">Log in</h2>
        <p className="auth-sub">Pick up your collections, classroom and notes.</p>

        <form onSubmit={handle} className="auth-form">
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
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block">Log in</button>
        </form>

        <p className="auth-alt">No account yet? <Link to="/signup">Create one</Link></p>
        <div className="form-hint">
          Demo accounts — teacher: <b>teacher@demo.com</b> / teacher123 · student:{' '}
          <b>student@demo.com</b> / student123
        </div>
      </div>
    </div>
  )
}
