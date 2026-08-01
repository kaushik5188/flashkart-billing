import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Users, Search, 
  MapPin, CheckCircle, TrendingUp, AlertTriangle, Truck, Calculator
} from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

export default function Purchases({ token, API_URL }) {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [view, setView] = useState('add'); // 'add' or 'list'

  const [formData, setFormData] = useState({
    purchase_date: today(),
    supplier_id: '',
    partner_id: '',
    market_name: '',
    product_id: '',
    quantity: '',
    purchase_rate: '',
    transport_charge: '',
    labour_charge: '',
    other_charge: '',
    payment_method: 'Cash'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes, partRes] = await Promise.all([
        fetch(`${API_URL}/api/purchases`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/suppliers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/settings/partners`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false }))
      ]);

      if (purRes.ok) setPurchases(await purRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      
      const ptRes = await fetch(`${API_URL}/api/expenses/partners`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (ptRes.ok) setPartners(await ptRes.json());

    } catch (err) {
      console.error(err);
      setError('Failed to load required data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const q = parseFloat(formData.quantity) || 0;
  const r = parseFloat(formData.purchase_rate) || 0;
  const t = parseFloat(formData.transport_charge) || 0;
  const l = parseFloat(formData.labour_charge) || 0;
  const o = parseFloat(formData.other_charge) || 0;
  const baseAmount = q * r;
  const grandTotal = baseAmount + t + l + o;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity || !formData.purchase_rate) {
      setError('Product, Quantity, and Rate are mandatory.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        base_amount: baseAmount,
        grand_total: grandTotal
      };

      const res = await fetch(`${API_URL}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save purchase');
      
      setSuccess('Market Purchase logged successfully! Inventory updated.');
      setFormData({
        ...formData,
        product_id: '',
        quantity: '',
        purchase_rate: '',
        transport_charge: '',
        labour_charge: '',
        other_charge: ''
      });
      fetchInitialData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Market Purchases</h1>
          <p className="page-subtitle">Market purchase entry & stock intake</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('add')} className={`btn ${view === 'add' ? 'btn-primary' : 'btn-secondary'}`}>
            <Plus size={16} /> New Entry
          </button>
          <button onClick={() => setView('list')} className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}>
            <ShoppingCart size={16} /> View History
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {view === 'add' ? (
        <form onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          {/* Section 1: Meta Details */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ backgroundColor: '#fff', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-green)' }}>
                <MapPin size={18} /> Enter Market Purchase
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input type="date" name="purchase_date" className="form-control" value={formData.purchase_date} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Market Name</label>
                  <input type="text" name="market_name" className="form-control" placeholder="e.g. Vashi Market" value={formData.market_name} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vendor / Supplier *</label>
                  <select name="supplier_id" className="form-control" value={formData.supplier_id} onChange={handleChange} required>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.place})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Paid By (Partner)</label>
                  <select name="partner_id" className="form-control" value={formData.partner_id} onChange={handleChange}>
                    <option value="">-- Select Partner --</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Item Details */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ backgroundColor: '#fff', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-orange)' }}>
                <ShoppingCart size={18} /> Item Details
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Product *</label>
                  <select name="product_id" className="form-control" value={formData.product_id} onChange={handleChange} required>
                    <option value="">-- Select Vegetable --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hindi_name})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity *</label>
                  <input type="number" step="0.01" name="quantity" className="form-control" placeholder="e.g. 200" value={formData.quantity} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rate (₹) *</label>
                  <input type="number" step="0.01" name="purchase_rate" className="form-control" placeholder="e.g. 18.5" value={formData.purchase_rate} onChange={handleChange} required />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Base Amount (Qty × Rate):</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{baseAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Additional Charges */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ backgroundColor: '#fff', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-info)' }}>
                <Truck size={18} /> Additional Charges
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Transport (₹)</label>
                  <input type="number" step="0.01" name="transport_charge" className="form-control" value={formData.transport_charge} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Labour (₹)</label>
                  <input type="number" step="0.01" name="labour_charge" className="form-control" value={formData.labour_charge} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Other (₹)</label>
                  <input type="number" step="0.01" name="other_charge" className="form-control" value={formData.other_charge} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Grand Total & Submit */}
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, var(--color-green-dark) 0%, var(--color-green) 100%)', 
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 25px -5px rgba(46, 125, 50, 0.4)'
          }}>
            <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '0.25rem' }}>Final Grand Total</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                  <select name="payment_method" className="form-control" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} value={formData.payment_method} onChange={handleChange}>
                    <option style={{color: '#000'}} value="Cash">Cash (Paid)</option>
                    <option style={{color: '#000'}} value="Credit">Credit (Unpaid)</option>
                    <option style={{color: '#000'}} value="UPI">UPI</option>
                  </select>
                </div>
                <button type="submit" className="btn" disabled={loading} style={{ 
                  backgroundColor: '#fff', 
                  color: 'var(--color-green-dark)',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {loading ? 'Saving...' : 'Save & Update Stock'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No purchases found.</td></tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id}>
                      <td>{p.purchase_date}</td>
                      <td style={{ fontWeight: 600 }}>{p.supplier_name}</td>
                      <td>{p.product_name}</td>
                      <td>{p.quantity}</td>
                      <td>₹{p.purchase_rate}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-green)' }}>
                        ₹{p.grand_total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
