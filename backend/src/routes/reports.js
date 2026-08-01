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

    // 3. Today's Expenses
    const todayExp = await query('SELECT SUM(amount) as total FROM expenses WHERE date = ?', [todayStr]);
    const expensesToday = todayExp[0].total || 0;

    // 4. Today's Profit Calculation (Gross Margin from Sales - Expenses)
    const todayGrossMargin = await query(`
      SELECT SUM((ii.rate - ii.purchase_rate) * ii.quantity) as gross_profit
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.invoice_date = ?
    `, [todayStr]);
    const profitToday = (todayGrossMargin[0].gross_profit || 0) - expensesToday;

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
      profitToday,
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
    
    // 1. Sales and Gross Profit
    const salesSql = isYear ? 
      `SELECT SUBSTR(i.invoice_date, 1, 7) as label, SUM(i.grand_total) as sales, SUM(ii.amount - (ii.purchase_rate * ii.quantity)) as profit FROM invoices i JOIN invoice_items ii ON i.id = ii.invoice_id WHERE i.invoice_date LIKE ? GROUP BY label ORDER BY label DESC` :
      `SELECT i.invoice_date as label, SUM(i.grand_total) as sales, SUM(ii.amount - (ii.purchase_rate * ii.quantity)) as profit FROM invoices i JOIN invoice_items ii ON i.id = ii.invoice_id GROUP BY label ORDER BY label DESC ${limitClause}`;
    
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
        if (!merged[row.label]) merged[row.label] = { label: row.label, sales: 0, profit: 0, purchases: 0, expenses: 0 };
        if (key1) merged[row.label][key1] = row[key1] || 0;
        if (key2) merged[row.label][key2] = row[key2] || 0;
      });
    };

    addData(salesData, 'sales', 'profit');
    addData(purchasesData, 'purchases', null);
    addData(expData, 'expenses', null);

    // Sort ascending for chart (chronological)
    let finalData = Object.values(merged).sort((a, b) => a.label.localeCompare(b.label));

    // Calculate true net profit = gross profit - expenses
    finalData = finalData.map(d => ({
      ...d,
      profit: d.profit - d.expenses
    }));

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

module.exports = router;
