import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Search, Trash2, 
  MapPin, CheckCircle, Truck, AlertTriangle
} from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

export default function Purchases({ token, API_URL }) {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [partners, setPartners] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [view, setView] = useState('add'); // 'add' or 'list'

  // Meta data for the invoice
  const [formData, setFormData] = useState({
    purchase_date: today(),
    supplier_id: '',
    partner_id: '',
    market_name: '',
    transport_charge: '',
    labour_charge: '',
    other_charge: '',
    payment_method: 'Cash',
    remark: ''
  });

  // Current item being added to the cart
  const [currentItem, setCurrentItem] = useState({
    vegetable_name: '',
    quantity: '',
    purchase_rate: ''
  });

  // The shopping cart (array of items)
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, partRes] = await Promise.all([
        fetch(`${API_URL}/api/purchases`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/suppliers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/expenses/partners`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false }))
      ]);

      if (purRes.ok) setPurchases(await purRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (partRes.ok) setPartners(await partRes.json());

    } catch (err) {
      console.error(err);
      setError('Failed to load required data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleItemChange = (e) => setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });

  // Add current item to the cart
  const handleAddItem = () => {
    if (!currentItem.vegetable_name.trim()) return setError('Please enter a vegetable name');
    if (!currentItem.quantity || parseFloat(currentItem.quantity) <= 0) return setError('Invalid quantity');
    if (!currentItem.purchase_rate || parseFloat(currentItem.purchase_rate) < 0) return setError('Invalid rate');

    const q = parseFloat(currentItem.quantity);
    const r = parseFloat(currentItem.purchase_rate);

    setCart([...cart, {
      vegetable_name: currentItem.vegetable_name.trim(),
      quantity: q,
      purchase_rate: r,
      total_amount: q * r
    }]);

    // Reset item form
    setCurrentItem({ vegetable_name: '', quantity: '', purchase_rate: '' });
    setError('');
  };

  // Remove item from cart
  const removeItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const baseAmount = cart.reduce((sum, item) => sum + item.total_amount, 0);
  const t = parseFloat(formData.transport_charge) || 0;
  const l = parseFloat(formData.labour_charge) || 0;
  const o = parseFloat(formData.other_charge) || 0;
  const grandTotal = baseAmount + t + l + o;

  // Submit the entire cart to the backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Your cart is empty! Please add at least one vegetable.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        cart,
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
      
      setSuccess('Market Purchase saved successfully!');
      
      // Reset everything
      setCart([]);
      setFormData({
        ...formData,
        transport_charge: '',
        labour_charge: '',
        other_charge: '',
        remark: ''
      });
      
      fetchInitialData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render expanded items for history view
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const toggleInvoiceDetails = async (invoiceId) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
      return;
    }
    setExpandedInvoice(invoiceId);
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_URL}/api/purchases/${invoiceId}/items`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setInvoiceItems(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <div className="page-container animate-fade">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Market Purchases</h1>
          <p className="page-subtitle">Multi-item purchase entry (No Stock Update)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('add')} className={`btn ${view === 'add' ? 'btn-primary' : 'btn-secondary'}`}>
            <Plus size={16} /> New Bill
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
                <MapPin size={18} /> Purchase Invoice Details
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

          {/* Section 2: Cart System */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ backgroundColor: '#fff', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-orange)' }}>
                <ShoppingCart size={18} /> Items Cart
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Add Item Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vegetable Name *</label>
                  <input type="text" name="vegetable_name" className="form-control" placeholder="e.g. Tomato (Special)" value={currentItem.vegetable_name} onChange={handleItemChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity *</label>
                  <input type="number" step="0.01" name="quantity" className="form-control" placeholder="e.g. 200" value={currentItem.quantity} onChange={handleItemChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rate (₹) *</label>
                  <input type="number" step="0.01" name="purchase_rate" className="form-control" placeholder="e.g. 18.5" value={currentItem.purchase_rate} onChange={handleItemChange} />
                </div>
                <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ height: '42px', padding: '0 1.5rem', borderColor: 'var(--color-green)', color: 'var(--color-green)' }}>
                  <Plus size={16} /> Add
                </button>
              </div>

              {/* Cart Table */}
              {cart.length > 0 && (
                <div className="table-responsive" style={{ marginTop: '1.5rem' }}>
                  <table className="table custom-table">
                    <thead>
                      <tr>
                        <th>Vegetable Name</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.vegetable_name}</td>
                          <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>₹{item.purchase_rate}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.total_amount.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => removeItem(idx)} className="btn btn-danger" style={{ padding: '0.4rem' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Cart Subtotal (Base Amount):</span>
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
                  {loading ? 'Saving...' : 'Save Purchase'}
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
                  <th>Bill ID</th>
                  <th>Supplier</th>
                  <th>Market</th>
                  <th style={{ textAlign: 'center' }}>Items</th>
                  <th style={{ textAlign: 'right' }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No purchases found.</td></tr>
                ) : (
                  purchases.map(p => (
                    <React.Fragment key={p.id}>
                      <tr className="hover-row" style={{ cursor: 'pointer' }} onClick={() => toggleInvoiceDetails(p.id)}>
                        <td>{p.purchase_date}</td>
                        <td><span className="badge badge-success">INV-{p.id}</span></td>
                        <td style={{ fontWeight: 600 }}>{p.supplier_name || 'Cash Purchase'}</td>
                        <td>{p.market_name || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{p.total_items} items</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-green)' }}>
                          ₹{p.grand_total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      {expandedInvoice === p.id && (
                        <tr>
                          <td colSpan="6" style={{ backgroundColor: '#F8FAFC', padding: '1.5rem' }}>
                            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Items in this Bill:</div>
                            {loadingItems ? (
                              <div>Loading items...</div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vegetable</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qty</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Rate (₹)</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoiceItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{item.vegetable_name}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.quantity}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.purchase_rate}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{item.total_amount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                              <div>
                                <div style={{ color: 'var(--text-muted)' }}>Additional Charges:</div>
                                <div>Transport: ₹{p.transport_charge || 0}</div>
                                <div>Labour: ₹{p.labour_charge || 0}</div>
                                <div>Other: ₹{p.other_charges || 0}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Payment Method: <strong>{p.payment_method}</strong></div>
                                {p.partner_name && <div style={{ color: 'var(--text-muted)' }}>Paid By: <strong>{p.partner_name}</strong></div>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
