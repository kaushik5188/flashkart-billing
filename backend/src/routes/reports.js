const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// GET Dashboard statistics
router.get('/dashboard-stats', verifyToken, async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7) + '%'; // 'YYYY-MM%'

  try {
    // 1. Today's Sales
    const todaySales = await query('SELECT SUM(grand_total) as total FROM invoices WHERE invoice_date = ?', [todayStr]);
    const salesToday = todaySales[0].total || 0;

    // 2. Today's Purchases
    const todayPurchases = await query('SELECT SUM(grand_total) as total FROM purchase_invoices WHERE purchase_date = ?', [todayStr]);
    const purchasesToday = todayPurchases[0].total || 0;

    // 3. Today's Expenses (Purchase Bills + Business Expenses)
    const todayExp = await query('SELECT SUM(amount) as total FROM expenses WHERE date = ?', [todayStr]);
    const businessExpensesToday = todayExp[0].total || 0;
    const expensesToday = purchasesToday + businessExpensesToday;

    // 4. Today's Profit Calculation (Sales - Expenses)
    // First, find discount given during payment collection today
    const todayPayDisc = await query('SELECT SUM(discount) as total FROM payments WHERE payment_date = ?', [todayStr]);
    const paymentDiscountToday = todayPayDisc[0].total || 0;
    
    // Also find today's total collections
    const todayColl = await query('SELECT SUM(amount_received) as total FROM payments WHERE payment_date = ?', [todayStr]);
    const collectionsToday = todayColl[0].total || 0;

    const profitToday = salesToday - expensesToday - paymentDiscountToday;

    // 4b. Monthly stats calculation
    const monthSalesQ = await query('SELECT SUM(grand_total) as total FROM invoices WHERE invoice_date LIKE ?', [currentMonthStr]);
    const monthSales = monthSalesQ[0].total || 0;

    const monthPurchasesQ = await query('SELECT SUM(grand_total) as total FROM purchase_invoices WHERE purchase_date LIKE ?', [currentMonthStr]);
    const monthPurchases = monthPurchasesQ[0].total || 0;

    const monthExpQ = await query('SELECT SUM(amount) as total FROM expenses WHERE date LIKE ?', [currentMonthStr]);
    const monthlyBusinessExpenses = monthExpQ[0].total || 0;
    const monthlyExpenses = monthPurchases + monthlyBusinessExpenses;

    const monthPayDisc = await query('SELECT SUM(discount) as total FROM payments WHERE payment_date LIKE ?', [currentMonthStr]);
    const paymentDiscountMonthly = monthPayDisc[0].total || 0;

    const monthlyProfit = monthSales - monthlyExpenses - paymentDiscountMonthly;

    // 5. Current Stock Value
    const stockValQuery = await query('SELECT SUM(stock_quantity * average_purchase_rate) as value FROM products WHERE stock_quantity > 0');
    const stockValue = stockValQuery[0].value || 0;

    // 6. Total Customers
    const totalCust = await query('SELECT COUNT(*) as count FROM customers');
    const custCount = totalCust[0].count || 0;

    // 7. Pending Payments (unpaid outstanding customer balances)
    const pendingPay = await query('SELECT SUM(outstanding_balance) as total FROM customers WHERE outstanding_balance > 0');
    const outstandingTotal = pendingPay[0].total || 0;

    // 8. Today's Bills count
    const todayBills = await query('SELECT COUNT(*) as count FROM invoices WHERE invoice_date = ?', [todayStr]);
    const billsToday = todayBills[0].count || 0;

    // 9. Total Bills count
    const totalBills = await query('SELECT COUNT(*) as count FROM invoices');
    const billsCount = totalBills[0].count || 0;

    // 10. Recent active customers
    const recentCustomers = await query(
      'SELECT id, name, mobile, place, last_purchase_date, outstanding_balance FROM customers ORDER BY last_purchase_date DESC LIMIT 5'
    );

    // 11. Best selling vegetables (Top 5)
    const bestSellers = await query(`
      SELECT product_name, SUM(quantity) as total_qty, SUM(amount) as total_revenue
      FROM invoice_items
      GROUP BY product_id, product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    // 12. Low stock alerts notification count
    const lowStockResult = await query('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_alert');
    const lowStockCount = lowStockResult[0].count || 0;

    res.json({
      salesToday,
      purchasesToday,
      expensesToday,
      collectionsToday,
      profitToday,
      monthlyExpenses,
      monthlyProfit,
      stockValue,
      custCount,
      outstandingTotal,
      billsToday,
      billsCount,
      recentCustomers,
      bestSellers,
      lowStockCount
    });
  } catch (err) {
    console.error('Dashboard stats fetch failed:', err);
    res.status(500).json({ error: 'Error generating dashboard statistics.' });
  }
});

// GET sales, purchases, expenses and profit graph coords (for charting)
router.get('/charts', verifyToken, async (req, res) => {
  const { range } = req.query; // 'week', 'month', 'year'
  try {
    const isYear = range === 'year';
    const limitClause = isYear ? '' : 'LIMIT 30';
    
    // 1. Sales
    const salesSql = isYear ? 
      `SELECT SUBSTR(invoice_date, 1, 7) as label, SUM(grand_total) as sales FROM invoices WHERE invoice_date LIKE ? GROUP BY label ORDER BY label DESC` :
      `SELECT invoice_date as label, SUM(grand_total) as sales FROM invoices GROUP BY label ORDER BY label DESC ${limitClause}`;
    
    const params = isYear ? [new Date().getFullYear().toString() + '%'] : [];
    const salesData = await query(salesSql, params);

    // 2. Purchases
    const purchasesSql = isYear ?
      `SELECT SUBSTR(purchase_date, 1, 7) as label, SUM(grand_total) as purchases FROM purchase_invoices WHERE purchase_date LIKE ? GROUP BY label ORDER BY label DESC` :
      `SELECT purchase_date as label, SUM(grand_total) as purchases FROM purchase_invoices GROUP BY label ORDER BY label DESC ${limitClause}`;
    const purchasesData = await query(purchasesSql, params);

    // 3. Expenses
    const expSql = isYear ?
      `SELECT SUBSTR(date, 1, 7) as label, SUM(amount) as expenses FROM expenses WHERE date LIKE ? GROUP BY label ORDER BY label DESC` :
      `SELECT date as label, SUM(amount) as expenses FROM expenses GROUP BY label ORDER BY label DESC ${limitClause}`;
    const expData = await query(expSql, params);

    // Merge in Node
    const merged = {};
    const addData = (data, key1, key2) => {
      data.forEach(row => {
        if (!merged[row.label]) merged[row.label] = { label: row.label, sales: 0, purchases: 0, expenses: 0 };
        if (key1) merged[row.label][key1] = row[key1] || 0;
        if (key2) merged[row.label][key2] = row[key2] || 0;
      });
    };

    addData(salesData, 'sales', null);
    addData(purchasesData, 'purchases', null);
    addData(expData, 'expenses', null);

    // Sort ascending for chart (chronological)
    let finalData = Object.values(merged).sort((a, b) => a.label.localeCompare(b.label));

    // Calculate true cashflow profit = sales - expenses
    // Expenses here is combined (Purchases + Business Expenses)
    finalData = finalData.map(d => {
      const sales = d.sales || 0;
      const purchases = d.purchases || 0;
      const businessExpenses = d.expenses || 0;
      const combinedExpenses = purchases + businessExpenses;
      
      return {
        ...d,
        expenses: combinedExpenses,
        profit: sales - combinedExpenses
      };
    });

    res.json(finalData);
  } catch (err) {
    console.error('Chart points generator failed:', err);
    res.status(500).json({ error: 'Error generating chart data.' });
  }
});

// GET Detailed Sales and Profit reports (filtered by dates)
router.get('/sales-profit-report', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT i.id, i.bill_number, i.invoice_date, i.grand_total, i.paid_amount, i.remaining_amount,
             c.name as customer_name,
             SUM(ii.amount - (ii.purchase_rate * ii.quantity)) as net_profit
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE 1=1
    `;
    let params = [];

    if (startDate) {
      sql += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY i.id ORDER BY i.invoice_date DESC';
    const report = await query(sql, params);
    res.json(report);
  } catch (err) {
    console.error('Sales profit report fetch failed:', err);
    res.status(500).json({ error: 'Error generating profit report.' });
  }
});

// GET Product-wise sales breakdown report
router.get('/products-sales-report', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT ii.product_id, ii.product_name, p.category, p.unit,
             SUM(ii.quantity) as total_qty,
             SUM(ii.amount) as total_revenue,
             SUM(ii.amount - (ii.purchase_rate * ii.quantity)) as total_profit
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE 1=1
    `;
    let params = [];

    if (startDate) {
      sql += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY ii.product_id, ii.product_name ORDER BY total_revenue DESC';
    const report = await query(sql, params);
    res.json(report);
  } catch (err) {
    console.error('Product report fetch failed:', err);
    res.status(500).json({ error: 'Error generating product wise sales report.' });
  }
});

// GET Customer-wise sales breakdown report
router.get('/customers-sales-report', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT c.id, c.name, c.mobile, c.place,
             COUNT(i.id) as total_bills,
             SUM(i.grand_total) as total_spent,
             SUM(i.paid_amount) as total_paid,
             c.outstanding_balance
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE 1=1
    `;
    let params = [];

    if (startDate) {
      sql += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY c.id ORDER BY total_spent DESC';
    const report = await query(sql, params);
    res.json(report);
  } catch (err) {
    console.error('Customer report fetch failed:', err);
    res.status(500).json({ error: 'Error generating customer wise sales report.' });
  }
});

// GET Outstanding balance receivables report (Pending Payments)
router.get('/receivables-report', verifyToken, async (req, res) => {
  try {
    const list = await query(
      'SELECT id, name, mobile, place, outstanding_balance, last_purchase_date FROM customers WHERE outstanding_balance > 0 ORDER BY outstanding_balance DESC'
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching pending payments report.' });
  }
});


// GET Payments Collection Report
router.get('/payments-report', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT p.*, c.name as customer_name, i.bill_number 
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.bill_id = i.id
      WHERE 1=1
    `;
    let params = [];
    if (startDate) { sql += ' AND p.payment_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND p.payment_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY p.payment_date DESC';
    const list = await query(sql, params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching payments report.' });
  }
});

// GET Discounts Report
router.get('/discounts-report', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT i.id, i.bill_number, i.invoice_date as date, c.name as customer_name, i.grand_total, i.discount, 'Bill Discount' as type
      FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.discount > 0
    `;
    let params = [];
    if (startDate) { sql += ' AND i.invoice_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND i.invoice_date <= ?'; params.push(endDate); }
    
    let sqlPay = `
      SELECT p.id, i.bill_number, p.payment_date as date, c.name as customer_name, p.amount_received as grand_total, p.discount, 'Payment Discount' as type
      FROM payments p JOIN customers c ON p.customer_id = c.id LEFT JOIN invoices i ON p.bill_id = i.id WHERE p.discount > 0
    `;
    let payParams = [];
    if (startDate) { sqlPay += ' AND p.payment_date >= ?'; payParams.push(startDate); }
    if (endDate) { sqlPay += ' AND p.payment_date <= ?'; payParams.push(endDate); }

    const bills = await query(sql, params);
    const pays = await query(sqlPay, payParams);
    
    const list = [...bills, ...pays].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching discounts report.' });
  }
});

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
      data = await query(`
        SELECT i.id, i.bill_number as billNo, i.invoice_date as date, c.name as customer, i.total_weight as totalWeight, i.grand_total as amount, i.paid_amount as paidAmount, i.remaining_amount as pendingAmount, i.payment_method as paymentStatus
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE 1=1 ${invoiceDateFilter}
        ORDER BY i.id DESC
      `, params);
    } else if (type === 'purchases') {
      data = await query(`
        SELECT p.id, p.id as purchaseNo, p.purchase_date as date, p.supplier_name as supplier, p.grand_total as amount
        FROM purchase_invoices p
        WHERE 1=1 ${purchaseDateFilter}
        ORDER BY p.id DESC
      `, params);
    } else if (type === 'business_expenses') {
      data = await query(`
        SELECT id, date, category, remark as description, amount
        FROM expenses
        WHERE 1=1 ${dateFilter}
        ORDER BY id DESC
      `, params);
    } else if (type === 'pending_payments') {
      data = await query(`
        SELECT id, name as customer, mobile as phone, place as city, outstanding_balance as pendingAmount, last_purchase_date as lastPurchase
        FROM customers
        WHERE outstanding_balance > 0
        ORDER BY outstanding_balance DESC
      `);
    } else if (type === 'customers') {
      data = await query(`
        SELECT id, name as customer, mobile as phone, place as city, outstanding_balance as outstanding, last_purchase_date as lastPurchase
        FROM customers
        ORDER BY name ASC
      `);
    } else if (type === 'bills') {
      data = await query(`
        SELECT i.id, i.bill_number as billNo, i.invoice_date as date, c.name as customer, i.grand_total as amount
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE 1=1 ${invoiceDateFilter}
        ORDER BY i.id DESC
      `, params);
    }
    res.json(data);
  } catch (err) {
    console.error('Dashboard drilldown fetch failed:', err);
    res.status(500).json({ error: 'Error generating dashboard drilldown.' });
  }
});
module.exports = router;
