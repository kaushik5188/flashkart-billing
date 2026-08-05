const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const modalStart = content.indexOf('function DrillDownModal({ drillDown, onClose, fmt }) {');
if (modalStart === -1) {
  console.error("Could not find DrillDownModal");
  process.exit(1);
}

const beforeModal = content.substring(0, modalStart);

const newModalCode = `function DrillDownModal({ drillDown, onClose, fmt }) {
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
    let csv = columns.map(c => c.label).join(',') + '\\n';
    list.forEach(row => {
      const line = columns.map(c => {
        let val = row[c.key] || '';
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
         return \`\${parts[2]} \${m} \${parts[0]}\`;
      }
      return d;
    };
    
    const shortDt = (d) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length === 3) {
         const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1])-1];
         return \`\${parts[2]} \${m}\`;
      }
      return d;
    };

    const periodStr = days.length > 0 
      ? \`For Period: \${formatDt(days[0].date)} – \${formatDt(days[days.length-1].date)}\`
      : 'No data available for this period';

    return createPortal(
      <div className="modal-backdrop profit-report-container print-fullscreen">
        <style>{\`
          .profit-report-container .modal {
             width: 1000px !important;
             max-height: 90vh;
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
        \`}</style>

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
`;

fs.writeFileSync(file, beforeModal + newModalCode, 'utf8');
console.log('Successfully rewrote DrillDownModal');
