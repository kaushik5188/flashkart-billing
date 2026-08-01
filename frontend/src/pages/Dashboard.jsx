import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  Calendar,
  Layers,
  ArrowDown,
  Wallet,
  BarChart3
} from 'lucide-react';

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
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/reports/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to load dashboard statistics.');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch chart coords
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

  // Helper to render custom SVG charts
  const renderSVGChart = () => {
    if (chartData.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)' }}>
          No transaction data available yet.
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 40;

    // Find max value in dataset to scale Y axis
    const maxSales = Math.max(...chartData.map(d => d.sales || 0), 100);
    const maxVal = maxSales * 1.15; // Give headroom

    const getX = (index) => {
      const chartWidth = width - padding * 2;
      return padding + (index / (chartData.length - 1 || 1)) * chartWidth;
    };

    const getY = (val) => {
      const chartHeight = height - padding * 2;
      return height - padding - (val / maxVal) * chartHeight;
    };

    // Build line paths
    let salesPoints = '';
    let profitPoints = '';
    let salesArea = `M ${getX(0)} ${height - padding}`;
    
    chartData.forEach((d, i) => {
      const x = getX(i);
      const yS = getY(d.sales || 0);
      const yP = getY(d.profit || 0);
      
      salesPoints += `${i === 0 ? 'M' : 'L'} ${x} ${yS} `;
      profitPoints += `${i === 0 ? 'M' : 'L'} ${x} ${yP} `;
      salesArea += ` L ${x} ${yS}`;
    });

    salesArea += ` L ${getX(chartData.length - 1)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', maxHeight: '250px' }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - padding * 2);
          const gridVal = Math.round(maxVal * (1 - ratio));
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border-light)" strokeWidth={1} strokeDasharray="4 4" />
              <text x={padding - 8} y={y + 4} fill="var(--text-muted)" fontSize={9} textAnchor="end">₹{gridVal}</text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {chartData.map((d, i) => {
          // Print only subset of labels to prevent cluttering
          const modulo = Math.ceil(chartData.length / 6);
          if (i % modulo !== 0 && i !== chartData.length - 1) return null;
          
          let displayLabel = d.label;
          // Format 'YYYY-MM' label into Month names
          if (displayLabel && displayLabel.length === 7) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(displayLabel.substring(5, 7)) - 1;
            displayLabel = months[mIdx] || displayLabel;
          } else if (displayLabel && displayLabel.length === 10) {
            // YYYY-MM-DD to MM-DD
            displayLabel = displayLabel.substring(5, 10);
          }
          
          return (
            <text key={i} x={getX(i)} y={height - 12} fill="var(--text-muted)" fontSize={9} textAnchor="middle">
              {displayLabel}
            </text>
          );
        })}

        {/* Sales Area Fill */}
        <path d={salesArea} fill="url(#salesGrad)" />

        {/* Line curves */}
        <path d={salesPoints} fill="none" stroke="var(--color-green)" strokeWidth={3} strokeLinecap="round" />
        <path d={profitPoints} fill="none" stroke="var(--color-orange)" strokeWidth={2.5} strokeDasharray="3 2" strokeLinecap="round" />

        {/* Legend dots */}
        {chartData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.sales || 0)} r={4} fill="var(--color-green)" stroke="#FFFFFF" strokeWidth={1} />
          </g>
        ))}
      </svg>
    );
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="btn" style={{ cursor: 'default', backgroundColor: 'var(--color-green-light)', color: 'var(--color-green-dark)' }}>
          Loading Dashboard stats...
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Today's Sales", val: `₹${(stats?.salesToday || 0).toFixed(2)}`, icon: DollarSign, color: "var(--color-green)", bg: "var(--color-green-light)" },
    { title: "This Month Sales", val: `₹${(stats?.salesThisMonth || 0).toFixed(2)}`, icon: Calendar, color: "var(--color-green-dark)", bg: "rgba(46, 125, 50, 0.15)" },
    { title: "Total Customers", val: stats?.custCount || 0, icon: Users, color: "var(--color-info)", bg: "rgba(2, 136, 209, 0.1)" },
    { title: "Pending Collections", val: `₹${(stats?.outstandingTotal || 0).toFixed(2)}`, icon: AlertTriangle, color: "var(--color-orange-dark)", bg: "var(--color-orange-light)" },
    { title: "Today's Invoices", val: stats?.billsToday || 0, icon: Receipt, color: "var(--color-green)", bg: "var(--color-green-light)" },
    { title: "Total Invoices", val: stats?.billsCount || 0, icon: Layers, color: "var(--text-muted)", bg: "var(--border-light)" },
    { title: "Today's Collections", val: `₹${(stats?.todayCollections || 0).toFixed(2)}`, icon: Wallet, color: "#388E3C", bg: "rgba(56,142,60,0.1)" },
    { title: "Total Transactions", val: stats?.totalTransactions || 0, icon: BarChart3, color: "var(--color-orange)", bg: "rgba(251,140,0,0.1)" },
  ];

  return (
    <div className="animate-fade">
      {/* Welcome Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome to FLASHKART</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Fresh Fruits & Vegetables Wholesaler POS & Inventory System
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setView('billing')} className="btn btn-primary">
            <Receipt size={18} /> New Bill
          </button>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="dashboard-grid">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card stats-card" style={{ padding: '1.25rem' }}>
              <div className="stats-info">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.title}</span>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '2px' }}>{card.val}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Sales Chart Card */}
        <div className="glass-card" style={{ minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sales vs Net Profit Trend</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solid green represents Sales, dashed orange represents Profit</p>
            </div>
            <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '2px' }}>
              <button
                onClick={() => setChartRange('month')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: chartRange === 'month' ? 'var(--color-green)' : 'transparent',
                  color: chartRange === 'month' ? '#FFFFFF' : 'var(--text-main)'
                }}
              >
                30 Days
              </button>
              <button
                onClick={() => setChartRange('year')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: chartRange === 'year' ? 'var(--color-green)' : 'transparent',
                  color: chartRange === 'year' ? '#FFFFFF' : 'var(--text-main)'
                }}
              >
                12 Months
              </button>
            </div>
          </div>
          {renderSVGChart()}
        </div>

        {/* Low Stock Alerts & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Low Stock Alert */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-orange)', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
              <AlertTriangle style={{ color: 'var(--color-orange)' }} size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Stock Alerts ({stats?.lowStockCount || 0})</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              The following vegetables are running below their minimum stock thresholds.
            </p>
            <button 
              onClick={() => setView('inventory')} 
              className="btn btn-secondary" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
            >
              Manage Inventory Stock In
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem' }}>Quick Shortcuts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setView('billing')} className="btn btn-primary" style={{ padding: '0.6rem', fontSize: '0.8rem' }}>
                Create Invoice
              </button>
              <button onClick={() => setView('customers')} className="btn btn-secondary" style={{ padding: '0.6rem', fontSize: '0.8rem' }}>
                Add Customer
              </button>
              <button onClick={() => setView('inventory')} className="btn btn-secondary" style={{ padding: '0.6rem', fontSize: '0.8rem' }}>
                Stock Entries
              </button>
              <button onClick={() => setView('reports')} className="btn btn-secondary" style={{ padding: '0.6rem', fontSize: '0.8rem' }}>
                Profit Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Best Sellers & Recent Purchases */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Best Selling Vegetables */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-green)' }} /> Best Selling Vegetables
          </h3>
          <div className="table-container" style={{ margin: 0, border: 'none' }}>
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 12px' }}>Vegetable Name</th>
                  <th style={{ padding: '6px 12px', textAnchor: 'end' }}>Sales Qty</th>
                  <th style={{ padding: '6px 12px', textAnchor: 'end' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats?.bestSellers.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No bills recorded yet.</td>
                  </tr>
                ) : (
                  stats?.bestSellers.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                      <td>{item.total_qty.toFixed(1)}</td>
                      <td style={{ color: 'var(--color-green-dark)', fontWeight: 700 }}>₹{item.total_revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customers List */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={18} style={{ color: 'var(--color-info)' }} /> Recent Customers Activity
          </h3>
          <div className="table-container" style={{ margin: 0, border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ padding: '6px 12px' }}>Customer Name</th>
                  <th style={{ padding: '6px 12px' }}>Mobile</th>
                  <th style={{ padding: '6px 12px' }}>Last Sale</th>
                  <th style={{ padding: '6px 12px' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No customers created yet.</td>
                  </tr>
                ) : (
                  stats?.recentCustomers.map((cust, idx) => (
                    <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => { setCustomerId(cust.id); setView('customers'); }}>
                      <td style={{ fontWeight: 600 }}>{cust.name}</td>
                      <td>{cust.mobile}</td>
                      <td>{cust.last_purchase_date || 'No purchases'}</td>
                      <td>
                        <span className={`badge ${cust.outstanding_balance > 0 ? 'badge-warning' : 'badge-success'}`}>
                          ₹{cust.outstanding_balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
