const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, 'backend', 'src', 'routes', 'reports.js');
let content = fs.readFileSync(reportsPath, 'utf8');

const newStats = `
// GET Dashboard statistics
router.get('/dashboard-stats', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  let params = [];
  if (startDate) {
    dateFilter += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND date <= ?';
    params.push(endDate);
  }

  const invoiceDateFilter = dateFilter.replace(/date/g, 'invoice_date');
  const purchaseDateFilter = dateFilter.replace(/date/g, 'purchase_date');

  try {
    // 1. Sales
    const salesQ = await query(\`SELECT SUM(grand_total) as total FROM invoices WHERE 1=1 \${invoiceDateFilter}\`, params);
    const periodSales = salesQ[0].total || 0;

    // 2. Purchases
    const purchaseQ = await query(\`SELECT SUM(grand_total) as total FROM purchase_invoices WHERE 1=1 \${purchaseDateFilter}\`, params);
    const periodPurchases = purchaseQ[0].total || 0;

    // 3. Business Expenses
    const expQ = await query(\`SELECT SUM(amount) as total FROM expenses WHERE 1=1 \${dateFilter}\`, params);
    const periodBusinessExpenses = expQ[0].total || 0;
    const periodTotalExpenses = periodPurchases + periodBusinessExpenses;

    // 4. Profit
    const periodProfit = periodSales - periodTotalExpenses;

    // 5. Total Customers
    const totalCust = await query('SELECT COUNT(*) as count FROM customers');
    const custCount = totalCust[0].count || 0;

    // 6. Pending Payments
    const pendingPay = await query('SELECT SUM(outstanding_balance) as total FROM customers WHERE outstanding_balance > 0');
    const outstandingTotal = pendingPay[0].total || 0;

    // 7. Bills count
    const billsQ = await query(\`SELECT COUNT(*) as count FROM invoices WHERE 1=1 \${invoiceDateFilter}\`, params);
    const billsCount = billsQ[0].count || 0;

    res.json({
      salesToday: periodSales,
      purchasesToday: periodPurchases,
      expensesToday: periodTotalExpenses,
      businessExpenses: periodBusinessExpenses,
      profitToday: periodProfit,
      monthlyExpenses: periodTotalExpenses,
      monthlyProfit: periodProfit,
      custCount,
      outstandingTotal,
      billsToday: billsCount,
      billsCount: billsCount,
      stockValue: 0, 
      recentCustomers: [],
      bestSellers: [],
      lowStockCount: 0
    });
  } catch (err) {
    console.error('Dashboard stats fetch failed:', err);
    res.status(500).json({ error: 'Error generating dashboard statistics.' });
  }
});
`;

// Extract everything from `// GET sales, purchases, expenses and profit graph coords` to the end.
const splitContent = content.split('// GET sales, purchases, expenses and profit graph coords (for charting)');
const topPart = splitContent[0].substring(0, splitContent[0].indexOf('// GET Dashboard statistics'));

const drillDown = `
// GET Dashboard Drill-Down data
router.get('/dashboard-drilldown', verifyToken, async (req, res) => {
  const { type, startDate, endDate } = req.query;

  let dateFilter = '';
  let params = [];
  if (startDate) {
    dateFilter += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND date <= ?';
    params.push(endDate);
  }
  const invoiceDateFilter = dateFilter.replace(/date/g, 'invoice_date');
  const purchaseDateFilter = dateFilter.replace(/date/g, 'purchase_date');

  try {
    let data = [];
    if (type === 'sales') {
      data = await query(\`
        SELECT i.id, i.bill_number as billNo, i.invoice_date as date, c.name as customer, i.total_weight as totalWeight, i.grand_total as amount, i.paid_amount as paidAmount, i.remaining_amount as pendingAmount, i.payment_method as paymentStatus
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE 1=1 \${invoiceDateFilter}
        ORDER BY i.id DESC
      \`, params);
    } else if (type === 'purchases') {
      data = await query(\`
        SELECT p.id, p.id as purchaseNo, p.purchase_date as date, p.supplier_name as supplier, p.grand_total as amount
        FROM purchase_invoices p
        WHERE 1=1 \${purchaseDateFilter}
        ORDER BY p.id DESC
      \`, params);
    } else if (type === 'business_expenses') {
      data = await query(\`
        SELECT id, date, category, remark as description, amount
        FROM expenses
        WHERE 1=1 \${dateFilter}
        ORDER BY id DESC
      \`, params);
    } else if (type === 'pending_payments') {
      data = await query(\`
        SELECT id, name as customer, mobile as phone, place as city, outstanding_balance as pendingAmount, last_purchase_date as lastPurchase
        FROM customers
        WHERE outstanding_balance > 0
        ORDER BY outstanding_balance DESC
      \`);
    } else if (type === 'customers') {
      data = await query(\`
        SELECT id, name as customer, mobile as phone, place as city, outstanding_balance as outstanding, last_purchase_date as lastPurchase
        FROM customers
        ORDER BY name ASC
      \`);
    } else if (type === 'bills') {
      data = await query(\`
        SELECT i.id, i.bill_number as billNo, i.invoice_date as date, c.name as customer, i.grand_total as amount
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE 1=1 \${invoiceDateFilter}
        ORDER BY i.id DESC
      \`, params);
    }
    res.json(data);
  } catch (err) {
    console.error('Dashboard drilldown fetch failed:', err);
    res.status(500).json({ error: 'Error generating dashboard drilldown.' });
  }
});

`;

const newContent = topPart + newStats + '\\n// GET sales, purchases, expenses and profit graph coords (for charting)' + splitContent[1].replace('module.exports = router;', drillDown + '\\nmodule.exports = router;');

fs.writeFileSync(reportsPath, newContent, 'utf8');
console.log('Successfully updated reports.js');
