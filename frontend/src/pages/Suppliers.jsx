import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Phone, MapPin, Truck } from 'lucide-react';

export default function Suppliers({ token, API_URL, user }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API_URL}/api/suppliers/${editingId}`
        : `${API_URL}/api/suppliers`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save supplier');
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', mobile: '', address: '' });
      fetchSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (supp) => {
    setEditingId(supp.id);
    setFormData({
      name: supp.name,
      mobile: supp.mobile,
      address: supp.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetch(`${API_URL}/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete');
      }
      fetchSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.mobile.includes(searchTerm)
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="icon-wrapper" style={{ backgroundColor: 'var(--color-blue-light)', color: 'var(--color-blue)' }}>
            <Truck size={28} />
          </div>
          <div>
            <h1 className="page-title">Suppliers</h1>
            <p className="page-subtitle">Manage vendors and market suppliers</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setFormData({ name: '', mobile: '', address: '' });
            setShowModal(true);
          }}>
            <Plus size={18} /> Add Supplier
          </button>
        )}
      </header>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search suppliers by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Address</th>
                <th style={{ textAlign: 'right' }}>Total Purchases</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                {user?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading suppliers...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No suppliers found.</td></tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <Phone size={14} className="text-muted" /> {s.mobile}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <MapPin size={14} className="text-muted" /> {s.address || '-'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(s.total_purchases || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: (s.outstanding_balance || 0) > 0 ? 'var(--color-danger)' : 'var(--text-main)' }}>
                      ₹{(s.outstanding_balance || 0).toFixed(2)}
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-icon" onClick={() => handleEdit(s)} title="Edit"><Edit2 size={16} /></button>
                        <button className="btn btn-icon" onClick={() => handleDelete(s.id)} title="Delete"><Trash2 size={16} color="var(--color-danger)"/></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input required type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input required type="text" className="input" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Market Address</label>
                <input type="text" className="input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
