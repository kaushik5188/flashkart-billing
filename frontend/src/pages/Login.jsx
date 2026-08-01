import React, { useState } from 'react';
import { Sprout, Lock, User, KeyRound } from 'lucide-react';

export default function Login({ setToken, setUser, API_URL }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isForgot, setIsForgot] = useState(false);
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      localStorage.setItem('fk_token', data.token);
      localStorage.setItem('fk_user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }

      setMessage(data.message);
      setIsForgot(false);
      setPassword('');
      setNewPassword('');
      setPin('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(251, 140, 0, 0.05) 100%)',
      padding: '1rem'
    }}>
      <div className="glass-card animate-slide" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: 'var(--color-green-light)',
            color: 'var(--color-green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Sprout size={36} />
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--color-green)', fontWeight: 800 }}>FLASHKART</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Fresh Fruits & Vegetables Supplier
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            justifyContent: 'center',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div className="badge badge-success" style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            justifyContent: 'center',
            borderRadius: '8px'
          }}>
            {message}
          </div>
        )}

        {!isForgot ? (
          /* Login Form */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Admin Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); setError(''); setMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-orange)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 0'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
              Default admin: <strong>admin</strong> | Password: <strong>admin123</strong>
            </p>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleReset}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>Reset Admin Password</h3>
            
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username (e.g. admin)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Security Reset PIN (Default is 1234)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <KeyRound size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { setIsForgot(false); setError(''); }}
              >
                Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
