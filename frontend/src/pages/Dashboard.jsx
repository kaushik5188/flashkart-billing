import React, { useState, useEffect } from 'react';
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
  PieChart as PieChartIcon
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

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Enterprise Dashboard</h1>
          <p className="page-subtitle">Real-time overview of your business</p>
        </div>
        <select className="input" style={{ width: 'auto', fontWeight: 600 }} value={chartRange} onChange={e => setChartRange(e.target.value)}>
          <option value="month">Last 30 Days</option>
          <option value="year">This Year (Monthly)</option>
        </select>
      </header>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-green)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-green)', backgroundColor: 'var(--color-green-light)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Today's Sales</h4>
            <div className="stat-value">{fmt(stats?.salesToday)}</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-orange)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-orange)', backgroundColor: 'var(--color-orange-light)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Today's Purchase</h4>
            <div className="stat-value">{fmt(stats?.purchasesToday)}</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-danger)', backgroundColor: '#FEE2E2' }}>
            <ArrowDown size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Today's Expenses</h4>
            <div className="stat-value">{fmt(stats?.expensesToday)}</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid #6A1B9A' }}>
          <div className="stat-icon" style={{ color: '#6A1B9A', backgroundColor: '#F3E5F5' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Today's Profit</h4>
            <div className="stat-value">{fmt(stats?.profitToday)}</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-blue)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-blue)', backgroundColor: 'var(--color-blue-light)' }}>
            <Layers size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Current Stock Value</h4>
            <div className="stat-value">{fmt(stats?.stockValue)}</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <h4 className="stat-label">Total Customers</h4>
            <div className="stat-value">{stats?.custCount}</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon"><Receipt size={24} /></div>
          <div className="stat-content">
            <h4 className="stat-label">Total Bills Today</h4>
            <div className="stat-value">{stats?.billsToday}</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-orange)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-orange)', backgroundColor: 'var(--color-orange-light)' }}>
            <Wallet size={24} />
          </div>
          <div className="stat-content">
            <h4 className="stat-label">Pending Payments</h4>
            <div className="stat-value">{fmt(stats?.outstandingTotal)}</div>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Sales vs Purchases Area Chart */}
        <div className="card">
          <div className="card-header"><h3>Revenue & Purchases ({chartRange === 'year' ? 'Monthly' : 'Daily'})</h3></div>
          <div style={{ height: 300, padding: '1rem' }}>
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
                <XAxis dataKey="label" tick={{fontSize: 12}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--color-green)" fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="var(--color-orange)" fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend Line Chart */}
        <div className="card">
          <div className="card-header"><h3>Net Profit Trend</h3></div>
          <div style={{ height: 300, padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 12}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6A1B9A" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Bar Chart */}
        <div className="card">
          <div className="card-header"><h3>Expenses ({chartRange === 'year' ? 'Monthly' : 'Daily'})</h3></div>
          <div style={{ height: 300, padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 12}} tickFormatter={(l) => chartRange === 'year' ? l : l.substring(5)} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Bar dataKey="expenses" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Pie Chart */}
        <div className="card">
          <div className="card-header"><h3>Top Selling Products (Revenue)</h3></div>
          <div style={{ height: 300, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProductsData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No product data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
