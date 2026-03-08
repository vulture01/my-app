import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    if (profile.role === 'student') navigate('/student')
    else if (profile.role === 'teacher') navigate('/teacher')
    else if (profile.role === 'admin') navigate('/admin')
    setLoading(false)
  }

  const handleSignup = async (role, name) => {
    const emails = { admin: 'admin@edusync.com', teacher: 'teacher@edusync.com', student: 'student@edusync.com' }
    const passwords = { admin: 'admin123', teacher: 'teacher123', student: 'student123' }
    const names = { admin: 'Admin User', teacher: 'Teacher User', student: 'Student User' }
    const { error } = await supabase.auth.signUp({
      email: emails[role],
      password: passwords[role],
      options: { data: { full_name: names[role], role: role } }
    })
    if (error) alert(error.message)
    else alert(role + ' created successfully!')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', width: '360px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>EduSync</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>Sign in to your account</p>
        {error && <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>}
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginBottom: '12px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}