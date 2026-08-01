import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Plus, BookOpen, BarChart3, ArrowLeft,
  TrendingUp, Wallet, Users, Calendar, Search, Filter,
  Edit2, Trash2, Download, Printer, RefreshCw, CheckCircle,
  AlertCircle, X, Upload, Camera, IndianRupee, ShoppingCart,
  Truck, Zap, UserPlus, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Transport', 'Diesel', 'Labour', 'Rent', 'Electricity', 'Packing', 'Other'];
const METHODS    = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

const CAT_ICONS = {
  Transport: '🚛', Diesel: '⛽', Labour: '👷',
  Rent: '🏠', Electricity: '⚡', Packing: '📦', Other: '🧾'
};

const CAT_COLORS = {
  Transport: '#1565C0', Diesel: '#BF360C', Labour: '#6A1B9A',
  Rent: '#E65100', Electricity: '#F9A825', Packing: '#2E7D32', Other: '#455A64'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split('T')[0];
const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

// ─── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ partner, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: partner.color || '#2E7D32',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800,
      fontSize: size < 36 ? '11px' : '14px',
      flexShrink: 0, boxShadow: `0 2px 8px ${partner.color}44`
    }}>
      {partner.avatar_initials || partner.name?.slice(0,2).toUpperCase()}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Expenses({ token, API_URL, user }) {
  const [view, setView] = useState('dashboard'); // dashboard | add | partner | reports | manage
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [partnerData, setPartnerData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Add expense form
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [formData, setFormData] = useState({
    partner_id: '', expense_date: today(), amount: '', category: 'Transport',
    market_name: '', vendor_name: '', payment_method: 'Cash', remark: '', bill_photo: ''
  });
  const [formError, setFormError]   = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [billPreview, setBillPreview] = useState('');

  // Ledger filters
  const [ledgerFilters, setLedgerFilters] = useState({ startDate: '', endDate: '', category: '', search: '' });

  // Reports
  const [reportType, setReportType] = useState('daily'); // daily | monthly | category | market | partner
  const [reportDate, setReportDate] = useState(today());
  const [reportMonth, setReportMonth] = useState(curMonth());
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportData, setReportData] = useState(null);

  // Manage Partners
  const [partnerForm, setPartnerForm] = useState({ name: '', mobile: '', color: '#2E7D32' });
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editPartnerId, setEditPartnerId] = useState(null);

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/partners`, { headers: authHeader });
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [token]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/expenses/reports/dashboard`, { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setDashData(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  const fetchPartnerLedger = useCallback(async (partnerId, filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate)   params.append('endDate',   filters.endDate);
      if (filters.category)  params.append('category',  filters.category);
      if (filters.search)    params.append('search',    filters.search);
      const res = await fetch(`${API_URL}/api/expenses/reports/partner/${partnerId}?${params}`, { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load partner ledger');
      const data = await res.json();
      setPartnerData(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  const fetchReport = async () => {
    setLoading(true); setError('');
    try {
      let url = '';
      if (reportType === 'daily') {
        url = `${API_URL}/api/expenses/reports/daily?date=${reportDate}`;
      } else if (reportType === 'monthly') {
        const [y, m] = reportMonth.split('-');
        url = `${API_URL}/api/expenses/reports/monthly?year=${y}&month=${m}`;
      } else if (reportType === 'category') {
        url = `${API_URL}/api/expenses/reports/category?startDate=${reportStart}&endDate=${reportEnd}`;
      } else if (reportType === 'market') {
        url = `${API_URL}/api/expenses/reports/market?startDate=${reportStart}&endDate=${reportEnd}`;
      }
      if (!url) return;
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load report');
      const data = await res.json();
      setReportData(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPartners(); }, [fetchPartners]);
  useEffect(() => { if (view === 'dashboard') fetchDashboard(); }, [view, fetchDashboard]);
  useEffect(() => {
    if (view === 'partner' && selectedPartner) fetchPartnerLedger(selectedPartner.id, ledgerFilters);
  }, [view, selectedPartner, ledgerFilters]);
  useEffect(() => { if (view === 'reports') fetchReport(); }, [reportType, reportDate, reportMonth]);

  // ── Form handlers ────────────────────────────────────────────────────────────
  const openAdd = (expense = null) => {
    setEditExpense(expense);
    setFormData(expense ? {
      partner_id: expense.partner_id, expense_date: expense.expense_date,
      amount: expense.amount, category: expense.category,
      market_name: expense.market_name || '', vendor_name: expense.vendor_name || '',
      payment_method: expense.payment_method || 'Cash', remark: expense.remark || '', bill_photo: expense.bill_photo || ''
    } : { partner_id: '', expense_date: today(), amount: '', category: 'Vegetables', market_name: '', vendor_name: '', payment_method: 'Cash', remark: '', bill_photo: '' });
    setBillPreview(expense?.bill_photo ? `${API_URL}${expense.bill_photo}` : '');
    setFormError('');
    setShowForm(true);
  };

  const handleBillUpload = async (file) => {
    if (!file) return;
    setUploadingBill(true);
    try {
      const fd = new FormData();
      fd.append('bill', file);
      const res = await fetch(`${API_URL}/api/expenses/upload-bill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFormData(f => ({ ...f, bill_photo: data.path }));
      setBillPreview(`${API_URL}${data.path}`);
    } catch (err) { setFormError('Bill upload failed: ' + err.message); }
    finally { setUploadingBill(false); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!formData.partner_id) { setFormError('Please select a partner.'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { setFormError('Enter a valid amount.'); return; }
    if (!formData.expense_date) { setFormError('Date is required.'); return; }
    setFormLoading(true);
    try {
      const method = editExpense ? 'PUT' : 'POST';
      const url = editExpense ? `${API_URL}/api/expenses/${editExpense.id}` : `${API_URL}/api/expenses`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setShowForm(false);
      setSuccess(editExpense ? 'Expense updated!' : 'Expense recorded!');
      fetchPartners();
      if (view === 'dashboard') fetchDashboard();
      if (view === 'partner' && selectedPartner) fetchPartnerLedger(selectedPartner.id, ledgerFilters);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense? Partner total will be reversed.')) return;
    try {
      const res = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'DELETE', headers: authHeader
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Expense deleted.');
      fetchPartners();
      if (view === 'dashboard') fetchDashboard();
      if (view === 'partner' && selectedPartner) fetchPartnerLedger(selectedPartner.id, ledgerFilters);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleSavePartner = async () => {
    if (!partnerForm.name) return;
    try {
      const method = editPartnerId ? 'PUT' : 'POST';
      const url = editPartnerId ? `${API_URL}/api/expenses/partners/${editPartnerId}` : `${API_URL}/api/expenses/partners`;
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(partnerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(editPartnerId ? 'Partner updated!' : 'Partner added!');
      setShowPartnerForm(false);
      setEditPartnerId(null);
      setPartnerForm({ name: '', mobile: '', color: '#2E7D32' });
      fetchPartners();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) { setError(err.message); }
  };

  const exportCSV = (rows, filename, headers) => {
    if (!rows?.length) return;
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ─── NAV TABS ────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports',   label: 'Reports',   icon: BarChart3 },
    { id: 'manage',    label: 'Partners',  icon: Users },
  ];

  return (
    <div className="animate-fade">
      {/* Global success/error banners */}
      {success && <div className="badge badge-success" style={{ width:'100%', padding:'0.75rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'8px', fontSize:'0.88rem' }}><CheckCircle size={15}/> {success}</div>}
      {error   && <div className="badge badge-danger"  style={{ width:'100%', padding:'0.75rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'8px'             }}><AlertCircle size={15}/> {error}</div>}

      {/* Partner Ledger View */}
      {view === 'partner' && selectedPartner && (
        <PartnerLedgerView
          partner={selectedPartner}
          data={partnerData}
          loading={loading}
          filters={ledgerFilters}
          setFilters={setLedgerFilters}
          onBack={() => { setView('dashboard'); setSelectedPartner(null); }}
          onAdd={() => { setFormData(f => ({...f, partner_id: selectedPartner.id})); openAdd(); }}
          onEdit={openAdd}
          onDelete={handleDelete}
          user={user}
          API_URL={API_URL}
          fmt={fmt}
        />
      )}

      {view !== 'partner' && (
        <>
          {/* Page Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 style={{ fontSize:'2rem', fontWeight:800 }}>Partner Expenses</h1>
              <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>Shared business wallet — track every market purchase by every partner</p>
            </div>
            <button onClick={() => openAdd()} className="btn btn-primary">
              <Plus size={16}/> Add Expense
            </button>
          </div>

          {/* Nav Tabs */}
          <div style={{ display:'flex', gap:'4px', border:'1px solid var(--border-light)', borderRadius:'10px', padding:'4px', marginBottom:'1.5rem', width:'fit-content' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setView(tab.id)}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'7px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.85rem', transition:'all 0.2s',
                    backgroundColor: view === tab.id ? 'var(--color-green)' : 'transparent',
                    color: view === tab.id ? '#fff' : 'var(--text-muted)' }}>
                  <Icon size={15}/> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── DASHBOARD VIEW ─────────────────────────────────────── */}
          {view === 'dashboard' && <DashboardView data={dashData} loading={loading} partners={partners} onOpenPartner={(p) => { setSelectedPartner(p); setLedgerFilters({startDate:'',endDate:'',category:'',search:''}); setView('partner'); }} fmt={fmt} />}

          {/* ── REPORTS VIEW ───────────────────────────────────────── */}
          {view === 'reports' && (
            <ReportsView
              reportType={reportType} setReportType={setReportType}
              reportDate={reportDate} setReportDate={setReportDate}
              reportMonth={reportMonth} setReportMonth={setReportMonth}
              reportStart={reportStart} setReportStart={setReportStart}
              reportEnd={reportEnd} setReportEnd={setReportEnd}
              reportData={reportData} loading={loading}
              onFetch={fetchReport}
              fmt={fmt} exportCSV={exportCSV}
            />
          )}

          {/* ── MANAGE PARTNERS VIEW ───────────────────────────────── */}
          {view === 'manage' && (
            <ManagePartnersView
              partners={partners}
              user={user}
              showForm={showPartnerForm}
              setShowForm={(val) => { setShowPartnerForm(val); if(!val) { setEditPartnerId(null); setPartnerForm({ name: '', mobile: '', color: '#2E7D32' }); } }}
              partnerForm={partnerForm}
              setPartnerForm={setPartnerForm}
              editPartnerId={editPartnerId}
              onSave={handleSavePartner}
              onEdit={(p) => {
                setPartnerForm({ name: p.name, mobile: p.mobile || '', color: p.color || '#2E7D32' });
                setEditPartnerId(p.id);
                setShowPartnerForm(true);
              }}
              onDeactivate={async (id) => {
                if (!window.confirm('Deactivate this partner?')) return;
                try {
                  await fetch(`${API_URL}/api/expenses/partners/${id}`, { method:'DELETE', headers: authHeader });
                  setSuccess('Partner deactivated.'); fetchPartners(); setTimeout(()=>setSuccess(''),2000);
                } catch {}
              }}
            />
          )}
        </>
      )}

      {/* ── ADD / EDIT EXPENSE MODAL ────────────────────────────── */}
      {showForm && (
        <ExpenseModal
          form={formData} setForm={setFormData}
          editExpense={editExpense}
          partners={partners}
          categories={CATEGORIES} methods={METHODS} catIcons={CAT_ICONS}
          formError={formError} formLoading={formLoading}
          uploadingBill={uploadingBill} billPreview={billPreview}
          onBillUpload={handleBillUpload}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ data, loading, partners, onOpenPartner, fmt }) {
  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Loading dashboard...</div>;
  if (!data) return null;

  const { todayTotal, todayCount, monthTotal, perPartner, categories, recent, trend } = data;

  // SVG horizontal bar chart for partner contributions
  const maxContrib = Math.max(...(perPartner || []).map(p => parseFloat(p.total_contribution)), 1);

  return (
    <div>
      {/* Top Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:"Today's Expenses", val: fmt(todayTotal), sub: `${todayCount} transactions`, color:'var(--color-green)', bg:'var(--color-green-light)', icon: IndianRupee },
          { label:"This Month", val: fmt(monthTotal), sub:'All partners', color:'var(--color-orange)', bg:'var(--color-orange-light)', icon: Calendar },
          { label:"Active Partners", val: perPartner?.length || 0, sub:'Sharing expenses', color:'var(--color-info)', bg:'rgba(2,136,209,0.1)', icon: Users },
          { label:"Categories", val: categories?.length || 0, sub:'Types tracked', color:'#6A1B9A', bg:'rgba(106,27,154,0.08)', icon: BarChart3 }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card" style={{ padding:'1.1rem', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:44, height:44, borderRadius:12, backgroundColor:card.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <div>
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{card.label}</p>
                <p style={{ fontSize:'1.2rem', fontWeight:900, color: card.color, lineHeight:1.2 }}>{card.val}</p>
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partner Contribution Cards Grid */}
      <h3 style={{ fontWeight:800, marginBottom:'1rem', fontSize:'1.05rem' }}>
        💼 Partner Contributions
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'1.75rem' }}>
        {(perPartner || []).map((p) => (
          <div key={p.id} className="glass-card" onClick={() => onOpenPartner(p)}
            style={{ padding:'1.25rem', cursor:'pointer', borderLeft:`5px solid ${p.color}`,
              transition:'transform 0.18s, box-shadow 0.18s', position:'relative', overflow:'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 10px 30px ${p.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <Avatar partner={p} size={44} />
              <div>
                <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{p.name}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{p.tx_count} transactions</div>
              </div>
            </div>
            <div style={{ fontSize:'1.4rem', fontWeight:900, color: p.color, marginBottom:'6px' }}>
              {fmt(p.total_contribution)}
            </div>
            {/* Mini bar showing this month vs total */}
            <div style={{ display:'flex', gap:'12px', fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'8px' }}>
              <span>Today: <strong style={{ color: p.color }}>{fmt(p.today_amount)}</strong></span>
              <span>Month: <strong style={{ color: p.color }}>{fmt(p.month_amount)}</strong></span>
            </div>
            {/* Progress bar */}
            <div style={{ height:5, backgroundColor:'var(--border-light)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', backgroundColor: p.color, borderRadius:3, width: `${Math.min((parseFloat(p.total_contribution)/maxContrib)*100, 100)}%`, transition:'width 0.6s ease' }} />
            </div>
            <div style={{ position:'absolute', bottom:10, right:12, fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>
              View Ledger →
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* Category Breakdown */}
        <div className="glass-card">
          <h4 style={{ fontWeight:800, marginBottom:'1rem', fontSize:'0.95rem' }}>📊 This Month by Category</h4>
          {(categories || []).length === 0 ? (
            <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'2rem 0', fontSize:'0.85rem' }}>No data yet.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {(categories || []).map(cat => {
                const maxCat = Math.max(...(categories||[]).map(c=>parseFloat(c.total)));
                const pct = (parseFloat(cat.total)/maxCat)*100;
                return (
                  <div key={cat.category}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', marginBottom:'3px' }}>
                      <span style={{ fontWeight:600 }}>{CAT_ICONS[cat.category]} {cat.category} ({cat.cnt})</span>
                      <span style={{ fontWeight:800, color: CAT_COLORS[cat.category] || '#333' }}>{fmt(cat.total)}</span>
                    </div>
                    <div style={{ height:7, backgroundColor:'var(--border-light)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', backgroundColor: CAT_COLORS[cat.category] || '#666', borderRadius:4, width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="glass-card">
          <h4 style={{ fontWeight:800, marginBottom:'1rem', fontSize:'0.95rem' }}>📈 Monthly Trend</h4>
          {!(trend||[]).length ? (
            <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'2rem 0', fontSize:'0.85rem' }}>No data yet.</p>
          ) : (
            <div>
              {(trend||[]).map(t => {
                const maxT = Math.max(...(trend||[]).map(x=>parseFloat(x.total)),1);
                const pct = (parseFloat(t.total)/maxT)*100;
                return (
                  <div key={t.month} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                    <span style={{ fontSize:'0.78rem', width:65, color:'var(--text-muted)', fontWeight:600 }}>{t.month}</span>
                    <div style={{ flex:1, height:8, backgroundColor:'var(--border-light)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'linear-gradient(90deg, #2E7D32, #66BB6A)', borderRadius:4, width:`${pct}%` }} />
                    </div>
                    <span style={{ fontSize:'0.78rem', fontWeight:800, minWidth:70, textAlign:'right', color:'var(--color-green-dark)' }}>{fmt(t.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border-light)', fontWeight:800, fontSize:'0.95rem' }}>
          🕐 Recent Transactions
        </div>
        <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor / Market</th>
                <th>Remark</th>
                <th>Payment</th>
                <th style={{ textAlign:'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {!(recent||[]).length ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No transactions yet. Click "Add Expense" to record the first one.</td></tr>
              ) : (recent||[]).map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <Avatar partner={{ color: e.partner_color, avatar_initials: e.avatar_initials, name: e.partner_name }} size={30} />
                      <span style={{ fontWeight:700, fontSize:'0.85rem' }}>{e.partner_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:'0.8rem' }}>{e.expense_date}</td>
                  <td>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, padding:'3px 8px', borderRadius:20, backgroundColor: (CAT_COLORS[e.category]||'#555')+'18', color: CAT_COLORS[e.category]||'#555' }}>
                      {CAT_ICONS[e.category]} {e.category}
                    </span>
                  </td>
                  <td style={{ fontSize:'0.8rem' }}>{[e.vendor_name, e.market_name].filter(Boolean).join(' / ') || '—'}</td>
                  <td style={{ fontSize:'0.8rem', maxWidth:180 }}>{e.remark || '—'}</td>
                  <td style={{ fontSize:'0.78rem' }}>{e.payment_method}</td>
                  <td style={{ textAlign:'right', fontWeight:800, color:'var(--color-green-dark)' }}>{fmt(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── PARTNER LEDGER VIEW ──────────────────────────────────────────────────────
function PartnerLedgerView({ partner, data, loading, filters, setFilters, onBack, onAdd, onEdit, onDelete, user, API_URL, fmt }) {
  if (loading && !data) return <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Loading...</div>;

  const stats  = data?.stats  || {};
  const expenses = data?.expenses || [];
  const catSummary = data?.catSummary || [];

  const exportThisLedger = () => {
    const rows = expenses.map(e => ({
      Date: e.expense_date, Amount: e.amount, Category: e.category,
      Vendor: e.vendor_name||'', Market: e.market_name||'', Payment: e.payment_method,
      Remark: e.remark||''
    }));
    const csv = ['Date,Amount,Category,Vendor,Market,Payment,Remark',
      ...rows.map(r => Object.values(r).map(v=>`"${v}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `${partner.name}_expenses.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding:'8px 12px' }}>
            <ArrowLeft size={16}/> Partners
          </button>
          <Avatar partner={partner} size={48} />
          <div>
            <h2 style={{ fontWeight:900, fontSize:'1.4rem' }}>{partner.name}</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>
              {stats.total_tx || 0} total transactions • Partner Expense Ledger
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <button onClick={onAdd} className="btn btn-primary"><Plus size={15}/> Add Expense</button>
          <button onClick={exportThisLedger} className="btn btn-secondary"><Download size={15}/> Export CSV</button>
          <button onClick={() => window.print()} className="btn btn-secondary"><Printer size={15}/> Print</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Contribution', val: fmt(stats.total_all), color: partner.color },
          { label:"Today's Spending",   val: fmt(stats.today),     color:'#E65100' },
          { label:'This Month',         val: fmt(stats.this_month), color:'var(--color-info)' },
          { label:'This Year',          val: fmt(stats.this_year),  color:'#6A1B9A' },
        ].map((card, i) => (
          <div key={i} className="glass-card" style={{ padding:'1rem', borderTop:`4px solid ${card.color}` }}>
            <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>{card.label}</p>
            <p style={{ fontSize:'1.2rem', fontWeight:900, color: card.color, marginTop:4 }}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Category mini summary */}
      {catSummary.length > 0 && (
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {catSummary.map(c => (
            <div key={c.category} style={{ padding:'5px 12px', borderRadius:20, backgroundColor: (CAT_COLORS[c.category]||'#555')+'15', border:`1px solid ${CAT_COLORS[c.category]||'#555'}33`, fontSize:'0.78rem', fontWeight:700, color: CAT_COLORS[c.category]||'#555' }}>
              {CAT_ICONS[c.category]} {c.category} — {fmt(c.total)} ({c.cnt})
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding:'1rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <Filter size={15} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          <input type="date" className="form-control" style={{ maxWidth:150 }} value={filters.startDate}
            onChange={e => setFilters(f=>({...f, startDate:e.target.value}))} />
          <input type="date" className="form-control" style={{ maxWidth:150 }} value={filters.endDate}
            onChange={e => setFilters(f=>({...f, endDate:e.target.value}))} />
          <select className="form-control" style={{ maxWidth:140 }} value={filters.category}
            onChange={e => setFilters(f=>({...f, category:e.target.value}))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ position:'relative', flex:1, minWidth:180 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:11, color:'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search vendor, remark..."
              value={filters.search} onChange={e => setFilters(f=>({...f, search:e.target.value}))} />
          </div>
          <button onClick={() => setFilters({startDate:'',endDate:'',category:'',search:''})}
            className="btn btn-secondary" style={{ padding:'8px 12px', fontSize:'0.8rem' }}>
            <RefreshCw size={14}/> Reset
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor / Market</th>
                <th>Payment</th>
                <th>Remark</th>
                <th>Bill</th>
                <th style={{ textAlign:'right' }}>Amount</th>
                {user?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No expenses found for the selected filters.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight:600, fontSize:'0.82rem' }}>{e.expense_date}</td>
                  <td>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, padding:'3px 8px', borderRadius:20,
                      backgroundColor:(CAT_COLORS[e.category]||'#555')+'18', color: CAT_COLORS[e.category]||'#555' }}>
                      {CAT_ICONS[e.category]} {e.category}
                    </span>
                  </td>
                  <td style={{ fontSize:'0.82rem' }}>{[e.vendor_name, e.market_name].filter(Boolean).join(' • ') || '—'}</td>
                  <td style={{ fontSize:'0.78rem' }}>{e.payment_method}</td>
                  <td style={{ fontSize:'0.82rem', maxWidth:200 }}>{e.remark || '—'}</td>
                  <td>
                    {e.bill_photo ? (
                      <a href={`${API_URL}${e.bill_photo}`} target="_blank" rel="noreferrer" title="View bill">
                        <Camera size={16} style={{ color:'var(--color-green)' }} />
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign:'right', fontWeight:900, fontSize:'0.92rem', color:'var(--color-green-dark)' }}>
                    {fmt(e.amount)}
                  </td>
                  {user?.role === 'admin' && (
                    <td>
                      <div style={{ display:'flex', gap:'5px' }}>
                        <button onClick={() => onEdit(e)} className="btn btn-secondary" style={{ padding:'4px 8px' }}><Edit2 size={13}/></button>
                        <button onClick={() => onDelete(e.id)} className="btn btn-secondary" style={{ padding:'4px 8px', color:'var(--color-danger)' }}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor:'var(--color-green-light)' }}>
                  <td colSpan={user?.role==='admin'?6:5} style={{ padding:'10px 1rem', fontWeight:700, fontSize:'0.85rem', color:'var(--color-green-dark)' }}>
                    {expenses.length} transactions shown
                  </td>
                  <td style={{ textAlign:'right', fontWeight:900, fontSize:'1rem', padding:'10px 1rem', color:'var(--color-green-dark)' }}>
                    {fmt(expenses.reduce((s,e)=>s+parseFloat(e.amount),0))}
                  </td>
                  {user?.role==='admin' && <td/>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────
function ReportsView({ reportType, setReportType, reportDate, setReportDate, reportMonth, setReportMonth, reportStart, setReportStart, reportEnd, setReportEnd, reportData, loading, onFetch, fmt, exportCSV }) {
  const reportTabs = [
    { id:'daily', label:'Daily' },
    { id:'monthly', label:'Monthly' },
    { id:'category', label:'Category-wise' },
    { id:'market', label:'Market-wise' },
  ];

  return (
    <div>
      {/* Report type tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {reportTabs.map(t => (
          <button key={t.id} onClick={() => setReportType(t.id)}
            className={`btn ${reportType===t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize:'0.85rem', padding:'7px 16px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="glass-card" style={{ padding:'1rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          {reportType === 'daily' && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <label className="form-label" style={{ margin:0, whiteSpace:'nowrap' }}>Date:</label>
              <input type="date" className="form-control" style={{ maxWidth:165 }} value={reportDate}
                onChange={e => setReportDate(e.target.value)} />
            </div>
          )}
          {reportType === 'monthly' && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <label className="form-label" style={{ margin:0, whiteSpace:'nowrap' }}>Month:</label>
              <input type="month" className="form-control" style={{ maxWidth:165 }} value={reportMonth}
                onChange={e => setReportMonth(e.target.value)} />
            </div>
          )}
          {(reportType==='category'||reportType==='market') && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <label className="form-label" style={{ margin:0 }}>From:</label>
                <input type="date" className="form-control" style={{ maxWidth:160 }} value={reportStart}
                  onChange={e => setReportStart(e.target.value)} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <label className="form-label" style={{ margin:0 }}>To:</label>
                <input type="date" className="form-control" style={{ maxWidth:160 }} value={reportEnd}
                  onChange={e => setReportEnd(e.target.value)} />
              </div>
            </>
          )}
          <button onClick={onFetch} className="btn btn-primary" style={{ marginLeft:'auto' }}>
            <RefreshCw size={14}/> Generate
          </button>
        </div>
      </div>

      {loading && <p style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>Generating report...</p>}

      {/* Report Tables */}
      {!loading && reportData && (
        <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
          {/* Daily / Monthly */}
          {(reportType==='daily'||reportType==='monthly') && (() => {
            const rows = reportData.expenses || [];
            const total = reportData.total || 0;
            return (
              <>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:800 }}>
                    {reportType==='daily' ? `📅 Daily Report — ${reportData.date}` : `📅 Monthly Report — ${reportData.year}-${reportData.month}`}
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontWeight:900, color:'var(--color-green-dark)', fontSize:'1.05rem' }}>{fmt(total)}</span>
                    <button onClick={() => exportCSV(rows, `report_${reportType}.csv`, ['expense_date','partner_name','category','vendor_name','market_name','payment_method','amount','remark'])}
                      className="btn btn-secondary" style={{ padding:'6px 12px', fontSize:'0.8rem' }}>
                      <Download size={14}/> CSV
                    </button>
                  </div>
                </div>
                <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
                  <table className="custom-table">
                    <thead><tr><th>Date</th><th>Partner</th><th>Category</th><th>Vendor</th><th>Payment</th><th>Remark</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                    <tbody>
                      {rows.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>No data.</td></tr>
                      : rows.map((e,i) => (
                        <tr key={i}>
                          <td style={{fontSize:'0.82rem'}}>{e.expense_date}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:24,height:24,borderRadius:'50%',backgroundColor:e.partner_color||'#333',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'9px',fontWeight:800}}>
                                {e.avatar_initials}
                              </div>
                              <span style={{fontSize:'0.82rem',fontWeight:700}}>{e.partner_name}</span>
                            </div>
                          </td>
                          <td><span style={{fontSize:'0.78rem',fontWeight:700,padding:'2px 7px',borderRadius:12,backgroundColor:(CAT_COLORS[e.category]||'#555')+'18',color:CAT_COLORS[e.category]||'#555'}}>{CAT_ICONS[e.category]} {e.category}</span></td>
                          <td style={{fontSize:'0.82rem'}}>{[e.vendor_name,e.market_name].filter(Boolean).join(' / ')||'—'}</td>
                          <td style={{fontSize:'0.78rem'}}>{e.payment_method}</td>
                          <td style={{fontSize:'0.82rem'}}>{e.remark||'—'}</td>
                          <td style={{textAlign:'right',fontWeight:800,color:'var(--color-green-dark)'}}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {/* Category-wise */}
          {reportType==='category' && (() => {
            const cats = reportData.categories || [];
            return (
              <>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:800 }}>📊 Category-wise Report</span>
                  <span style={{ fontWeight:900, color:'var(--color-green-dark)' }}>{fmt(reportData.grandTotal)} total</span>
                </div>
                <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
                  <table className="custom-table">
                    <thead><tr><th>Category</th><th>Transactions</th><th style={{textAlign:'right'}}>Total Amount</th><th>% of Total</th></tr></thead>
                    <tbody>
                      {cats.map((c,i) => (
                        <tr key={i}>
                          <td><span style={{fontWeight:700,padding:'3px 8px',borderRadius:12,backgroundColor:(CAT_COLORS[c.category]||'#555')+'18',color:CAT_COLORS[c.category]||'#555'}}>{CAT_ICONS[c.category]} {c.category}</span></td>
                          <td>{c.cnt}</td>
                          <td style={{textAlign:'right',fontWeight:800,color:'var(--color-green-dark)'}}>{fmt(c.total)}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{flex:1,height:8,backgroundColor:'var(--border-light)',borderRadius:4,overflow:'hidden'}}>
                                <div style={{height:'100%',backgroundColor:CAT_COLORS[c.category]||'#555',width:`${(parseFloat(c.total)/reportData.grandTotal)*100}%`}}/>
                              </div>
                              <span style={{fontSize:'0.78rem',fontWeight:700,width:38}}>{((parseFloat(c.total)/reportData.grandTotal)*100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {/* Market-wise */}
          {reportType==='market' && (() => {
            const mkts = Array.isArray(reportData) ? reportData : [];
            const grandTotal = mkts.reduce((s,m)=>s+parseFloat(m.total),0);
            return (
              <>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border-light)', fontWeight:800 }}>
                  🏪 Market & Vendor Report
                </div>
                <div className="table-container" style={{ margin:0, border:'none', borderRadius:0 }}>
                  <table className="custom-table">
                    <thead><tr><th>Market</th><th>Vendor</th><th>Transactions</th><th style={{textAlign:'right'}}>Total Amount</th></tr></thead>
                    <tbody>
                      {mkts.length===0 ? <tr><td colSpan={4} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>No data.</td></tr>
                      : mkts.map((m,i)=>(
                        <tr key={i}>
                          <td style={{fontWeight:700}}>{m.market}</td>
                          <td style={{fontSize:'0.82rem'}}>{m.vendor}</td>
                          <td>{m.cnt}</td>
                          <td style={{textAlign:'right',fontWeight:800,color:'var(--color-green-dark)'}}>{fmt(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── MANAGE PARTNERS VIEW ─────────────────────────────────────────────────────
function ManagePartnersView({ partners, user, showForm, setShowForm, partnerForm, setPartnerForm, editPartnerId, onSave, onEdit, onDeactivate }) {
  const PARTNER_COLORS = ['#2E7D32','#E65100','#1565C0','#6A1B9A','#00695C','#BF360C','#0277BD','#558B2F'];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <h3 style={{ fontWeight:800, fontSize:'1.05rem' }}>👥 Business Partners ({partners.length})</h3>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <UserPlus size={15}/> Add Partner
          </button>
        )}
      </div>

      {/* Add Partner Form */}
      {showForm && user?.role === 'admin' && (
        <div className="glass-card" style={{ marginBottom:'1.25rem', borderLeft:'4px solid var(--color-green)' }}>
          <h4 style={{ fontWeight:700, marginBottom:'1rem' }}>{editPartnerId ? '✏️ Edit Partner' : 'New Partner'}</h4>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <div>
              <label className="form-label">Name *</label>
              <input className="form-control" placeholder="Partner name" value={partnerForm.name}
                onChange={e => setPartnerForm(f=>({...f, name:e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Mobile</label>
              <input className="form-control" placeholder="Mobile number" value={partnerForm.mobile}
                onChange={e => setPartnerForm(f=>({...f, mobile:e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Color</label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'4px' }}>
                {PARTNER_COLORS.map(c => (
                  <div key={c} onClick={() => setPartnerForm(f=>({...f, color:c}))}
                    style={{ width:22, height:22, borderRadius:'50%', backgroundColor:c, cursor:'pointer',
                      outline: partnerForm.color===c ? `3px solid ${c}` : 'none', outlineOffset:2 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={onSave} className="btn btn-primary">{editPartnerId ? 'Update Partner' : 'Add Partner'}</button>
          </div>
        </div>
      )}

      {/* Partner Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem' }}>
        {partners.map(p => (
          <div key={p.id} className="glass-card" style={{ padding:'1.25rem', borderLeft:`5px solid ${p.color}`, position: 'relative' }}>
            {user?.role === 'admin' && (
              <button onClick={() => onEdit(p)} className="btn btn-secondary" style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px', color: 'var(--color-orange-dark)' }}>
                <Edit2 size={14} />
              </button>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <Avatar partner={p} size={46} />
              <div style={{ paddingRight: '20px' }}>
                <div style={{ fontWeight:800, fontSize:'1rem' }}>{p.name}</div>
                {p.mobile && <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>📞 {p.mobile}</div>}
              </div>
            </div>
            <div style={{ fontSize:'1.3rem', fontWeight:900, color: p.color, marginBottom:'4px' }}>
              ₹{(p.total_contribution||0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'10px' }}>Total contribution</div>
            {user?.role === 'admin' && (
              <button onClick={() => onDeactivate(p.id)} className="btn btn-secondary"
                style={{ width:'100%', fontSize:'0.78rem', padding:'5px', color:'var(--color-danger)' }}>
                Deactivate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EXPENSE MODAL ─────────────────────────────────────────────────────────────
function ExpenseModal({ form, setForm, editExpense, partners, categories, methods, catIcons, formError, formLoading, uploadingBill, billPreview, onBillUpload, onSave, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.62)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'1rem', overflowY:'auto' }}>
      <div className="glass-card animate-slide" style={{ width:'100%', maxWidth:580, padding:'2rem', backgroundColor:'var(--bg-card)', boxShadow:'0 20px 50px rgba(0,0,0,0.35)', margin:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h3 style={{ fontWeight:800, fontSize:'1.1rem' }}>
            {editExpense ? '✏️ Edit Expense' : '💸 Add Market Expense'}
          </h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding:'6px 8px' }}><X size={16}/></button>
        </div>

        {formError && (
          <div className="badge badge-danger" style={{ width:'100%', padding:'0.65rem', marginBottom:'1rem', justifyContent:'center', borderRadius:'7px', fontSize:'0.85rem' }}>
            <AlertCircle size={14}/> {formError}
          </div>
        )}

        {/* Partner selector */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="form-label">Partner *</label>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {partners.map(p => (
              <button key={p.id} type="button" onClick={() => setForm(f=>({...f, partner_id:p.id}))}
                style={{ display:'flex', alignItems:'center', gap:'7px', padding:'7px 12px', borderRadius:30, border:'2px solid', cursor:'pointer', transition:'all 0.15s', fontWeight:700, fontSize:'0.82rem',
                  borderColor: form.partner_id===p.id ? p.color : 'var(--border-light)',
                  backgroundColor: form.partner_id===p.id ? p.color+'18' : 'transparent',
                  color: form.partner_id===p.id ? p.color : 'var(--text-muted)' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', backgroundColor:p.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'8px', fontWeight:900 }}>
                  {p.avatar_initials}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category selector */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="form-label">Category *</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'6px' }}>
            {categories.map(cat => (
              <button key={cat} type="button" onClick={() => setForm(f=>({...f, category:cat}))}
                style={{ padding:'9px', borderRadius:8, border:'2px solid', cursor:'pointer', fontWeight:700, fontSize:'0.82rem', textAlign:'center', transition:'all 0.15s',
                  borderColor: form.category===cat ? CAT_COLORS[cat]||'#555' : 'var(--border-light)',
                  backgroundColor: form.category===cat ? (CAT_COLORS[cat]||'#555')+'14' : 'transparent',
                  color: form.category===cat ? CAT_COLORS[cat]||'#555' : 'var(--text-muted)' }}>
                {catIcons[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Amount row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
          <div>
            <label className="form-label">Date *</label>
            <input type="date" className="form-control" value={form.expense_date}
              onChange={e => setForm(f=>({...f, expense_date:e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Amount (₹) *</label>
            <div style={{ position:'relative' }}>
              <IndianRupee size={15} style={{ position:'absolute', left:10, top:11, color:'var(--text-muted)' }} />
              <input type="number" min="1" step="0.01" className="form-control" style={{ paddingLeft:30 }}
                placeholder="0.00" value={form.amount} onChange={e => setForm(f=>({...f, amount:e.target.value}))} />
            </div>
          </div>
        </div>

        {/* Vendor + Market row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
          <div>
            <label className="form-label">Vendor Name</label>
            <input className="form-control" placeholder="e.g. Raju Bhai" value={form.vendor_name}
              onChange={e => setForm(f=>({...f, vendor_name:e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Market Name</label>
            <input className="form-control" placeholder="e.g. APMC Market" value={form.market_name}
              onChange={e => setForm(f=>({...f, market_name:e.target.value}))} />
          </div>
        </div>

        {/* Payment method */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="form-label">Payment Method</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {methods.map(m => (
              <button key={m} type="button" onClick={() => setForm(f=>({...f, payment_method:m}))}
                style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontWeight:600, fontSize:'0.78rem',
                  borderColor: form.payment_method===m ? 'var(--color-green)' : 'var(--border-light)',
                  backgroundColor: form.payment_method===m ? 'var(--color-green-light)' : 'transparent',
                  color: form.payment_method===m ? 'var(--color-green-dark)' : 'var(--text-muted)' }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Remark */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="form-label">Remark / Description</label>
          <input className="form-control" placeholder="e.g. Purchased Tomato, Onion & Potato from APMC" value={form.remark}
            onChange={e => setForm(f=>({...f, remark:e.target.value}))} />
        </div>

        {/* Bill photo upload */}
        <div style={{ marginBottom:'1.5rem' }}>
          <label className="form-label">Upload Bill Photo (Optional)</label>
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 16px', borderRadius:'8px', border:'1.5px dashed var(--color-green)', color:'var(--color-green)', fontWeight:600, fontSize:'0.82rem', cursor:'pointer', backgroundColor:'var(--color-green-light)' }}>
              <Camera size={16}/> {uploadingBill ? 'Uploading...' : 'Choose Photo'}
              <input type="file" accept="image/*" style={{ display:'none' }} disabled={uploadingBill}
                onChange={e => e.target.files[0] && onBillUpload(e.target.files[0])} />
            </label>
            {billPreview && (
              <img src={billPreview} alt="Bill" style={{ width:60, height:60, objectFit:'cover', borderRadius:8, border:'2px solid var(--color-green)' }} />
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
          <button onClick={onSave} className="btn btn-primary" style={{ flex:2 }} disabled={formLoading}>
            {formLoading ? 'Saving...' : (editExpense ? 'Update Expense' : '💾 Save Expense')}
          </button>
        </div>
      </div>
    </div>
  );
}
