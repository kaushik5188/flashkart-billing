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

  const StatCard = ({ title, value, icon: Icon, color, lightColor }) => (
    <div className="card stat-card" style={{ padding: '1.5rem', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
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
        <StatCard title="Today's Sales" value={fmt(stats?.salesToday)} icon={DollarSign} color="var(--color-green)" lightColor="var(--color-green-light)" />
        <StatCard title="Today's Purchase" value={fmt(stats?.purchasesToday)} icon={ShoppingCart} color="var(--color-orange)" lightColor="var(--color-orange-light)" />
        <StatCard title="Today's Expenses" value={fmt(stats?.expensesToday)} icon={ArrowDown} color="var(--color-danger)" lightColor="#FEE2E2" />
        <StatCard title="Today's Profit" value={fmt(stats?.profitToday)} icon={TrendingUp} color="#6A1B9A" lightColor="#F3E5F5" />
        <StatCard title="Current Stock Value" value={fmt(stats?.stockValue)} icon={Layers} color="var(--color-info)" lightColor="#E1F5FE" />
        <StatCard title="Total Customers" value={stats?.custCount} icon={Users} color="#00897B" lightColor="#E0F2F1" />
        <StatCard title="Total Bills Today" value={stats?.billsToday} icon={Receipt} color="#455A64" lightColor="#CFD8DC" />
        <StatCard title="Pending Payments" value={fmt(stats?.outstandingTotal)} icon={Wallet} color="var(--color-warning)" lightColor="#FFF8E1" />
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
    </div>
  );
}
