const fs = require('fs');
const path = require('path');

const originalPath = path.join(__dirname, 'original_Dashboard.jsx');
const targetPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.jsx');

let original = fs.readFileSync(originalPath, 'utf8');

// 1. Add new imports (X, Search, Printer, Download, ChevronLeft, ChevronRight)
original = original.replace(
  "} from 'lucide-react';",
  "  X,\\n  Search,\\n  Printer,\\n  Download,\\n  ChevronLeft,\\n  ChevronRight\\n} from 'lucide-react';"
);

// 2. Add state for DrillDown Modal
const stateInsert = `
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
           fetch(\`\${API_URL}/api/reports/dashboard-drilldown?type=sales&startDate=\${startDate}&endDate=\${endDate}\`, { headers: { 'Authorization': \`Bearer \${token}\` } }),
           fetch(\`\${API_URL}/api/reports/dashboard-drilldown?type=purchases&startDate=\${startDate}&endDate=\${endDate}\`, { headers: { 'Authorization': \`Bearer \${token}\` } }),
           fetch(\`\${API_URL}/api/reports/dashboard-drilldown?type=business_expenses&startDate=\${startDate}&endDate=\${endDate}\`, { headers: { 'Authorization': \`Bearer \${token}\` } })
         ]);
         const sales = await salesRes.json();
         const purchases = await purchRes.json();
         const expenses = await expRes.json();
         setDrillDown({ type, title, loading: false, data: { sales, purchases, expenses } });
      } else {
        const res = await fetch(\`\${API_URL}/api/reports/dashboard-drilldown?type=\${type}&startDate=\${startDate}&endDate=\${endDate}\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
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
`;
original = original.replace("useEffect(() => {", stateInsert + "\\n  useEffect(() => {");

// 3. Update StatCard component
original = original.replace(
  "const StatCard = ({ title, value, icon: Icon, color, lightColor }) => (",
  "const StatCard = ({ title, value, icon: Icon, color, lightColor, onClick }) => ("
);
original = original.replace(
  "className=\"card stat-card\" style={{ padding: '1.5rem', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}",
  "className=\"card stat-card\" onClick={onClick} style={{ padding: '1.5rem', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}"
);

// 4. Update KPI cards usage
original = original.replace(
  /<StatCard title="Today's Sales" /g,
  "<StatCard onClick={() => handleCardClick('sales', \\\"Today's Sales\\\", 'today')} title=\\\"Today's Sales\\\" "
);
original = original.replace(
  /<StatCard title="Today's Purchase" /g,
  "<StatCard onClick={() => handleCardClick('purchases', \\\"Today's Purchase\\\", 'today')} title=\\\"Today's Purchase\\\" "
);
original = original.replace(
  /<StatCard title="Today's Expenses" /g,
  "<StatCard onClick={() => handleCardClick('business_expenses', \\\"Today's Expenses\\\", 'today')} title=\\\"Today's Expenses\\\" "
);
original = original.replace(
  /<StatCard title="Today's Profit" /g,
  "<StatCard onClick={() => handleCardClick('profit', \\\"Today's Profit\\\", 'today')} title=\\\"Today's Profit\\\" "
);
original = original.replace(
  /<StatCard title="Monthly Expenses" /g,
  "<StatCard onClick={() => handleCardClick('monthly_expenses', \\\"Monthly Expenses\\\", 'month')} title=\\\"Monthly Expenses\\\" "
);
original = original.replace(
  /<StatCard title="Monthly Profit" /g,
  "<StatCard onClick={() => handleCardClick('profit', \\\"Monthly Profit\\\", 'month')} title=\\\"Monthly Profit\\\" "
);
original = original.replace(
  /<StatCard title="Total Customers" /g,
  "<StatCard onClick={() => handleCardClick('customers', \\\"Total Customers\\\", 'all')} title=\\\"Total Customers\\\" "
);
original = original.replace(
  /<StatCard title="Total Bills Today" /g,
  "<StatCard onClick={() => handleCardClick('bills', \\\"Total Bills Today\\\", 'today')} title=\\\"Total Bills Today\\\" "
);
original = original.replace(
  /<StatCard title="Pending Payments" /g,
  "<StatCard onClick={() => handleCardClick('pending_payments', \\\"Pending Payments\\\", 'all')} title=\\\"Pending Payments\\\" "
);

// 5. Add Modal component rendering at the end of return
const modalRender = `
      {drillDown && (
        <DrillDownModal 
          drillDown={drillDown}
          onClose={() => setDrillDown(null)}
          fmt={fmt}
        />
      )}
`;
original = original.replace(
  "      </div>\\n    </div>\\n  );\\n}",
  "      </div>\\n" + modalRender + "    </div>\\n  );\\n}"
);

// 6. Append DrillDownModal code
const drillDownCode = `
// ---------------------------------------------------------
// Drill-Down Modal Component
// ---------------------------------------------------------

function DrillDownModal({ drillDown, onClose, fmt }) {
  const { title, type, data, loading } = drillDown;
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal" style={{ width: '800px', padding: '2rem', textAlign: 'center' }}>
          <p>Loading detailed data...</p>
        </div>
      </div>
    );
  }

  const handleExport = (list, columns) => {
    let csv = columns.map(c => c.label).join(',') + '\\n';
    list.forEach(row => {
      const line = columns.map(c => {
        let val = row[c.key] || '';
        if (c.isCurrency) val = val;
        return \`"\${String(val).replace(/"/g, '""')}"\`;
      }).join(',');
      csv += line + '\\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${title}_Export.csv\`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (type === 'profit' || type === 'monthly_expenses') {
    const { sales, purchases, expenses } = data;
    const totalSales = sales.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalPurchases = purchases.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    return (
      <div className="modal-backdrop print-fullscreen">
        <div className="modal" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header hide-on-print">
            <h3>{title} Calculation</h3>
            <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
          
          <div className="modal-body print-padding" style={{ overflowY: 'auto' }}>
            <div className="hide-on-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16}/> Print</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-app)', borderRadius: '12px' }}>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Formula</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Sales</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-green)' }}>{fmt(totalSales)}</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Purchases</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-orange)' }}>{fmt(totalPurchases)}</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Business Expenses</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{fmt(totalExpenses)}</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Net Profit</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#6A1B9A' }}>{fmt(netProfit)}</div>
                </div>
              </div>
            </div>

            <h4>1. Sales Bills ({sales.length})</h4>
            <table className="table" style={{ marginBottom: '2rem' }}>
              <thead><tr><th>Date</th><th>Bill No</th><th>Customer</th><th>Amount</th></tr></thead>
              <tbody>
                {sales.map(s => <tr key={s.id}><td>{s.date}</td><td>{s.billNo}</td><td>{s.customer}</td><td>{fmt(s.amount)}</td></tr>)}
              </tbody>
            </table>

            <h4>2. Purchase Bills ({purchases.length})</h4>
            <table className="table" style={{ marginBottom: '2rem' }}>
              <thead><tr><th>Date</th><th>Purchase No</th><th>Supplier</th><th>Amount</th></tr></thead>
              <tbody>
                {purchases.map(p => <tr key={p.id}><td>{p.date}</td><td>{p.purchaseNo}</td><td>{p.supplier}</td><td>{fmt(p.amount)}</td></tr>)}
              </tbody>
            </table>

            <h4>3. Business Expenses ({expenses.length})</h4>
            <table className="table" style={{ marginBottom: '2rem' }}>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
              <tbody>
                {expenses.map(e => <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.description}</td><td>{fmt(e.amount)}</td></tr>)}
                {expenses.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded.</td></tr>}
              </tbody>
            </table>

          </div>
        </div>
      </div>
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

  return (
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
    </div>
  );
}
`;

original += "\\n" + drillDownCode;

fs.writeFileSync(targetPath, original, 'utf8');
console.log('Restored Dashboard with DrillDown features.');
