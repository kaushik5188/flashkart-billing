import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, ShieldOff, Key, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UsersPage({ token, API_URL, user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load users.');
      const data = await res.json();
      setUsers(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditUser(null);
    setForm({ username: '', password: '', role: 'staff' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.username.trim()) { setFormError('Username is required.'); return; }
    if (!editUser && !form.password) { setFormError('Password is required for new users.'); return; }
    setFormLoading(true);
    try {
      let res;
      if (editUser) {
        res = await fetch(`${API_URL}/api/users/${editUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: form.role, ...(form.password ? { password: form.password } : {}) })
        });
      } else {
        res = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form)
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user.');
      setShowModal(false);
      setSuccess(editUser ? 'User updated successfully.' : `User "${form.username}" created!`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${action} user "${u.username}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${u.id}`, {
        method: newStatus === 'inactive' ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`User ${action.toLowerCase()}d.`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleResetPassword = async () => {
    if (!newPassword) { setFormError('Enter a new password.'); return; }
    setFormLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowResetModal(false);
      setSuccess(`Password reset for "${resetTarget.username}".`);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="glass-card animate-fade" style={{ textAlign: 'center', padding: '3rem' }}>
        <ShieldOff size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>Only administrators can manage user accounts.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Manage admin and staff accounts with role-based access control
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <UserPlus size={16} /> Create New User
        </button>
      </div>

      {success && (
        <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '8px', fontSize: '0.9rem' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Role Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { role: 'Admin', icon: ShieldCheck, color: 'var(--color-green)', bg: 'var(--color-green-light)', desc: 'Full access — can create/edit/delete all records, manage users, and view all reports.' },
          { role: 'Staff', icon: Users, color: 'var(--color-orange)', bg: 'var(--color-orange-light)', desc: 'Limited access — can add bills, and view reports. Cannot delete records or manage users.' }
        ].map(r => {
          const Icon = r.icon;
          return (
            <div key={r.role} className="glass-card" style={{ display: 'flex', gap: '1rem', padding: '1.25rem', borderLeft: `4px solid ${r.color}` }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} style={{ color: r.color }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>{r.role} Role</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{r.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="table-container" style={{ margin: 0 }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found.</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{u.username}</div>
                  {u.id === user?.id && <div style={{ fontSize: '0.7rem', color: 'var(--color-green)', fontWeight: 600 }}>← You (current session)</div>}
                </td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-success' : 'badge-warning'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 10px', textTransform: 'capitalize' }}>
                    {u.role === 'admin' ? <ShieldCheck size={12} /> : <Users size={12} />} {u.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 10px', textTransform: 'capitalize' }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {u.created_at?.substring(0, 10) || '—'}
                </td>
                <td>
                  {u.id !== user?.id ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { setEditUser(u); setForm({ username: u.username, password: '', role: u.role }); setFormError(''); setShowModal(true); }}
                        className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                        Edit Role
                      </button>
                      <button
                        onClick={() => { setResetTarget(u); setNewPassword(''); setFormError(''); setShowResetModal(true); }}
                        className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                        <Key size={12} /> Reset Pwd
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`btn ${u.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: u.status === 'active' ? 'var(--color-danger)' : 'white' }}>
                        {u.status === 'active' ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                        {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current session</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div className="glass-card animate-slide" style={{ width: '100%', maxWidth: '420px', padding: '2rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800 }}>{editUser ? 'Edit User Role' : 'Create New User'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '6px 8px' }}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '6px' }}>
                {formError}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Username *</label>
              <input type="text" className="form-control" placeholder="e.g. raju_staff"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={!!editUser} />
            </div>

            {!editUser && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" placeholder="Minimum 6 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Role *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['admin', 'staff'].map(r => (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                    style={{
                      padding: '10px', borderRadius: '8px', border: '2px solid',
                      borderColor: form.role === r ? 'var(--color-green)' : 'var(--border-light)',
                      backgroundColor: form.role === r ? 'var(--color-green-light)' : 'transparent',
                      color: form.role === r ? 'var(--color-green-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize'
                    }}>
                    {r === 'admin' ? <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : <Users size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }} disabled={formLoading}>
                {formLoading ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div className="glass-card animate-slide" style={{ width: '100%', maxWidth: '380px', padding: '2rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Reset Password for "{resetTarget?.username}"</h3>
            {formError && <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '6px' }}>{formError}</div>}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">New Password *</label>
              <input type="password" className="form-control" placeholder="Enter new password"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleResetPassword} className="btn btn-primary" style={{ flex: 2 }} disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
