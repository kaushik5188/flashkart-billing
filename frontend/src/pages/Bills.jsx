import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Filter, Printer, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function Bills({ token, API_URL, onEditBill, onPrintBill }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

      {/* Filters */}
      <div className="glass-card" style={{ padding:'1rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <Filter size={15} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          <input type="date" className="form-control" style={{ maxWidth:150 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="form-control" style={{ maxWidth:150 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:11, color:'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search bill no, customer name..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }} className="btn btn-secondary" style={{ padding:'8px 12px' }}>
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
                <th>Total Weight</th>
                <th>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>Loading bills...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No bills found.</td></tr>
              ) : (
                bills.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>{b.bill_number}</td>
                    <td style={{ fontSize: '0.85rem' }}>{fmtDate(b.invoice_date)}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.customer_place}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{b.total_weight} kg</td>
                    <td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-green-dark)' }}>{fmt(b.grand_total)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => onPrintBill(b)} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                          <Printer size={13} /> Print
                        </button>
                        <button onClick={() => onEditBill(b.id)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--color-orange-dark)' }}>
                          <Edit2 size={13} /> Edit
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
    </div>
  );
}
