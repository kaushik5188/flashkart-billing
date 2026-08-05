import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Filter, Printer, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw, CreditCard, X } from 'lucide-react';

export default function Bills({ token, API_URL, onEditBill, onPrintBill }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Payment Modal States
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, bill: null });
  const [payAmount, setPayAmount] = useState('');
  const [payDiscount, setPayDiscount] = useState('0');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await fetch(`${API_URL}/api/billing?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, search, startDate, endDate]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete Invoice #${invoice.bill_number}?\nThis will revert inventory stock and customer ledger.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/billing/${invoice.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Invoice deleted successfully.');
      fetchBills();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');
    try {
      const res = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bill_id: paymentModal.bill.id,
          amount_received: payAmount,
          discount: payDiscount,
          payment_method: payMethod,
          reference_number: payRef,
          notes: payNotes,
          payment_date: payDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');
      
      setSuccess('Payment collected successfully!');
      setPaymentModal({ isOpen: false, bill: null });
      fetchBills();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const openPaymentModal = async (bill) => {
    setPaymentModal({ isOpen: true, bill, history: [] });
    setPayAmount(bill.remaining_amount);
    setPayDiscount('0');
    setPayMethod('Cash');
    setPayRef('');
    setPayNotes('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayError('');

    try {
      const res = await fetch(`${API_URL}/api/billing/${bill.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentModal(prev => ({ ...prev, history: data.payments || [] }));
      }
    } catch (err) {
      console.error("Failed to load payment history", err);
    }
  };

  // Derived states
  const filteredBills = bills.filter(b => {
    if (statusFilter !== 'All' && b.payment_status !== statusFilter) return false;
    return true;
  });

  const totalBills = bills.length;
  const pendingCount = bills.filter(b => b.payment_status === 'Pending').length;
  const partialCount = bills.filter(b => b.payment_status === 'Partial').length;
  const collectedCount = bills.filter(b => b.payment_status === 'Collected').length;
  const totalOutstanding = bills.reduce((acc, b) => acc + (b.remaining_amount || 0), 0);

  return (
    <div className="animate-fade">
      {success && <div className="badge badge-success" style={{ width:'100%', padding:'0.75rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'8px' }}><CheckCircle size={15}/> {success}</div>}
      {error && <div className="badge badge-danger" style={{ width:'100%', padding:'0.75rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'8px' }}><AlertCircle size={15}/> {error}</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontSize:'2rem', fontWeight:800 }}>All Bills</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>View, edit, and print past invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalBills}</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderBottom: '3px solid var(--color-danger)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>{pendingCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderBottom: '3px solid var(--color-orange)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Partial Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange)' }}>{partialCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderBottom: '3px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Collected Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green)' }}>{collectedCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#FFF5F5' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>Total Outstanding</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(totalOutstanding)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding:'1rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <Filter size={15} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          
          <select className="form-control" style={{ maxWidth: 120 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Collected">Collected</option>
          </select>

          <input type="date" className="form-control" style={{ maxWidth:130 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="form-control" style={{ maxWidth:130 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:11, color:'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search bill no, customer name..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setStatusFilter('All'); }} className="btn btn-secondary" style={{ padding:'8px 12px' }}>
            <RefreshCw size={14}/> Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Bill Total</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>Loading bills...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No bills found.</td></tr>
              ) : (
                filteredBills.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>{b.bill_number}</td>
                    <td style={{ fontSize: '0.85rem' }}>{fmtDate(b.invoice_date)}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.customer_place}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(b.grand_total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>{fmt(b.paid_amount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-orange)', fontWeight: 600 }}>{fmt(b.discount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontWeight: 700 }}>{fmt(b.remaining_amount)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        onClick={() => { if(b.remaining_amount > 0) openPaymentModal(b); }}
                        className={`badge ${b.payment_status === 'Collected' ? 'badge-success' : b.payment_status === 'Partial' ? 'badge-warning' : 'badge-danger'}`}
                        style={{ cursor: b.remaining_amount > 0 ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {b.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => onPrintBill(b)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                          <Printer size={13} />
                        </button>
                        <button onClick={() => onEditBill(b.id)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--color-blue-dark)' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(b)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {paymentModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Collect Payment - #{paymentModal.bill?.bill_number}</h2>
              <button onClick={() => setPaymentModal({ isOpen: false, bill: null })} className="btn-close"><X size={20}/></button>
            </div>
            <div className="modal-body">
              {payError && <div className="badge badge-danger" style={{ width:'100%', padding:'0.75rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'8px' }}><AlertCircle size={15}/> {payError}</div>}
              <form onSubmit={handleCollectPaymentSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bill Amount</label>
                    <input type="text" className="form-control" value={fmt(paymentModal.bill?.grand_total)} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Already Paid</label>
                    <input type="text" className="form-control" value={fmt(paymentModal.bill?.paid_amount)} disabled />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Outstanding Balance</label>
                  <input type="text" className="form-control" value={fmt(paymentModal.bill?.remaining_amount)} disabled style={{ color: 'var(--color-danger)', fontWeight: 'bold' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹)</label>
                    <input type="number" step="0.01" className="form-control" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Given (₹)</label>
                    <input type="number" step="0.01" className="form-control" value={payDiscount} onChange={(e) => setPayDiscount(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-control" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference Number (Optional)</label>
                  <input type="text" className="form-control" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Txn ID / Cheque No" />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input type="text" className="form-control" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Any notes" />
                </div>

                <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setPaymentModal({ isOpen: false, bill: null })} className="btn btn-secondary">Cancel</button>
                  {paymentModal.bill?.remaining_amount > 0 && (
                    <button type="submit" className="btn btn-primary" disabled={payLoading}>
                      {payLoading ? 'Saving...' : 'Save Payment'}
                    </button>
                  )}
                </div>
              </form>

              {paymentModal.history && paymentModal.history.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>Payment History</h4>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>Method</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>Amount</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentModal.history.map(ph => (
                        <tr key={ph.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '6px 0' }}>{fmtDate(ph.payment_date)}</td>
                          <td style={{ padding: '6px 0' }}>{ph.payment_method}</td>
                          <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: 'var(--color-green)' }}>{fmt(ph.amount_received)}</td>
                          <td style={{ textAlign: 'right', padding: '6px 0', color: 'var(--color-orange)' }}>{fmt(ph.discount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
