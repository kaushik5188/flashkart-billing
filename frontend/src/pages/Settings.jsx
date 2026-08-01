import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Save, 
  Download, 
  RefreshCw, 
  Shield,
  Building,
  FileText,
  Key,
  Bell,
  Database
} from 'lucide-react';

export default function Settings({ token, API_URL, user }) {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logs, setLogs] = useState([]);

  // Password change states
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load settings.');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data);
    } catch {
      setLogs([]);
    }
  };

  const updateSetting = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveSettings = async () => {
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setMessage('All settings saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setMessage('');
    setError('');
    const formData = new FormData();
    formData.append('logo', logoFile);
    try {
      const res = await fetch(`${API_URL}/api/settings/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Logo upload failed.');
      setSettings(prev => ({ ...prev, company_logo: data.logo_path }));
      setMessage('Logo uploaded successfully!');
      setLogoFile(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed.');
      setPwdMsg('Password changed! Please login again next time.');
      setOldPwd(''); setNewPwd('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length < 4) { setError('PIN must be at least 4 digits.'); return; }
    try {
      const res = await fetch(`${API_URL}/api/auth/update-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin: newPin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN update failed.');
      setMessage('Security PIN updated successfully!');
      setNewPin('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportBackup = async () => {
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/settings/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashkart_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded successfully!');
    } catch (err) {
      setError(err.message || 'Backup export failed.');
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm('WARNING: Importing a backup will REPLACE all existing data. Are you sure?')) {
      e.target.value = '';
      return;
    }
    setMessage('');
    setError('');
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      const res = await fetch(`${API_URL}/api/settings/backup/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ backupData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      setMessage('Backup restored! Refreshing page...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err.message || 'Backup import failed. Invalid backup file format.');
    }
    e.target.value = '';
  };

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Building },
    { id: 'invoice', name: 'Invoice Setup', icon: FileText },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'backup', name: 'Backup & Restore', icon: Database },
    { id: 'logs', name: 'Activity Logs', icon: Bell },
  ];

  const fieldStyle = { marginBottom: '1.25rem' };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>System Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure company profile, invoicing rules, and backup options</p>
      </div>

      {(message || error) && (
        <div className={`badge ${error ? 'badge-danger' : 'badge-success'}`} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', justifyContent: 'center', borderRadius: '8px' }}>
          {error || message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
        {/* Settings Nav Panel */}
        <div className="glass-card" style={{ padding: '0.75rem', alignSelf: 'start' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'logs') fetchLogs(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  marginBottom: '4px',
                  backgroundColor: isActive ? 'var(--color-green-light)' : 'transparent',
                  color: isActive ? 'var(--color-green-dark)' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Icon size={16} style={{ color: isActive ? 'var(--color-green)' : 'var(--text-muted)' }} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Settings Content Panel */}
        <div className="glass-card">

          {/* ---- COMPANY INFO ---- */}
          {activeTab === 'company' && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} style={{ color: 'var(--color-green)' }} /> Company Profile & Contact Details
              </h3>

              {/* Logo Upload Area */}
              <div style={fieldStyle}>
                <label className="form-label">Company Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '12px',
                    border: '2px dashed var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', backgroundColor: 'var(--bg-app)'
                  }}>
                    {settings.company_logo ? (
                      <img src={`${API_URL}${settings.company_logo}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>🥦</span>
                    )}
                  </div>
                  <div>
                    <input type="file" accept="image/*" id="logoUpload" style={{ display: 'none' }} onChange={(e) => setLogoFile(e.target.files[0])} />
                    <label htmlFor="logoUpload" className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: '6px', display: 'inline-flex' }}>
                      <Upload size={14} /> {logoFile ? logoFile.name : 'Choose Logo File'}
                    </label>
                    {logoFile && (
                      <button onClick={handleLogoUpload} className="btn btn-primary" style={{ marginLeft: '8px' }}>
                        Upload Logo
                      </button>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG/JPG, max 2MB. This logo appears on all printed invoices.</p>
                  </div>
                </div>
              </div>

              {[
                { key: 'company_name', label: 'Company Name', placeholder: 'FLASHKART' },
                { key: 'tagline', label: 'Tagline / Subtitle', placeholder: 'Fresh Fruits & Vegetables Supplier' },
                { key: 'owners', label: 'Owner Name(s)', placeholder: 'Kaushik Patel, Om Patel' },
                { key: 'contacts', label: 'Contact Numbers', placeholder: '6352856495, 9773271029' },
                { key: 'gst_number', label: 'GST Registration Number', placeholder: '24AAAAA0000A1Z5' },
                { key: 'address', label: 'Business Address', placeholder: 'Vegetable Market, Ahmedabad' },
                { key: 'upi_id', label: 'UPI ID (for QR code on bills)', placeholder: '6352856495@upi' },
              ].map(field => (
                <div key={field.key} style={fieldStyle}>
                  <label className="form-label">{field.label}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={field.placeholder}
                    value={settings[field.key] || ''}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                  />
                </div>
              ))}

              <button onClick={handleSaveSettings} className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
                <Save size={16} /> Save Company Profile
              </button>
            </div>
          )}

          {/* ---- INVOICE SETUP ---- */}
          {activeTab === 'invoice' && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--color-green)' }} /> Invoice Numbering & Footer Settings
              </h3>

              <div style={fieldStyle}>
                <label className="form-label">Invoice Number Prefix</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="FK"
                  value={settings.invoice_prefix || 'FK'}
                  onChange={(e) => updateSetting('invoice_prefix', e.target.value)}
                  maxLength={10}
                  style={{ maxWidth: '200px' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Preview: <strong>{settings.invoice_prefix || 'FK'}0001</strong>, <strong>{settings.invoice_prefix || 'FK'}0002</strong>...
                </p>
              </div>

              <div style={fieldStyle}>
                <label className="form-label">Invoice Terms & Conditions (Footer Text)</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="1. Goods once sold will not be taken back.&#10;2. Subject to local jurisdiction."
                  value={settings.invoice_terms || ''}
                  onChange={(e) => updateSetting('invoice_terms', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button onClick={handleSaveSettings} className="btn btn-primary" disabled={loading}>
                <Save size={16} /> Save Invoice Settings
              </button>
            </div>
          )}

          {/* ---- SECURITY ---- */}
          {activeTab === 'security' && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: 'var(--color-green)' }} /> Admin Security Settings
              </h3>

              {pwdMsg && (
                <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center' }}>
                  {pwdMsg}
                </div>
              )}

              <div style={{ maxWidth: '480px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>Change Login Password</h4>
                <form onSubmit={handleChangePassword}>
                  <div style={fieldStyle}>
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-control" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
                  </div>
                  <div style={fieldStyle}>
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-control" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Key size={16} /> Update Login Password
                  </button>
                </form>

                <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '2rem', paddingTop: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>Update Reset PIN</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    This PIN is used to reset your password if you forget it (default is 1234).
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="New 4-digit PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      maxLength={6}
                      style={{ maxWidth: '160px' }}
                    />
                    <button onClick={handleUpdatePin} className="btn btn-highlight">
                      Update PIN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- BACKUP & RESTORE ---- */}
          {activeTab === 'backup' && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: 'var(--color-green)' }} /> Database Backup & Restore
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-card" style={{ borderLeft: '4px solid var(--color-green)', padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <Download size={16} style={{ color: 'var(--color-green)', marginRight: '6px' }} />
                    Export Backup
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                    Downloads all your customers, invoices, products, and inventory as a JSON file. Keep this file safe!
                  </p>
                  <button onClick={handleExportBackup} className="btn btn-primary" style={{ width: '100%' }}>
                    <Download size={16} /> Download JSON Backup
                  </button>
                </div>

                <div className="glass-card" style={{ borderLeft: '4px solid var(--color-orange)', padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <RefreshCw size={16} style={{ color: 'var(--color-orange)', marginRight: '6px' }} />
                    Restore from Backup
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                    ⚠️ WARNING: This will overwrite ALL current data. Only use a valid FLASHKART backup file.
                  </p>
                  <input type="file" accept=".json" id="restoreInput" style={{ display: 'none' }} onChange={handleImportBackup} />
                  <label htmlFor="restoreInput" className="btn btn-highlight" style={{ cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                    <Upload size={16} /> Select Backup File to Restore
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Backup Best Practices</h4>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
                  <li>Download a backup every day before closing the shop</li>
                  <li>Store backup files in Google Drive or WhatsApp Self-Chat</li>
                  <li>Before switching computers, export backup and import on the new machine</li>
                  <li>Never share backup files with unauthorized persons</li>
                </ul>
              </div>
            </div>
          )}

          {/* ---- ACTIVITY LOGS ---- */}
          {activeTab === 'logs' && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: 'var(--color-green)' }} /> Recent System Activity Audit Trail
              </h3>
              <div className="table-container" style={{ margin: 0, border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin User</th>
                      <th>Action Code</th>
                      <th>Action Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No activity records found.</td></tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.created_at?.substring(0, 19)}</td>
                          <td style={{ fontWeight: 600 }}>{log.username || 'System'}</td>
                          <td><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{log.action}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
