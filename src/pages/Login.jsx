import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../context/ThemeContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Change password form state
  const [showChangePw, setShowChangePw] = useState(false)
  const [cpEmail, setCpEmail] = useState('')
  const [cpOld, setCpOld] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpMsg, setCpMsg] = useState('')
  const [cpError, setCpError] = useState('')
  const [cpLoading, setCpLoading] = useState(false)

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

  const handleChangePassword = async () => {
    setCpError('')
    setCpMsg('')
    if (!cpEmail || !cpOld || !cpNew || !cpConfirm) {
      setCpError('All fields are required.'); return
    }
    if (cpNew !== cpConfirm) {
      setCpError('New password and confirm password do not match.'); return
    }
    if (cpNew.length < 6) {
      setCpError('New password must be at least 6 characters.'); return
    }
    setCpLoading(true)
    // Sign in with old credentials to verify
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: cpEmail, password: cpOld })
    if (signInErr) {
      setCpError('Old password is incorrect.'); setCpLoading(false); return
    }
    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: cpNew })
    if (updateErr) {
      setCpError(updateErr.message); setCpLoading(false); return
    }
    await supabase.auth.signOut()
    setCpMsg('Password changed successfully! Please sign in with your new password.')
    setCpLoading(false)
    setCpEmail(''); setCpOld(''); setCpNew(''); setCpConfirm('')
    setTimeout(() => { setShowChangePw(false); setCpMsg('') }, 3000)
  }

  const inputStyle = {
    width: '100%', padding: '10px', marginBottom: '12px',
    borderRadius: '4px', border: '1px solid var(--input-border)',
    boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)'
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg, #f0f2f5)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle /></div>
      <div style={{ backgroundColor: 'var(--card-bg)', padding: '40px', borderRadius: '8px', width: '360px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>

        {!showChangePw ? (
          <>
            <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Studyology</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px' }}>Sign in to your account</p>
            {error && <p style={{ color: 'red', marginBottom: '12px', fontSize: 14 }}>{error}</p>}
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ ...inputStyle, marginBottom: '20px' }} />
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '10px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginBottom: '12px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button onClick={() => { setShowChangePw(true); setError('') }}
              style={{ width: '100%', padding: '8px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#4f46e5', fontSize: '14px' }}>
              Change Password
            </button>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '6px', fontSize: 20 }}>Change Password</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: 13 }}>Enter your credentials to update</p>
            {cpError && <p style={{ color: 'red', marginBottom: '12px', fontSize: 13 }}>{cpError}</p>}
            {cpMsg && <p style={{ color: 'green', marginBottom: '12px', fontSize: 13 }}>{cpMsg}</p>}
            <input type="email" placeholder="Email" value={cpEmail}
              onChange={e => setCpEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Old Password" value={cpOld}
              onChange={e => setCpOld(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="New Password" value={cpNew}
              onChange={e => setCpNew(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm New Password" value={cpConfirm}
              onChange={e => setCpConfirm(e.target.value)}
              style={{ ...inputStyle, marginBottom: '20px' }} />
            <button onClick={handleChangePassword} disabled={cpLoading}
              style={{ width: '100%', padding: '10px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px', marginBottom: '10px' }}>
              {cpLoading ? 'Updating...' : 'Update Password'}
            </button>
            <button onClick={() => { setShowChangePw(false); setCpError(''); setCpMsg('') }}
              style={{ width: '100%', padding: '8px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#666', fontSize: '14px' }}>
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
