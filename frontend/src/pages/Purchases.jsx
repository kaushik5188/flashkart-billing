import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Calendar, Search, History } from 'lucide-react';

export default function Purchases({ token, API_URL, user }) {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'new'
  
  // Form State
  const today = new Date().toISOString().split('T')[0];
  const initialForm = {
    purchase_date: today,
    supplier_id: '',
    partner_id: '',
    market_name: 'Wholesale Market',
    product_id: '',
    quantity: '',
    purchase_rate: '',
    transport_charge: '',
    labour_charge: '',
    other_charges: '',
    payment_method: 'Cash',
    remark: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      
      // Fallback if partners API doesn't exist yet, we'll implement it if needed, but for now it might be under /api/expenses/partners
      const ptRes = await fetch(`${API_URL}/api/expenses/partners`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (ptRes.ok) setPartners(await ptRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calculations
  const q = parseFloat(formData.quantity) || 0;
  const r = parseFloat(formData.purchase_rate) || 0;
  const baseAmount = q * r;
  const tCharge = parseFloat(formData.transport_charge) || 0;
  const lCharge = parseFloat(formData.labour_charge) || 0;
  const oCharge = parseFloat(formData.other_charges) || 0;
  const grandTotal = baseAmount + tCharge + lCharge + oCharge;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id || !formData.product_id || q <= 0 || r <= 0) {
      alert("Please fill all required fields correctly.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        total_amount: baseAmount,
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
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save purchase');
      }
      
      alert("Purchase recorded! Stock updated automatically.");
      setFormData(initialForm);
      setViewMode('list');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="icon-wrapper" style={{ backgroundColor: 'var(--color-orange-light)', color: 'var(--color-orange)' }}>
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="page-title">Purchases</h1>
            <p className="page-subtitle">Market purchase entry & stock intake</p>
          </div>
        </div>
        <div>
          {viewMode === 'list' ? (
            <button className="btn btn-primary" onClick={() => setViewMode('new')}>
              <Plus size={18} /> New Purchase Entry
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
              <History size={18} /> View History
            </button>
          )}
        </div>
      </header>

      {viewMode === 'new' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <h3>Enter Market Purchase</h3>
          </div>
          <form onSubmit={handleSubmit} className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Date *</label>
                <input required type="date" className="input" name="purchase_date" value={formData.purchase_date} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Market Name</label>
                <input type="text" className="input" name="market_name" value={formData.market_name} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label>Vendor / Supplier *</label>
                <select required className="input" name="supplier_id" value={formData.supplier_id} onChange={handleInputChange}>
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label>Paid By (Partner)</label>
                <select className="input" name="partner_id" value={formData.partner_id} onChange={handleInputChange}>
                  <option value="">-- Select Partner --</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <h4 style={{ margin: '2rem 0 1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Item Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Product *</label>
                <select required className="input" name="product_id" value={formData.product_id} onChange={handleInputChange}>
                  <option value="">-- Select Vegetable --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input required type="number" step="0.01" className="input" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="e.g. 200" />
              </div>
              <div className="form-group">
                <label>Rate (₹) *</label>
                <input required type="number" step="0.01" className="input" name="purchase_rate" value={formData.purchase_rate} onChange={handleInputChange} placeholder="e.g. 18.5" />
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Base Amount (Qty × Rate):</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>₹{baseAmount.toFixed(2)}</span>
              </div>
            </div>

            <h4 style={{ margin: '2rem 0 1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Additional Charges</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Transport (₹)</label>
                <input type="number" step="0.01" className="input" name="transport_charge" value={formData.transport_charge} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Labour (₹)</label>
                <input type="number" step="0.01" className="input" name="labour_charge" value={formData.labour_charge} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Other (₹)</label>
                <input type="number" step="0.01" className="input" name="other_charges" value={formData.other_charges} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', borderRadius: '8px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-green-dark)' }}>FINAL GRAND TOTAL:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-green)' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-green-dark)', marginTop: '0.5rem' }}>
                This exact true cost will be divided into the quantity to calculate the exact True Average Cost of the stock.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Payment Status</label>
                <select className="input" name="payment_method" value={formData.payment_method} onChange={handleInputChange}>
                  <option value="Cash">Paid - Cash</option>
                  <option value="Bank/UPI">Paid - Bank/UPI</option>
                  <option value="Credit">Credit / Unpaid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Remark / Notes</label>
                <input type="text" className="input" name="remark" value={formData.remark} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewMode('list')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                {isSubmitting ? 'Saving...' : 'Save Purchase Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Qty/Rate</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading purchases...</td></tr>
                ) : purchases.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No purchase history found.</td></tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id}>
                      <td>{p.purchase_date}</td>
                      <td style={{ fontWeight: 600 }}>{p.supplier_name || '-'}</td>
                      <td>{p.product_name || '-'}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.quantity}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@ ₹{p.purchase_rate}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{p.grand_total.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${p.payment_method === 'Credit' ? 'badge-danger' : 'badge-success'}`}>
                          {p.payment_method}
                        </span>
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
