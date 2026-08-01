import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, ArrowLeft, TrendingUp, TrendingDown,
  Wallet, Printer, Download, Filter, Edit2, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
  FileText, RefreshCw, X
} from 'lucide-react';

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
const PAGE_SIZE = 15;

export default function Ledger({ token, API_URL, user }) {
  const [view, setView] = useState('list'); // 'list' | 'account'
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Ledger state
  const [ledgerData, setLedgerData] = useState({ entries: [], summary: {}, customer: null });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);

  // Add entry modal
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    type: 'DEBIT', amount: '', payment_method: 'Cash', remark: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    if (selectedCustomer) fetchLedger();
  }, [selectedCustomer, filterType, filterStart, filterEnd, filterSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customers?search=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load customers.'); }
    finally { setLoading(false); }
  };

  const fetchLedger = async () => {
    if (!selectedCustomer) return;
    setLedgerLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType)   params.append('type', filterType);
      if (filterStart)  params.append('startDate', filterStart);
      if (filterEnd)    params.append('endDate', filterEnd);
      if (filterSearch) params.append('search', filterSearch);

      const res = await fetch(
        `${API_URL}/api/ledger/customer/${selectedCustomer.id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to load ledger.');
      const data = await res.json();
      setLedgerData(data);
      setPage(1);
    } catch (err) { setError(err.message); }
    finally { setLedgerLoading(false); }
  };

  const openCustomer = (cust) => {
    setSelectedCustomer(cust);
    setFilterType(''); setFilterStart(''); setFilterEnd(''); setFilterSearch('');
    setView('account');
    setSuccessMsg('');
    setError('');
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditEntry(null);
    setForm({ entry_date: new Date().toISOString().split('T')[0], type: 'DEBIT', amount: '', payment_method: 'Cash', remark: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (entry) => {
    if (entry.source !== 'MANUAL') return;
    setEditEntry(entry);
    setForm({
      entry_date: entry.date, type: entry.type, amount: entry.amount,
      payment_method: entry.payment_method || 'Cash', remark: entry.remark || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError('Enter a valid amount.'); return; }
    if (!form.entry_date) { setFormError('Date is required.'); return; }
    setFormLoading(true);
    try {
      let res;
      if (editEntry) {
        res = await fetch(`${API_URL}/api/ledger/${editEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, amount: parseFloat(form.amount) })
        });
      } else {
        res = await fetch(`${API_URL}/api/ledger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ customer_id: selectedCustomer.id, ...form, amount: parseFloat(form.amount) })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry.');
      setShowModal(false);
      setSuccessMsg(editEntry ? 'Entry updated.' : 'Entry saved successfully!');
      fetchLedger();
      fetchCustomers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (entry) => {
    if (entry.source !== 'MANUAL') return;
    if (!window.confirm('Delete this entry? The customer balance will be reversed.')) return;
    try {
      const res = await fetch(`${API_URL}/api/ledger/${entry.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Entry deleted and balance adjusted.');
      fetchLedger(); fetchCustomers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { setError(err.message); }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!ledgerData.entries?.length) return;
    const cust = ledgerData.customer;
    const rows = [
      ['Date', 'Type', 'Amount', 'Payment Method', 'Remark', 'Added By', 'Source', 'Running Balance'],
      ...ledgerData.entries.map(e => [
        e.date, e.type, e.amount, e.payment_method || '', (e.remark || '').replace(/,/g, ';'),
        e.added_by || '', e.source, e.running_balance
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cust?.name || 'ledger'}_account_statement.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Pagination ─────────────────────────────────────────────────────────────
  const entries = ledgerData.entries || [];
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pagedEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = ledgerData.summary || {};

  // ─── CUSTOMER LIST VIEW ────────────────────────────────────────────────────
  if (view === 'list') {
    const filtered = customers.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.mobile || '').includes(searchQuery) ||
      (c.place || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="animate-fade">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Customer Ledger</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Full account history — debits, credits, and running balances for every customer
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search customers by name, mobile, or place..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
            />
          </div>
        </div>

        {/* Customer Cards */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading...</p>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Place</th>
                  <th>Total Purchases</th>
                  <th>Outstanding Balance</th>
                  <th>Last Transaction</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No customers found.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
                      {c.gst_number && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GST: {c.gst_number}</div>}
                    </td>
                    <td>{c.mobile}</td>
                    <td>{c.place || '—'}</td>
                    <td>₹{(c.total_purchases || 0).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${c.outstanding_balance > 0 ? 'badge-danger' : 'badge-success'}`}
                        style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
                        ₹{(c.outstanding_balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.last_purchase_date || '—'}
                    </td>
                    <td>
                      <button onClick={() => openCustomer(c)} className="btn btn-primary"
                        style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
                        Open Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── ACCOUNT / LEDGER VIEW ─────────────────────────────────────────────────
  const cust = ledgerData.customer || selectedCustomer;

  return (
    <div className="animate-fade">
      {/* Print styles (hidden in screen) */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header Row */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => { setView('list'); setSelectedCustomer(null); }} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} /> All Customers
          </button>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{cust?.name}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              📞 {cust?.mobile} {cust?.place ? `• ${cust.place}` : ''} {cust?.gst_number ? `• GST: ${cust.gst_number}` : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} /> Add Entry
          </button>
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Success / Error */}
      {successMsg && (
        <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '8px', fontSize: '0.9rem' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Account Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Debit', value: `₹${(summary.totalDebit || 0).toFixed(2)}`, color: '#D32F2F', bg: 'rgba(211,47,47,0.08)', icon: TrendingDown },
          { label: 'Total Credit', value: `₹${(summary.totalCredit || 0).toFixed(2)}`, color: 'var(--color-green)', bg: 'rgba(46,125,50,0.08)', icon: TrendingUp },
          { label: 'Outstanding Balance', value: `₹${(summary.balance || 0).toFixed(2)}`, color: summary.balance > 0 ? '#E65100' : 'var(--color-green)', bg: summary.balance > 0 ? 'rgba(230,81,0,0.08)' : 'rgba(46,125,50,0.08)', icon: Wallet },
          { label: 'Total Entries', value: summary.entryCount || 0, color: 'var(--color-info)', bg: 'rgba(2,136,209,0.08)', icon: FileText },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} style={{ color: card.color }} />
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: card.color }}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass-card no-print" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input type="date" className="form-control" style={{ maxWidth: '150px' }} value={filterStart}
            onChange={e => setFilterStart(e.target.value)} placeholder="From date" />
          <input type="date" className="form-control" style={{ maxWidth: '150px' }} value={filterEnd}
            onChange={e => setFilterEnd(e.target.value)} placeholder="To date" />
          <select className="form-control" style={{ maxWidth: '140px' }} value={filterType}
            onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="DEBIT">Debit Only</option>
            <option value="CREDIT">Credit Only</option>
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px' }} placeholder="Search remarks..."
              value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          </div>
          <button onClick={() => { setFilterType(''); setFilterStart(''); setFilterEnd(''); setFilterSearch(''); }}
            className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Print header (only visible when printing) */}
        <div className="print-only" style={{ padding: '1.5rem 1.5rem 0', borderBottom: '2px solid #2E7D32', marginBottom: '1rem' }}>
          <h2 style={{ color: '#2E7D32', fontWeight: 900, fontSize: '1.4rem' }}>FLASHKART — Customer Account Statement</h2>
          <p style={{ fontSize: '0.85rem' }}><strong>Customer:</strong> {cust?.name} | <strong>Mobile:</strong> {cust?.mobile} | <strong>Printed:</strong> {new Date().toLocaleDateString('en-IN')}</p>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <span>Total Debit: ₹{(summary.totalDebit || 0).toFixed(2)}</span>
            <span>Total Credit: ₹{(summary.totalCredit || 0).toFixed(2)}</span>
            <span><strong>Outstanding: ₹{(summary.balance || 0).toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          {ledgerLoading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading ledger...</p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '90px' }}>Date</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                  <th>Payment Method</th>
                  <th>Remark / Details</th>
                  <th>Added By</th>
                  <th style={{ textAlign: 'right' }}>Running Balance</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No transactions found. Click <strong>"Add Entry"</strong> to record the first transaction.
                    </td>
                  </tr>
                ) : pagedEntries.map((entry, idx) => (
                  <tr key={`${entry.source}-${entry.id}-${idx}`}>
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{entry.date}</td>
                    <td>
                      <span className={`badge ${entry.type === 'DEBIT' ? 'badge-danger' : 'badge-success'}`}
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {entry.type === 'DEBIT' ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                        {entry.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: entry.type === 'DEBIT' ? '#D32F2F' : 'transparent', fontSize: '0.9rem' }}>
                      {entry.type === 'DEBIT' ? `₹${parseFloat(entry.amount).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: entry.type === 'CREDIT' ? 'var(--color-green)' : 'transparent', fontSize: '0.9rem' }}>
                      {entry.type === 'CREDIT' ? `₹${parseFloat(entry.amount).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{entry.payment_method || '—'}</td>
                    <td style={{ fontSize: '0.82rem', maxWidth: '220px' }}>
                      <div style={{ fontWeight: entry.source === 'BILLING' ? 700 : 400 }}>{entry.remark || '—'}</div>
                      {entry.source !== 'MANUAL' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {entry.source === 'BILLING' ? '🧾 Billing Invoice' : '💰 Payment Record'}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {entry.added_by_username || entry.added_by || 'System'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: entry.running_balance > 0 ? '#E65100' : 'var(--color-green)' }}>
                      ₹{(entry.running_balance || 0).toFixed(2)}
                    </td>
                    <td className="no-print">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {entry.source === 'MANUAL' ? (
                          <>
                            <button onClick={() => openEditModal(entry)}
                              className="btn btn-secondary" style={{ padding: '4px 8px' }}
                              title="Edit Entry">
                              <Edit2 size={13} />
                            </button>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDelete(entry)}
                                className="btn btn-secondary" style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                                title="Delete Entry">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>Auto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Balance footer row */}
              {pagedEntries.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--color-green-light)' }}>
                    <td colSpan={2} style={{ padding: '10px 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-green-dark)' }}>
                      Page Totals:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#D32F2F', padding: '10px 1rem' }}>
                      ₹{pagedEntries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-green)', padding: '10px 1rem' }}>
                      ₹{pagedEntries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(2)}
                    </td>
                    <td colSpan={3}></td>
                    <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem', padding: '10px 1rem', color: summary.balance > 0 ? '#E65100' : 'var(--color-green)' }}>
                      Balance: ₹{(summary.balance || 0).toFixed(2)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} — {entries.length} entries total
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT ENTRY MODAL ────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div className="glass-card animate-slide" style={{ width: '100%', maxWidth: '520px', padding: '2rem', backgroundColor: 'var(--bg-card)', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                {editEntry ? '✏️ Edit Ledger Entry' : '➕ Add New Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '6px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '0.5rem', padding: '8px 12px', backgroundColor: 'var(--color-green-light)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-green-dark)' }}>
              Customer: {selectedCustomer?.name} | Current Balance: ₹{(summary.balance || 0).toFixed(2)}
            </div>

            {formError && (
              <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', justifyContent: 'center', borderRadius: '6px' }}>
                {formError}
              </div>
            )}

            {/* Transaction Type Selector — big buttons */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Transaction Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {['DEBIT', 'CREDIT'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{
                      padding: '14px', borderRadius: '10px', border: '2px solid',
                      borderColor: form.type === t ? (t === 'DEBIT' ? '#D32F2F' : '#2E7D32') : 'var(--border-light)',
                      backgroundColor: form.type === t ? (t === 'DEBIT' ? 'rgba(211,47,47,0.08)' : 'rgba(46,125,50,0.08)') : 'transparent',
                      color: form.type === t ? (t === 'DEBIT' ? '#D32F2F' : '#2E7D32') : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                    }}>
                    {t === 'DEBIT' ? <TrendingDown size={22} /> : <TrendingUp size={22} />}
                    {t === 'DEBIT' ? 'DEBIT' : 'CREDIT'}
                    <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>
                      {t === 'DEBIT' ? 'Goods given / Sale' : 'Payment received'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Date *</label>
                <input type="date" className="form-control" value={form.entry_date}
                  onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input type="number" step="0.01" min="0.01" className="form-control"
                  placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Payment Method</label>
              <select className="form-control" value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Remark / Description</label>
              <input type="text" className="form-control"
                placeholder={form.type === 'DEBIT' ? 'e.g. Supplied Tomatoes & Onions' : 'e.g. Cash received by hand'}
                value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }} disabled={formLoading}>
                {formLoading ? 'Saving...' : (editEntry ? 'Update Entry' : `Save ${form.type} Entry`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
