import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  DollarSign, 
  Receipt, 
  History, 
  Filter, 
  PlusCircle 
} from 'lucide-react';

export default function Customers({ customerId, setCustomerId, token, API_URL, setInvoiceId }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Profile specific states
  const [profile, setProfile] = useState(null);
  const [ledger, setLedger] = useState({ invoices: [], payments: [] });
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Manual payment states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMsg, setPaymentMsg] = useState('');

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    gst_number: '',
    place: '',
    notes: ''
  });

  useEffect(() => {
    if (customerId) {
      fetchCustomerProfile(customerId);
    } else {
      fetchCustomers();
      setProfile(null);
    }
  }, [customerId, filterYear, filterMonth, filterDate]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/customers?search=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load customers.');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProfile = async (id) => {
    setLoading(true);
    setError('');
    try {
      // Get basic profile
      const profRes = await fetch(`${API_URL}/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!profRes.ok) throw new Error('Customer profile not found.');
      const profData = await profRes.json();
      setProfile(profData);

      // Get ledger list
      let url = `${API_URL}/api/customers/${id}/ledger?`;
      if (filterDate) url += `date=${filterDate}`;
      else {
        if (filterYear) url += `year=${filterYear}&`;
        if (filterMonth) url += `month=${filterMonth}&`;
      }

      const ledgerRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!ledgerRes.ok) throw new Error('Failed to load ledger history.');
      const ledgerData = await ledgerRes.json();
      setLedger(ledgerData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/api/customers/${editId}` : `${API_URL}/api/customers`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save customer details.');

      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', mobile: '', address: '', gst_number: '', place: '', notes: '' });
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (cust) => {
    setEditId(cust.id);
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      address: cust.address || '',
      gst_number: cust.gst_number || '',
      place: cust.place || '',
      notes: cust.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete customer profile: "${name}"?`)) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete customer.');
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setPaymentMsg('');
    setError('');
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

    try {
      const res = await fetch(`${API_URL}/api/customers/${customerId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: paymentAmount,
          payment_method: paymentMethod,
          remarks: paymentRemarks,
          date: paymentDate
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to apply payment.');

      setPaymentAmount('');
      setPaymentRemarks('');
      setPaymentMsg('Payment applied successfully!');
      
      // Reload profile
      fetchCustomerProfile(customerId);
    } catch (err) {
      setError(err.message);
    }
  };

  // Combine invoices and payments chronologically for a ledger statements view
  const getCombinedLedger = () => {
    const items = [];
    
    ledger.invoices.forEach(inv => {
      // Filter ledger invoices search
      if (ledgerSearch && !inv.bill_number.toLowerCase().includes(ledgerSearch.toLowerCase())) return;
      items.push({
        id: `INV-${inv.id}`,
        dbId: inv.id,
        date: inv.invoice_date,
        type: 'Bill (વેચાણ)',
        docNo: inv.bill_number,
        details: 'Fruits & Vegetables Wholesale Sales',
        debit: inv.grand_total,
        credit: 0,
        paid: inv.paid_amount,
        action: 'print'
      });
    });

    ledger.payments.forEach(pay => {
      if (ledgerSearch && pay.remarks && !pay.remarks.toLowerCase().includes(ledgerSearch.toLowerCase())) return;
      items.push({
        id: `PAY-${pay.id}`,
        dbId: pay.id,
        date: pay.payment_date,
        type: 'Receipt (જમા)',
        docNo: `PAY-${pay.id}`,
        details: `${pay.payment_method} Payment - ${pay.remarks || 'Outstanding cleared'}`,
        debit: 0,
        credit: pay.amount,
        paid: pay.amount,
        action: 'none'
      });
    });

    // Sort descending by date, then ID
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="animate-fade">
      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {error}
        </div>
      )}

      {!profile ? (
        /* CUSTOMER MANAGEMENT DIRECTORY VIEW */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Customer Profiles Directory</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View outstanding ledgers and billing records</p>
            </div>
            <button 
              onClick={() => { setEditId(null); setFormData({ name: '', mobile: '', address: '', gst_number: '', place: '', notes: '' }); setIsModalOpen(true); }} 
              className="btn btn-primary"
            >
              <UserPlus size={18} /> Create Customer
            </button>
          </div>

          {/* Search Bar */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search customer by name, mobile, or place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
              <button type="submit" className="btn btn-secondary">Search</button>
            </form>
          </div>

          {/* Customer Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Updating customers directory...</p>
            ) : customers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No customers matching search criteria.</p>
            ) : (
              <div className="table-container" style={{ margin: 0, border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Mobile Number</th>
                      <th>Place</th>
                      <th>Last Purchase</th>
                      <th>Total Purchases</th>
                      <th>Outstanding Balance</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(cust => (
                      <tr key={cust.id}>
                        <td 
                          onClick={() => setCustomerId(cust.id)} 
                          style={{ fontWeight: 700, color: 'var(--color-green-dark)', cursor: 'pointer' }}
                        >
                          {cust.name}
                        </td>
                        <td>{cust.mobile}</td>
                        <td>{cust.place || '-'}</td>
                        <td>{cust.last_purchase_date || 'No sales'}</td>
                        <td style={{ fontWeight: 600 }}>₹{cust.total_purchases.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${cust.outstanding_balance > 0 ? 'badge-warning' : 'badge-success'}`}>
                            ₹{cust.outstanding_balance.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => setCustomerId(cust.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            Ledger
                          </button>
                          <button onClick={() => handleEditClick(cust)} className="btn btn-secondary" style={{ padding: '6px' }} title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteClick(cust.id, cust.name)} className="btn btn-secondary" style={{ padding: '6px', color: 'var(--color-danger)' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* CUSTOMER PROFILE & LEDGER DETAIL VIEW */
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={() => setCustomerId(null)} className="btn btn-secondary" style={{ padding: '8px' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ledger: {profile.name}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Place: {profile.place || 'Not specified'} | Mobile: {profile.mobile}</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Purchase Value</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{profile.total_purchases.toFixed(2)}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--color-green-light)', color: 'var(--color-green)' }}>
                <Receipt size={20} />
              </div>
            </div>

            <div className="glass-card stats-card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-orange)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange-dark)' }}>
                  ₹{profile.outstanding_balance.toFixed(2)}
                </h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--color-orange-light)', color: 'var(--color-orange)' }}>
                <DollarSign size={20} />
              </div>
            </div>

            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Billing Date</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile.last_purchase_date || 'Never'}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'rgba(2, 136, 209, 0.1)', color: 'var(--color-info)' }}>
                <History size={20} />
              </div>
            </div>
          </div>

          {/* Ledger panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
            
            {/* Ledger Transactions History */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Statements & Invoices</h3>
                
                {/* Search & Filters */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search docs..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', maxWidth: '120px' }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Date picker filters */}
                    <input 
                      type="date" 
                      className="form-control" 
                      value={filterDate}
                      onChange={(e) => { setFilterDate(e.target.value); setFilterYear(''); setFilterMonth(''); }}
                      style={{ fontSize: '0.75rem', padding: '4px', width: '100px' }}
                    />
                    {(filterDate || filterYear || filterMonth) && (
                      <button 
                        onClick={() => { setFilterDate(''); setFilterYear(''); setFilterMonth(''); }}
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly/Yearly quick filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Filter size={14} /> Quick Month:
                </div>
                <select 
                  className="form-control" 
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setFilterDate(''); }}
                  style={{ fontSize: '0.75rem', padding: '2px 6px', width: '80px', height: '24px' }}
                >
                  <option value="">Year</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
                <select 
                  className="form-control" 
                  value={filterMonth}
                  disabled={!filterYear}
                  onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }}
                  style={{ fontSize: '0.75rem', padding: '2px 6px', width: '80px', height: '24px' }}
                >
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="table-container" style={{ margin: 0, border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Doc No</th>
                      <th>Transaction Type</th>
                      <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                      <th style={{ textAlign: 'center' }}>Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCombinedLedger().length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      getCombinedLedger().map(item => (
                        <tr key={item.id} style={{ borderLeft: item.credit > 0 ? '3px solid var(--color-orange)' : 'none' }}>
                          <td>{item.date}</td>
                          <td style={{ fontWeight: 600 }}>{item.docNo}</td>
                          <td>
                            <span className={`badge ${item.credit > 0 ? 'badge-warning' : 'badge-success'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {item.debit > 0 ? `₹${item.debit.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-orange-dark)' }}>
                            {item.credit > 0 ? `₹${item.credit.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {item.action === 'print' && (
                              <button 
                                onClick={() => setInvoiceId(item.dbId)} 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                View Bill
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick manual payment section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlusCircle size={18} style={{ color: 'var(--color-orange)' }} /> Record Cash/UPI Payment
                </h3>
                {paymentMsg && (
                  <div className="badge badge-success" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
                    {paymentMsg}
                  </div>
                )}
                
                <form onSubmit={handleAddPayment}>
                  <div className="form-group">
                    <label className="form-label">Payment Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="₹0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-control"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI (GooglePay/PhonePe)</option>
                      <option value="Card">Card</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Remarks / Description</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Outstanding cleared partially"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-highlight" 
                    style={{ width: '100%' }}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  >
                    Post Outstanding Receipt
                  </button>
                </form>
              </div>

              {/* Customer Notes/Metadata */}
              <div className="glass-card">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Customer Profile Notes</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {profile.notes || 'No notes added for this customer. Update profile information to log preferences.'}
                </p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong>GSTIN:</strong> {profile.gst_number || 'N/A'}<br/>
                  <strong>Address:</strong> {profile.address || 'N/A'}
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {/* --- CUSTOMER CREATE / EDIT DIALOG MODAL --- */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="glass-card animate-slide" style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 800 }}>
              {editId ? 'Modify Customer Profile' : 'Register New Customer'}
            </h3>
            
            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label className="form-label">Customer / Shop Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Raj Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Place / Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ahmedabad"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 24GSTXXXXX"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Billing Address</label>
                <textarea
                  className="form-control"
                  placeholder="Enter detailed address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Profile Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Regular wholesaler, gives prompt payments"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editId ? 'Save Updates' : 'Add Customer Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
