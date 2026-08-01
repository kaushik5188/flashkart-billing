import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Search, 
  Calendar,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

export default function Reports({ token, API_URL, setCustomerId, setView }) {
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'products', 'customers', 'receivables'
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // today
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '';
      if (activeReport === 'sales') {
        endpoint = `sales-profit-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'products') {
        endpoint = `products-sales-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'customers') {
        endpoint = `customers-sales-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'receivables') {
        endpoint = `receivables-report`;
      }

      const res = await fetch(`${API_URL}/api/reports/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error loading report database.');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate totals for report summaries
  const getSummaryMetrics = () => {
    let salesTotal = 0;
    let profitTotal = 0;
    let quantityTotal = 0;
    let invoicesCount = reportData.length;

    if (activeReport === 'sales') {
      reportData.forEach(row => {
        salesTotal += row.grand_total;
        profitTotal += row.net_profit;
      });
    } else if (activeReport === 'products') {
      reportData.forEach(row => {
        salesTotal += row.total_revenue;
        profitTotal += row.total_profit;
        quantityTotal += row.total_qty;
      });
    } else if (activeReport === 'customers') {
      reportData.forEach(row => {
        salesTotal += row.total_spent || 0;
        profitTotal += row.outstanding_balance || 0; // We treat outstanding as filterable metric
      });
    } else if (activeReport === 'receivables') {
      reportData.forEach(row => {
        salesTotal += row.outstanding_balance;
      });
    }

    return { salesTotal, profitTotal, quantityTotal, invoicesCount };
  };

  const { salesTotal, profitTotal, quantityTotal, invoicesCount } = getSummaryMetrics();

  // Excel CSV Exporter (local blob generation)
  const exportToCSV = () => {
    if (reportData.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    let headers = [];
    let rows = [];

    if (activeReport === 'sales') {
      headers = ["Invoice No", "Date", "Customer Name", "Grand Total (Rs)", "Paid (Rs)", "Profit (Rs)"];
      rows = reportData.map(r => [r.bill_number, r.invoice_date, r.customer_name, r.grand_total, r.paid_amount, r.net_profit]);
    } else if (activeReport === 'products') {
      headers = ["Product Name", "Category", "Quantity Sold", "Unit", "Total Sales (Rs)", "Total Profit (Rs)"];
      rows = reportData.map(r => [r.product_name, r.category, r.total_qty, r.unit, r.total_revenue, r.total_profit]);
    } else if (activeReport === 'customers') {
      headers = ["Customer Name", "Mobile", "Place", "Bills Count", "Total Spent (Rs)", "Outstanding (Rs)"];
      rows = reportData.map(r => [r.name, r.mobile, r.place, r.total_bills, r.total_spent, r.outstanding_balance]);
    } else if (activeReport === 'receivables') {
      headers = ["Customer Name", "Mobile", "Place", "Outstanding Debt (Rs)", "Last Purchase"];
      rows = reportData.map(r => [r.name, r.mobile, r.place, r.outstanding_balance, r.last_purchase_date || 'N/A']);
    }

    // Join headers and rows
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `flashkart_${activeReport}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade">
      {/* Top Header Options */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Business Reports Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate and audit sales, profits, and debts ledgers</p>
        </div>

        {/* Report tabs */}
        <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '3px', backgroundColor: 'var(--bg-card)' }}>
          <button onClick={() => setActiveReport('sales')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeReport === 'sales' ? 'var(--color-green-light)' : 'transparent', color: activeReport === 'sales' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <TrendingUp size={14} /> Sales & Profits
          </button>
          <button onClick={() => setActiveReport('products')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeReport === 'products' ? 'var(--color-green-light)' : 'transparent', color: activeReport === 'products' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <BarChart3 size={14} /> Vegetable sales
          </button>
          <button onClick={() => setActiveReport('customers')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeReport === 'customers' ? 'var(--color-green-light)' : 'transparent', color: activeReport === 'customers' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <Users size={14} /> Customer wise
          </button>
          <button onClick={() => setActiveReport('receivables')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeReport === 'receivables' ? 'var(--color-green-light)' : 'transparent', color: activeReport === 'receivables' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <AlertTriangle size={14} /> Pending Payments
          </button>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {error}
        </div>
      )}

      {/* Date Filters Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* Date picking forms */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <Calendar size={16} style={{ color: 'var(--color-green)' }} /> Date Range:
          </div>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: '130px', height: '36px', fontSize: '0.85rem' }} 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={activeReport === 'receivables'}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: '130px', height: '36px', fontSize: '0.85rem' }} 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={activeReport === 'receivables'}
          />
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportToCSV} className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={reportData.length === 0}>
            <FileSpreadsheet size={16} style={{ color: '#1B5E20' }} /> Export Excel
          </button>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={reportData.length === 0}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        {activeReport === 'sales' && (
          <>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Period Revenue</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green)' }}>₹{salesTotal.toFixed(2)}</h3>
              </div>
            </div>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Net Profits</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green-dark)' }}>₹{profitTotal.toFixed(2)}</h3>
              </div>
            </div>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Invoices Cleared</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{invoicesCount} Bills</h3>
              </div>
            </div>
          </>
        )}

        {activeReport === 'products' && (
          <>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vegetables Revenue</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{salesTotal.toFixed(2)}</h3>
              </div>
            </div>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vegetable Profits</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green)' }}>₹{profitTotal.toFixed(2)}</h3>
              </div>
            </div>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Volume Dispatched</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{quantityTotal.toFixed(1)} Kg/Units</h3>
              </div>
            </div>
          </>
        )}

        {activeReport === 'customers' && (
          <>
            <div className="glass-card stats-card" style={{ padding: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Customer Volume</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{salesTotal.toFixed(2)}</h3>
              </div>
            </div>
            <div className="glass-card stats-card" style={{ padding: '1rem', borderLeft: '3px solid var(--color-orange)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Receivables Debt</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange-dark)' }}>₹{profitTotal.toFixed(2)}</h3>
              </div>
            </div>
          </>
        )}

        {activeReport === 'receivables' && (
          <div className="glass-card stats-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-orange)', gridColumn: 'span 3' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Outstanding Pending Payments (લેણું)</span>
              <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-danger)' }}>₹{salesTotal.toFixed(2)}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Reports Table rendering */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating report parameters...</p>
        ) : reportData.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No records found in this range.</p>
        ) : (
          <div className="table-container" style={{ margin: 0, border: 'none' }}>
            
            {/* Sales report table */}
            {activeReport === 'sales' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Billing Date</th>
                    <th>Customer / Shop Name</th>
                    <th style={{ textAlign: 'right' }}>Total Invoice Amount</th>
                    <th style={{ textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ textAlign: 'right' }}>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700 }}>{row.bill_number}</td>
                      <td>{row.invoice_date}</td>
                      <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{row.grand_total.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{row.paid_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-green-dark)', fontWeight: 700 }}>₹{row.net_profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Product wise report table */}
            {activeReport === 'products' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Vegetable Name</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Total Quantity Sold</th>
                    <th>Selling Unit</th>
                    <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                    <th style={{ textAlign: 'right' }}>Net Vegetable Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                      <td><span className="badge badge-success">{row.category}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.total_qty.toFixed(1)}</td>
                      <td>{row.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-green-dark)' }}>₹{row.total_revenue.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-orange-dark)' }}>₹{row.total_profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Customer wise report table */}
            {activeReport === 'customers' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Mobile</th>
                    <th>Place</th>
                    <th style={{ textAlign: 'center' }}>Total Bills Created</th>
                    <th style={{ textAlign: 'right' }}>Total Purchase Spent</th>
                    <th style={{ textAlign: 'right' }}>Total Paid Amount</th>
                    <th style={{ textAlign: 'right' }}>Outstanding Debt</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row.id}>
                      <td 
                        onClick={() => { setCustomerId(row.id); setView('customers'); }}
                        style={{ fontWeight: 700, color: 'var(--color-green-dark)', cursor: 'pointer' }}
                      >
                        {row.name}
                      </td>
                      <td>{row.mobile}</td>
                      <td>{row.place || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{row.total_bills || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(row.total_spent || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{(row.total_paid || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${row.outstanding_balance > 0 ? 'badge-warning' : 'badge-success'}`}>
                          ₹{row.outstanding_balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pending payment receivables report */}
            {activeReport === 'receivables' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Mobile</th>
                    <th>Place</th>
                    <th style={{ textAlign: 'right' }}>Outstanding Debt Amount (લેણું)</th>
                    <th>Last Purchase Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700 }}>{row.name}</td>
                      <td>{row.mobile}</td>
                      <td>{row.place || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-danger)' }}>₹{row.outstanding_balance.toFixed(2)}</td>
                      <td>{row.last_purchase_date || 'No history'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => { setCustomerId(row.id); setView('customers'); }}
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Clear Outstanding
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
