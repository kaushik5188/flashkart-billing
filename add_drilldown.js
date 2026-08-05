const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, 'backend', 'src', 'routes', 'reports.js');
let content = fs.readFileSync(reportsPath, 'utf8');

const drillDown = `
// GET Dashboard Drill-Down data
router.get('/dashboard-drilldown', verifyToken, async (req, res) => {
  const { type, startDate, endDate } = req.query;

  let dateFilter = '';
  let params = [];
  
  if (startDate && startDate !== 'all') {
    dateFilter += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate && endDate !== 'all') {
    dateFilter += ' AND date <= ?';
    params.push(endDate);
  }
  
  // Custom parsing for LIKE (e.g. month filtering)
  if (startDate && startDate.includes('%')) {
     dateFilter = ' AND date LIKE ?';
     params = [startDate];
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

if (!content.includes('/dashboard-drilldown')) {
  content = content.replace('module.exports = router;', drillDown + '\\nmodule.exports = router;');
  fs.writeFileSync(reportsPath, content, 'utf8');
  console.log('Appended drilldown to reports.js');
} else {
  console.log('Already appended');
}
