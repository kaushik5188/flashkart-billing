import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  DollarSign, 
  Users, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  Layers,
  ArrowDown,
  Wallet,
  ShoppingCart,
  PieChart as PieChartIcon,
  X,
  Search,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2E7D32', '#1565C0', '#F9A825', '#E65100', '#6A1B9A', '#BF360C'];

export default function Dashboard({ setView, token, API_URL, setCustomerId }) {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartRange, setChartRange] = useState('month'); // 'month' or 'year'

  
  const [drillDown, setDrillDown] = useState(null);

  const handleCardClick = async (type, title, dateRangeType) => {
    try {
      setDrillDown({ type, title, loading: true, data: null });
      
      let startDate = 'all';
      let endDate = 'all';
      
      if (dateRangeType === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        startDate = todayStr;
        endDate = todayStr;
      } else if (dateRangeType === 'month') {
        const todayStr = new Date().toISOString().split('T')[0];
        startDate = todayStr.substring(0, 7) + '%';
        endDate = startDate; // We handle '%' in the backend
      }
      
      if (type === 'profit' || type === 'monthly_expenses') {
         const [salesRes, purchRes, expRes] = await Promise.all([
           fetch(`${API_URL}/api/reports/dashboard-drilldown?type=sales&startDate=${startDate}&endDate=${endDate}`, { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch(`${API_URL}/api/reports/dashboard-drilldown?type=purchases&startDate=${startDate}&endDate=${endDate}`, { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch(`${API_URL}/api/reports/dashboard-drilldown?type=business_expenses&startDate=${startDate}&endDate=${endDate}`, { headers: { 'Authorization': `Bearer ${token}` } })
         ]);
         const sales = await salesRes.json();
         const purchases = await purchRes.json();
         const expenses = await expRes.json();
         setDrillDown({ type, title, loading: false, data: { sales, purchases, expenses } });
      } else {
        const res = await fetch(`${API_URL}/api/reports/dashboard-drilldown?type=${type}&startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setDrillDown({ type, title, loading: false, data });
      }
    } catch (err) {
      console.error('Drilldown fetch failed', err);
      alert('Failed to load details.');
      setDrillDown(null);
    }
  };
  useEffect(() => {
    fetchDashboardData();
  }, [chartRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const statsRes = await fetch(`${API_URL}/api/reports/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to load dashboard statistics.');
      const statsData = await statsRes.json();
      setStats(statsData);

      const chartRes = await fetch(`${API_URL}/api/reports/charts?range=${chartRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!chartRes.ok) throw new Error('Failed to load chart data.');
      const cData = await chartRes.json();
      setChartData(cData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  if (loading) return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Dashboard...</div>;
  if (error) return <div className="page-container"><div className="alert alert-danger">{error}</div></div>;

  const topProductsData = (stats?.bestSellers || []).map((b, i) => ({
    name: b.product_name,
    value: b.total_revenue
  }));

  const StatCard = ({ title, value, icon: Icon, color, lightColor, onClick }) => (
    <div className="card stat-card" onClick={onClick} style={{ padding: '1.5rem', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{value}</div>
        </div>
        <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: lightColor, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={24} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: color }}></div>
    </div>
  );

  return (
    <div className="page-container animate-fade">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>Enterprise Dashboard</h1>
          <p className="page-subtitle" style={{ fontSize: '1rem' }}>Real-time overview of your business</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '10px', padding: '4px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
          <select style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }} value={chartRange} onChange={e => setChartRange(e.target.value)}>
            <option value="month">Last 30 Days</option>
            <option value="year">This Year (Monthly)</option>
          </select>
        </div>
      </header>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard onClick={() => handleCardClick('sales', "Today's Sales", 'today')} title="Today's Sales" value={fmt(stats?.salesToday)} icon={DollarSign} color="var(--color-green)" lightColor="var(--color-green-light)" />
        <StatCard onClick={() => handleCardClick('payments', "Today's Collections", 'today')} title="Today's Collections" value={fmt(stats?.collectionsToday)} icon={CreditCard} color="#0288D1" lightColor="#E1F5FE" />
        <StatCard onClick={() => handleCardClick('purchases', "Today's Purchase", 'today')} title="Today's Purchase" value={fmt(stats?.purchasesToday)} icon={ShoppingCart} color="var(--color-orange)" lightColor="var(--color-orange-light)" />
        <StatCard onClick={() => handleCardClick('business_expenses', "Today's Expenses", 'today')} title="Today's Expenses" value={fmt(stats?.expensesToday)} icon={ArrowDown} color="var(--color-danger)" lightColor="#FEE2E2" />
        <StatCard onClick={() => handleCardClick('profit', "Today's Profit", 'today')} title="Today's Profit" value={fmt(stats?.profitToday)} icon={TrendingUp} color="#6A1B9A" lightColor="#F3E5F5" />
        <StatCard onClick={() => handleCardClick('monthly_expenses', "Monthly Expenses", 'month')} title="Monthly Expenses" value={fmt(stats?.monthlyExpenses)} icon={ArrowDown} color="#D84315" lightColor="#FBE9E7" />
        <StatCard onClick={() => handleCardClick('profit', "Monthly Profit", 'month')} title="Monthly Profit" value={fmt(stats?.monthlyProfit)} icon={TrendingUp} color="#283593" lightColor="#E8EAF6" />

        <StatCard onClick={() => handleCardClick('customers', "Total Customers", 'all')} title="Total Customers" value={stats?.custCount} icon={Users} color="#00897B" lightColor="#E0F2F1" />
        <StatCard onClick={() => handleCardClick('bills', "Total Bills Today", 'today')} title="Total Bills Today" value={stats?.billsToday} icon={Receipt} color="#455A64" lightColor="#CFD8DC" />
        <StatCard onClick={() => handleCardClick('pending_payments', "Pending Payments", 'all')} title="Pending Payments" value={fmt(stats?.outstandingTotal)} icon={Wallet} color="var(--color-warning)" lightColor="#FFF8E1" />
      </div>

      {/* CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Sales vs Purchases Area Chart */}
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <div className="card-header"><h3>Revenue & Purchases ({chartRange === 'year' ? 'Monthly' : 'Daily'})</h3></div>
          <div style={{ height: 320, padding: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-green)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-green)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orange)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-orange)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(v) => `₹${v/1000}k`} axisLine={false} tickLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--color-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="var(--color-orange)" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend Line Chart */}
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <div className="card-header"><h3>Net Profit Trend</h3></div>
          <div style={{ height: 320, padding: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(v) => `₹${v/1000}k`} axisLine={false} tickLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6A1B9A" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6, strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Bar Chart */}
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <div className="card-header"><h3>Expenses ({chartRange === 'year' ? 'Monthly' : 'Daily'})</h3></div>
          <div style={{ height: 320, padding: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} tickFormatter={(v) => `₹${v/1000}k`} axisLine={false} tickLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <Tooltip formatter={(value) => `₹${value}`} cursor={{fill: 'var(--bg-app)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--color-danger)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Pie Chart */}
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <div className="card-header"><h3>Top Selling Products (Revenue)</h3></div>
          <div style={{ height: 320, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProductsData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PieChartIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>No product data available</p>
              </div>
            )}
          </div>
        </div>

      </div>
      {drillDown && (
        <DrillDownModal 
          drillDown={drillDown}
          onClose={() => setDrillDown(null)}
          fmt={fmt}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Drill-Down Modal Component
// ---------------------------------------------------------

function DrillDownModal({ drillDown, onClose, fmt }) {
  const { title, type, data, loading } = drillDown;
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  if (loading) {
    return createPortal(
      <div className="modal-backdrop">
        <div className="modal" style={{ width: '800px', padding: '2rem', textAlign: 'center' }}>
          <p>Loading detailed data...</p>
        </div>
      </div>,
      document.body
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (list, columns) => {
    let csv = columns.map(c => c.label).join(',') + '\n';
    list.forEach(row => {
      const line = columns.map(c => {
        let val = row[c.key] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
      csv += line + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_Export.csv`;
    a.click();
  };

  if (type === 'profit' || type === 'monthly_expenses') {
    const { sales, purchases, expenses } = data;
    
    let totalSales = 0;
    let sCustSet = new Set();
    let sBillsTotal = sales.length;
    
    let totalPurchases = 0;
    let pVendSet = new Set();
    let pBillsTotal = purchases.length;
    
    let totalExpenses = 0;
    
    const dayWise = {};
    
    sales.forEach(s => {
      totalSales += (s.amount || 0);
      if (s.customer) sCustSet.add(s.customer);
      
      if (!dayWise[s.date]) dayWise[s.date] = { date: s.date, salesAmt: 0, sBills: 0, sCusts: new Set(), purchAmt: 0, pBills: 0, pVends: new Set(), expAmt: 0 };
      dayWise[s.date].salesAmt += s.amount || 0;
      dayWise[s.date].sBills += 1;
      if (s.customer) dayWise[s.date].sCusts.add(s.customer);
    });
    
    purchases.forEach(p => {
      totalPurchases += (p.amount || 0);
      if (p.supplier) pVendSet.add(p.supplier);
      
      if (!dayWise[p.date]) dayWise[p.date] = { date: p.date, salesAmt: 0, sBills: 0, sCusts: new Set(), purchAmt: 0, pBills: 0, pVends: new Set(), expAmt: 0 };
      dayWise[p.date].purchAmt += p.amount || 0;
      dayWise[p.date].pBills += 1;
      if (p.supplier) dayWise[p.date].pVends.add(p.supplier);
    });
    
    expenses.forEach(e => {
      totalExpenses += (e.amount || 0);
      if (!dayWise[e.date]) dayWise[e.date] = { date: e.date, salesAmt: 0, sBills: 0, sCusts: new Set(), purchAmt: 0, pBills: 0, pVends: new Set(), expAmt: 0 };
      dayWise[e.date].expAmt += e.amount || 0;
    });

    const netProfit = totalSales - totalPurchases - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : '0.00';
    
    const days = Object.values(dayWise).sort((a, b) => a.date.localeCompare(b.date));
    
    const formatDt = (d) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length === 3) {
         const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1])-1];
         return `${parts[2]} ${m} ${parts[0]}`;
      }
      return d;
    };
    
    const shortDt = (d) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length === 3) {
         const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1])-1];
         return `${parts[2]} ${m}`;
      }
      return d;
    };

    const periodStr = days.length > 0 
      ? `For Period: ${formatDt(days[0].date)} – ${formatDt(days[days.length-1].date)}`
      : 'No data available for this period';

    return createPortal(
      <div className="modal-backdrop profit-report-container print-fullscreen">
        <style>{`
          .profit-report-container .modal {
             width: 100vw !important;
             height: 100vh !important;
             max-height: 100vh !important;
             margin: 0 !important;
             border-radius: 0 !important;
             background: #f4f6f8;
          }
          .pr-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .pr-title { font-size: 13px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .pr-amt { font-size: 24px; font-weight: 900; margin-bottom: 12px; }
          .pr-meta { font-size: 12px; color: #666; display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #eee; }
          .pr-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 24px; }
          .pr-section-title { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .pr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .pr-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 700; color: #444; border-bottom: 2px solid #e2e8f0; }
          .pr-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #333; }
          .pr-table tr:last-child td { border-bottom: none; }
          .pr-table tr:hover { background: #f8fafc; }
          .pr-table tfoot td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #cbd5e1; }
          
          @media print {
             body > *:not(.profit-report-container) { display: none !important; }
             .profit-report-container { position: relative !important; width: 100%; z-index: 9999; display: block !important; background: #fff !important; }
             .profit-report-container .modal { width: 100% !important; max-height: none !important; box-shadow: none !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
             .hide-on-print { display: none !important; }
             @page { size: A4 portrait; margin: 10mm; }
             .pr-section { box-shadow: none !important; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; margin-bottom: 15px; }
             .pr-table, .pr-table tr, .pr-table td, .pr-table th { page-break-inside: avoid; break-inside: avoid; }
             thead { display: table-header-group; }
             tfoot { display: table-footer-group; }
          }
        `}</style>

        <div className="modal" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header hide-on-print" style={{ background: '#fff', borderBottom: '1px solid #eee', borderRadius: '12px 12px 0 0' }}>
            <div>
               <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111' }}>Business Profit Report</h3>
               <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{periodStr}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
               <button className="btn btn-secondary" onClick={handlePrint} style={{ background: '#e2e8f0', color: '#0f172a' }}><Printer size={16}/> Print Report</button>
               <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
            </div>
          </div>
          
          <div className="modal-body" style={{ overflowY: 'auto', padding: '24px' }}>
            
            {/* TOP SUMMARY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="pr-card" style={{ borderTop: '4px solid #22c55e' }}>
                 <div className="pr-title">Total Sales</div>
                 <div className="pr-amt" style={{ color: '#166534' }}>{fmt(totalSales)}</div>
                 <div className="pr-meta"><span>Bills: {sBillsTotal}</span> <span>Customers: {sCustSet.size}</span></div>
              </div>
              <div className="pr-card" style={{ borderTop: '4px solid #f97316' }}>
                 <div className="pr-title">Total Purchases</div>
                 <div className="pr-amt" style={{ color: '#c2410c' }}>{fmt(totalPurchases)}</div>
                 <div className="pr-meta"><span>Bills: {pBillsTotal}</span> <span>Vendors: {pVendSet.size}</span></div>
              </div>
              <div className="pr-card" style={{ borderTop: '4px solid #ef4444' }}>
                 <div className="pr-title">Business Expenses</div>
                 <div className="pr-amt" style={{ color: '#b91c1c' }}>{fmt(totalExpenses)}</div>
                 <div className="pr-meta"><span>Entries: {expenses.length}</span></div>
              </div>
              <div className="pr-card" style={{ borderTop: '4px solid #8b5cf6' }}>
                 <div className="pr-title">Net Profit</div>
                 <div className="pr-amt" style={{ color: '#5b21b6' }}>{fmt(netProfit)}</div>
                 <div className="pr-meta"><span>Margin:</span> <span style={{ fontWeight: 800 }}>{profitMargin}%</span></div>
              </div>
            </div>

            {/* SECTION 5: CALCULATION SUMMARY (Moved up for better visibility as requested by ERP standard, or keep as section 5?) */}
            <div className="pr-section" style={{ maxWidth: '400px', margin: '0 auto 24px auto', border: '2px solid #e2e8f0', background: '#f8fafc' }}>
               <div className="pr-section-title" style={{ justifyContent: 'center' }}>Calculation Summary</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <span>Total Sales</span> <span style={{ color: '#166534' }}>{fmt(totalSales)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#c2410c' }}>
                  <span>Less: Purchases</span> <span>- {fmt(totalPurchases)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: '#b91c1c', borderBottom: '1px solid #cbd5e1', paddingBottom: '16px' }}>
                  <span>Less: Expenses</span> <span>- {fmt(totalExpenses)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '16px', fontWeight: 900, color: '#5b21b6' }}>
                  <span>Net Profit</span> <span>{fmt(netProfit)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                  <span>Profit Margin</span> <span>{profitMargin}%</span>
               </div>
            </div>

            {/* SECTION 1: SALES SUMMARY */}
            <div className="pr-section">
               <div className="pr-section-title">
                  <span>Section 1: Sales Summary (Day Wise)</span>
                  <span style={{ color: '#166534' }}>Total Sales: {fmt(totalSales)}</span>
               </div>
               <table className="pr-table">
                  <thead><tr><th>Date</th><th style={{textAlign:'center'}}>No of Bills</th><th style={{textAlign:'center'}}>Unique Customers</th><th style={{textAlign:'right'}}>Sales Amount</th></tr></thead>
                  <tbody>
                     {days.map(d => (
                        <tr key={d.date}>
                           <td>{shortDt(d.date)}</td>
                           <td style={{textAlign:'center'}}>{d.sBills}</td>
                           <td style={{textAlign:'center'}}>{d.sCusts.size}</td>
                           <td style={{textAlign:'right', fontWeight:600, color:'#166534'}}>{fmt(d.salesAmt)}</td>
                        </tr>
                     ))}
                     {days.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', color:'#666', padding:'20px'}}>No sales data found for this period.</td></tr>}
                  </tbody>
                  {days.length > 0 && (
                     <tfoot>
                        <tr>
                           <td>TOTAL</td>
                           <td style={{textAlign:'center'}}>{sBillsTotal}</td>
                           <td style={{textAlign:'center'}}>{sCustSet.size}</td>
                           <td style={{textAlign:'right', color:'#166534'}}>{fmt(totalSales)}</td>
                        </tr>
                     </tfoot>
                  )}
               </table>
            </div>

            {/* SECTION 2: PURCHASE SUMMARY */}
            <div className="pr-section">
               <div className="pr-section-title">
                  <span>Section 2: Purchase Summary (Day Wise)</span>
                  <span style={{ color: '#c2410c' }}>Total Purchases: {fmt(totalPurchases)}</span>
               </div>
               <table className="pr-table">
                  <thead><tr><th>Date</th><th style={{textAlign:'center'}}>Purchase Bills</th><th style={{textAlign:'center'}}>Vendors</th><th style={{textAlign:'right'}}>Purchase Amount</th></tr></thead>
                  <tbody>
                     {days.map(d => (
                        <tr key={d.date}>
                           <td>{shortDt(d.date)}</td>
                           <td style={{textAlign:'center'}}>{d.pBills}</td>
                           <td style={{textAlign:'center'}}>{d.pVends.size}</td>
                           <td style={{textAlign:'right', fontWeight:600, color:'#c2410c'}}>{fmt(d.purchAmt)}</td>
                        </tr>
                     ))}
                     {days.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', color:'#666', padding:'20px'}}>No purchase data found for this period.</td></tr>}
                  </tbody>
                  {days.length > 0 && (
                     <tfoot>
                        <tr>
                           <td>TOTAL</td>
                           <td style={{textAlign:'center'}}>{pBillsTotal}</td>
                           <td style={{textAlign:'center'}}>{pVendSet.size}</td>
                           <td style={{textAlign:'right', color:'#c2410c'}}>{fmt(totalPurchases)}</td>
                        </tr>
                     </tfoot>
                  )}
               </table>
            </div>

            {/* SECTION 3: PROFIT COMPARISON */}
            <div className="pr-section">
               <div className="pr-section-title">
                  <span>Section 3: Day Wise Profit Comparison</span>
               </div>
               <table className="pr-table">
                  <thead>
                     <tr>
                        <th>Date</th>
                        <th style={{textAlign:'right'}}>Sales</th>
                        <th style={{textAlign:'right'}}>Purchases</th>
                        <th style={{textAlign:'right'}}>Expenses</th>
                        <th style={{textAlign:'right'}}>Net Profit</th>
                        <th style={{textAlign:'right'}}>Margin %</th>
                     </tr>
                  </thead>
                  <tbody>
                     {days.map(d => {
                        const dayNet = d.salesAmt - d.purchAmt - d.expAmt;
                        const dayMargin = d.salesAmt > 0 ? ((dayNet / d.salesAmt) * 100).toFixed(2) : '0.00';
                        const isLoss = dayNet < 0;
                        return (
                           <tr key={d.date}>
                              <td>{shortDt(d.date)}</td>
                              <td style={{textAlign:'right', color:'#166534'}}>{fmt(d.salesAmt)}</td>
                              <td style={{textAlign:'right', color:'#c2410c'}}>{fmt(d.purchAmt)}</td>
                              <td style={{textAlign:'right', color:'#b91c1c'}}>{fmt(d.expAmt)}</td>
                              <td style={{textAlign:'right', fontWeight:700, color: isLoss ? '#dc2626' : '#16a34a'}}>{isLoss ? '-' + fmt(Math.abs(dayNet)) : fmt(dayNet)}</td>
                              <td style={{textAlign:'right', fontWeight:700, color: isLoss ? '#dc2626' : '#16a34a'}}>{dayMargin}%</td>
                           </tr>
                        );
                     })}
                     {days.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', color:'#666', padding:'20px'}}>No data found for this period.</td></tr>}
                  </tbody>
                  {days.length > 0 && (
                     <tfoot>
                        <tr>
                           <td>TOTAL</td>
                           <td style={{textAlign:'right', color:'#166534'}}>{fmt(totalSales)}</td>
                           <td style={{textAlign:'right', color:'#c2410c'}}>{fmt(totalPurchases)}</td>
                           <td style={{textAlign:'right', color:'#b91c1c'}}>{fmt(totalExpenses)}</td>
                           <td style={{textAlign:'right', color: netProfit < 0 ? '#dc2626' : '#16a34a'}}>{netProfit < 0 ? '-' + fmt(Math.abs(netProfit)) : fmt(netProfit)}</td>
                           <td style={{textAlign:'right', color: netProfit < 0 ? '#dc2626' : '#16a34a'}}>{profitMargin}%</td>
                        </tr>
                     </tfoot>
                  )}
               </table>
            </div>

            {/* SECTION 4: BUSINESS EXPENSES */}
            <div className="pr-section">
               <div className="pr-section-title">
                  <span>Section 4: Business Expenses Details</span>
                  <span style={{ color: '#b91c1c' }}>Total Expenses: {fmt(totalExpenses)}</span>
               </div>
               {expenses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #ccc', color: '#666', fontStyle: 'italic' }}>
                     "No business expenses found for this period."
                  </div>
               ) : (
                  <table className="pr-table">
                     <thead>
                        <tr>
                           <th>Date</th>
                           <th>Category</th>
                           <th>Description</th>
                           <th style={{textAlign:'right'}}>Amount</th>
                        </tr>
                     </thead>
                     <tbody>
                        {expenses.map(e => (
                           <tr key={e.id}>
                              <td>{shortDt(e.date)}</td>
                              <td>{e.category}</td>
                              <td>{e.description || '-'}</td>
                              <td style={{textAlign:'right', color:'#b91c1c', fontWeight:600}}>{fmt(e.amount)}</td>
                           </tr>
                        ))}
                     </tbody>
                     <tfoot>
                        <tr>
                           <td colSpan="3">TOTAL EXPENSES</td>
                           <td style={{textAlign:'right', color:'#b91c1c'}}>{fmt(totalExpenses)}</td>
                        </tr>
                     </tfoot>
                  </table>
               )}
            </div>

          </div>
        </div>
      </div>,
      document.body
    );
  }

  let columns = [];
  if (type === 'sales' || type === 'bills') {
    columns = [
      { key: 'date', label: 'Date' },
      { key: 'billNo', label: 'Bill No' },
      { key: 'customer', label: 'Customer' },
      { key: 'totalWeight', label: 'Total Wgt (Kg)' },
      { key: 'amount', label: 'Bill Amount', isCurrency: true },
      { key: 'paymentStatus', label: 'Payment' }
    ];
  } else if (type === 'purchases') {
    columns = [
      { key: 'date', label: 'Date' },
      { key: 'purchaseNo', label: 'Purchase No' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'amount', label: 'Amount', isCurrency: true }
    ];
  } else if (type === 'business_expenses') {
    columns = [
      { key: 'date', label: 'Expense Date' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', isCurrency: true }
    ];
  } else if (type === 'pending_payments') {
    columns = [
      { key: 'customer', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'pendingAmount', label: 'Pending Amount', isCurrency: true },
      { key: 'lastPurchase', label: 'Last Purchase' }
    ];
  } else if (type === 'customers') {
    columns = [
      { key: 'customer', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'outstanding', label: 'Outstanding', isCurrency: true },
      { key: 'lastPurchase', label: 'Last Purchase' }
    ];
  }

  const list = data || [];
  
  const filteredList = list.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item).some(val => String(val).toLowerCase().includes(term));
  });

  let totalAmount = 0;
  if (type === 'sales' || type === 'bills' || type === 'purchases' || type === 'business_expenses') {
    totalAmount = filteredList.reduce((sum, item) => sum + (item.amount || 0), 0);
  } else if (type === 'pending_payments') {
    totalAmount = filteredList.reduce((sum, item) => sum + (item.pendingAmount || 0), 0);
  } else if (type === 'customers') {
    totalAmount = filteredList.reduce((sum, item) => sum + (item.outstanding || 0), 0);
  }

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return createPortal(
    <div className="modal-backdrop print-fullscreen">
      <div className="modal" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header hide-on-print">
          <h3>{title}</h3>
          <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body print-padding" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <div className="search-bar" style={{ width: '300px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search records..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} style={{ paddingLeft: '35px', width: '100%' }} className="input" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => handleExport(list, columns)}><Download size={16}/> Export CSV</button>
              <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16}/> Print</button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                {columns.map(c => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((row, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c.key}>{c.isCurrency ? fmt(row[c.key]) : row[c.key]}</td>
                  ))}
                </tr>
              ))}
              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 'auto', borderTop: '2px solid var(--border-light)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Records: {filteredList.length}</div>
            {type !== 'customers' && (
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Grand Total: {fmt(totalAmount)}</div>
            )}
            {type === 'customers' && (
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Total Outstanding: {fmt(totalAmount)}</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary btn-icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={18} /></button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={18} /></button>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
