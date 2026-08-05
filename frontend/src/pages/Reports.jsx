import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Search, 
  Calendar,
  FileSpreadsheet,
  Printer,
  Printer,
  ShoppingCart,
  Wallet,
  Receipt,
  CreditCard,
  Percent
} from 'lucide-react';

export default function Reports({ token, API_URL, setCustomerId, setView }) {
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'products', 'purchases', 'expenses', 'customers', 'receivables'
  
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
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
      let url = '';
      if (activeReport === 'sales') {
        url = `${API_URL}/api/reports/sales-profit-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'products') {
        url = `${API_URL}/api/reports/products-sales-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'purchases') {
        // Purchases doesn't have a dedicated report endpoint with date filters yet, but we'll fetch all and filter in frontend for now to save time
        url = `${API_URL}/api/purchases`;
      } else if (activeReport === 'expenses') {
        url = `${API_URL}/api/expenses/reports/category?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'customers') {
        url = `${API_URL}/api/reports/customers-sales-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'receivables') {
        url = `${API_URL}/api/reports/receivables-report`;
      } else if (activeReport === 'payments') {
        url = `${API_URL}/api/reports/payments-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeReport === 'discounts') {
        url = `${API_URL}/api/reports/discounts-report?startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error loading report data.');
      let data = await res.json();

      // Client side filtering for endpoints that don't support it natively yet
      if (activeReport === 'purchases') {
        data = data.filter(p => p.purchase_date >= startDate && p.purchase_date <= endDate);
      }

      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const getSummaryMetrics = () => {
    let salesTotal = 0;
    let profitTotal = 0;
    let quantityTotal = 0;
    let count = reportData.length;

    if (activeReport === 'sales') {
      reportData.forEach(r => { salesTotal += r.grand_total; profitTotal += r.net_profit; });
    } else if (activeReport === 'products') {
      reportData.forEach(r => { salesTotal += r.total_revenue; profitTotal += r.total_profit; quantityTotal += r.total_qty; });
    } else if (activeReport === 'purchases') {
      reportData.forEach(r => { salesTotal += r.grand_total; quantityTotal += parseFloat(r.quantity || 0); });
    } else if (activeReport === 'expenses') {
      reportData.forEach(r => { salesTotal += r.total; });
    } else if (activeReport === 'customers') {
      reportData.forEach(r => { salesTotal += r.total_spent || 0; profitTotal += r.outstanding_balance || 0; });
    } else if (activeReport === 'receivables') {
      reportData.forEach(r => { salesTotal += r.outstanding_balance; });
    } else if (activeReport === 'payments') {
      reportData.forEach(r => { salesTotal += r.amount_received; profitTotal += (r.discount || 0); });
    } else if (activeReport === 'discounts') {
      reportData.forEach(r => { salesTotal += r.discount; });
    }

    return { salesTotal, profitTotal, quantityTotal, count };
  };

  const metrics = getSummaryMetrics();

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
    } else if (activeReport === 'purchases') {
      headers = ["Date", "Supplier", "Product", "Quantity", "Rate", "Total (Rs)"];
      rows = reportData.map(r => [r.purchase_date, r.supplier_name, r.product_name, r.quantity, r.purchase_rate, r.grand_total]);
    } else if (activeReport === 'expenses') {
      headers = ["Category", "Total Spent (Rs)"];
      rows = reportData.map(r => [r.category, r.total]);
    } else if (activeReport === 'customers') {
      headers = ["Customer Name", "Mobile", "Place", "Bills Count", "Total Spent (Rs)", "Outstanding (Rs)"];
      rows = reportData.map(r => [r.name, r.mobile, r.place, r.total_bills, r.total_spent, r.outstanding_balance]);
    } else if (activeReport === 'receivables') {
      headers = ["Customer Name", "Mobile", "Place", "Outstanding Debt (Rs)", "Last Purchase"];
      rows = reportData.map(r => [r.name, r.mobile, r.place, r.outstanding_balance, r.last_purchase_date || 'N/A']);
    }

    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `flashkart_${activeReport}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmt = (v) => `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="page-container animate-fade">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Enterprise Reports Hub</h1>
          <p className="page-subtitle">Generate, audit, and export comprehensive business reports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportToCSV} className="btn btn-secondary">
            <FileSpreadsheet size={16} color="var(--color-green)" /> Export CSV (Excel)
          </button>
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={16} /> Print Report
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
        {[
          { id: 'sales', icon: TrendingUp, label: 'Sales & Profit' },
          { id: 'products', icon: BarChart3, label: 'Vegetable Sales' },
          { id: 'purchases', icon: ShoppingCart, label: 'Purchases' },
          { id: 'expenses', icon: Wallet, label: 'Expenses' },
          { id: 'customers', icon: Users, label: 'Customer wise' },
          { id: 'receivables', icon: AlertTriangle, label: 'Pending Payments' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className="btn"
            style={{
              backgroundColor: activeReport === tab.id ? 'var(--color-green-light)' : 'transparent',
              color: activeReport === tab.id ? 'var(--color-green-dark)' : 'var(--text-main)',
              border: activeReport === tab.id ? '1px solid var(--color-green)' : '1px solid var(--border-light)',
              fontWeight: activeReport === tab.id ? 700 : 500,
              padding: '0.5rem 1rem'
            }}
          >
            <tab.icon size={16} /> {tab.label}
      <div className="glass-card" style={{ padding: '0.5rem', display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '1.5rem', whiteSpace: 'nowrap' }}>
        <button className={`btn ${activeReport === 'sales' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('sales')}>
          <BarChart3 size={15}/> Sales Summary
        </button>
        <button className={`btn ${activeReport === 'products' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('products')}>
          <ShoppingCart size={15}/> Products Analysis
        </button>
        <button className={`btn ${activeReport === 'customers' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('customers')}>
          <Users size={15}/> Customer Sales
        </button>
        <button className={`btn ${activeReport === 'receivables' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('receivables')}>
          <AlertTriangle size={15}/> Outstanding (Receivables)
        </button>
        <button className={`btn ${activeReport === 'payments' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('payments')}>
          <CreditCard size={15}/> Payments Collection
        </button>
        <button className={`btn ${activeReport === 'discounts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('discounts')}>
          <Percent size={15}/> Discounts Given
        </button>
        <button className={`btn ${activeReport === 'purchases' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('purchases')}>
          <Wallet size={15}/> Purchases/Expenses
        </button>
      </div>

      {/* Date Filters */}
      {activeReport !== 'receivables' && (
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '250px' }}>
            <label style={{ fontSize: '0.85rem' }}>Start Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input type="date" className="input" style={{ paddingLeft: '34px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '250px' }}>
            <label style={{ fontSize: '0.85rem' }}>End Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input type="date" className="input" style={{ paddingLeft: '34px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Records</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.count}</div>
        </div>
        
        {['sales', 'customers'].includes(activeReport) && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Sales/Spent</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green)' }}>{fmt(metrics.salesTotal)}</div>
          </div>
        )}

        {['purchases', 'expenses'].includes(activeReport) && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Outflow</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(metrics.salesTotal)}</div>
          </div>
        )}

        {['sales', 'products'].includes(activeReport) && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Net Profit</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6A1B9A' }}>{fmt(metrics.profitTotal)}</div>
          </div>
        )}

        {['receivables', 'customers'].includes(activeReport) && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Pending Payments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange)' }}>{fmt(activeReport === 'customers' ? metrics.profitTotal : metrics.salesTotal)}</div>
          </div>
        )}

        {['products', 'purchases'].includes(activeReport) && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Quantity</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.quantityTotal.toFixed(1)}</div>
          </div>
        )}

        {activeReport === 'receivables' && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Receivables</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(metrics.salesTotal)}</h3>
          </div>
        )}
        {activeReport === 'payments' && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Received</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-green)' }}>{fmt(metrics.salesTotal)}</h3>
          </div>
        )}
        {activeReport === 'discounts' && (
          <div className="card stat-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Discounts</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange)' }}>{fmt(metrics.salesTotal)}</h3>
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table" style={{ fontSize: '0.9rem' }}>
            <thead>
              {activeReport === 'sales' && (
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Customer Name</th>
                  <th style={{ textAlign: 'right' }}>Grand Total</th>
                  <th style={{ textAlign: 'right' }}>Paid Amount</th>
                  <th style={{ textAlign: 'right', color: '#6A1B9A' }}>Net Profit</th>
                </tr>
              )}
              {activeReport === 'products' && (
                <tr>
                  <th>Vegetable Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Total Revenue</th>
                  <th style={{ textAlign: 'right', color: '#6A1B9A' }}>Net Profit</th>
                </tr>
              )}
              {activeReport === 'purchases' && (
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                </tr>
              )}
              {activeReport === 'expenses' && (
                <tr>
                  <th>Expense Category</th>
                  <th style={{ textAlign: 'right' }}>Total Spent</th>
                </tr>
              )}
              {activeReport === 'customers' && (
                <tr>
                  <th>Customer Name</th>
                  <th>Contact & Place</th>
                  <th style={{ textAlign: 'center' }}>Total Bills</th>
                  <th style={{ textAlign: 'right' }}>Total Spent</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                </tr>
              )}
              {activeReport === 'receivables' && (
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Place</th>
                  <th>Last Activity Date</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              )}
              {activeReport === 'payments' && (
                <tr>
                  <th>Date</th>
                  <th>Bill / Ref</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Amount Received</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                </tr>
              )}
              {activeReport === 'discounts' && (
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Customer</th>
                  <th>Bill Amount</th>
                  <th style={{ textAlign: 'right' }}>Discount Given</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Loading report data...</td></tr>
              ) : error ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>{error}</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No records found for the selected period.</td></tr>
              ) : (
                reportData.map((item, idx) => (
                  <tr key={idx} className="hover-row">
                    {activeReport === 'sales' && (
                      <>
                        <td>{item.invoice_date}</td>
                        <td style={{ fontWeight: 600 }}>{item.bill_number}</td>
                        <td>{item.customer_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.grand_total)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{fmt(item.paid_amount)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#6A1B9A' }}>{fmt(item.net_profit)}</td>
                      </>
                    )}
                    {activeReport === 'products' && (
                      <>
                        <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                        <td><span className="badge badge-success">{item.category}</span></td>
                        <td style={{ textAlign: 'right' }}>{item.total_qty} {item.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.total_revenue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#6A1B9A' }}>{fmt(item.total_profit)}</td>
                      </>
                    )}
                    {activeReport === 'purchases' && (
                      <>
                        <td>{item.purchase_date}</td>
                        <td style={{ fontWeight: 600 }}>{item.supplier_name || '-'}</td>
                        <td>{item.product_name || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{item.quantity} @ ₹{item.purchase_rate}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-orange-dark)' }}>{fmt(item.grand_total)}</td>
                      </>
                    )}
                    {activeReport === 'expenses' && (
                      <>
                        <td style={{ fontWeight: 600 }}>{item.category}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>{fmt(item.total)}</td>
                      </>
                    )}
                    {activeReport === 'customers' && (
                      <>
                        <td style={{ fontWeight: 600, color: 'var(--color-green)' }}>{item.name}</td>
                        <td>
                          <div>{item.mobile}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.place || '-'}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>{item.total_bills} bills</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.total_spent)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: (item.outstanding_balance > 0) ? 'var(--color-danger)' : 'inherit' }}>
                          {fmt(item.outstanding_balance)}
                        </td>
                      </>
                    )}
                    {activeReport === 'receivables' && (
                      <>
                        <td style={{ fontWeight: 700 }}>{item.name}</td>
                        <td>{item.mobile}</td>
                        <td>{item.place || '-'}</td>
                        <td>{item.last_purchase_date || 'Never'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                          {fmt(item.outstanding_balance)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => setCustomerId(item.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            View Ledger
                          </button>
                        </td>
                      </>
                    )}
                    {activeReport === 'payments' && (
                      <>
                        <td>{item.payment_date}</td>
                        <td style={{ fontWeight: 700 }}>{item.bill_number ? `${item.bill_number}` : (item.reference_number || '-')}</td>
                        <td>{item.customer_name}</td>
                        <td><span className="badge badge-info">{item.payment_method}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-green)' }}>
                          {fmt(item.amount_received)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {item.discount > 0 ? fmt(item.discount) : '-'}
                        </td>
                      </>
                    )}
                    {activeReport === 'discounts' && (
                      <>
                        <td>{item.date}</td>
                        <td>
                          <span className={`badge ${item.type === 'Bill Discount' ? 'badge-warning' : 'badge-primary'}`}>
                            {item.type}
                          </span>
                          {item.bill_number && <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{item.bill_number}</div>}
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.customer_name}</td>
                        <td>{fmt(item.grand_total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-orange)' }}>
                          {fmt(item.discount)}
                        </td>
                      </>
                    )}
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
