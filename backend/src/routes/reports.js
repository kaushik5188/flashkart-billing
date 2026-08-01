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

    // 2. Monthly Sales
    const monthlySales = await query('SELECT SUM(grand_total) as total FROM invoices WHERE invoice_date LIKE ?', [currentMonthStr]);
    const salesThisMonth = monthlySales[0].total || 0;

    // 3. Total Customers
    const totalCust = await query('SELECT COUNT(*) as count FROM customers');
    const custCount = totalCust[0].count || 0;

    // 4. Pending Payments (unpaid outstanding customer balances)
    const pendingPay = await query('SELECT SUM(outstanding_balance) as total FROM customers WHERE outstanding_balance > 0');
    const outstandingTotal = pendingPay[0].total || 0;

    // 5. Today's Bills count
    const todayBills = await query('SELECT COUNT(*) as count FROM invoices WHERE invoice_date = ?', [todayStr]);
    const billsToday = todayBills[0].count || 0;

    // 6. Total Bills count
    const totalBills = await query('SELECT COUNT(*) as count FROM invoices');
    const billsCount = totalBills[0].count || 0;

    // 7. Recent active customers
    const recentCustomers = await query(
      'SELECT id, name, mobile, place, last_purchase_date, outstanding_balance FROM customers ORDER BY last_purchase_date DESC LIMIT 5'
    );

    // 8. Best selling vegetables (Top 5)
    const bestSellers = await query(`
      SELECT product_name, SUM(quantity) as total_qty, SUM(amount) as total_revenue
      FROM invoice_items
      GROUP BY product_id, product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    // 9. Low stock alerts notification count
    const lowStockResult = await query('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_alert');
    const lowStockCount = lowStockResult[0].count || 0;

    // 10. Today's Collections (credits received today — ledger + customer_payments)
    const todayCollLedger = await query(
      "SELECT SUM(amount) as total FROM ledger_entries WHERE type='CREDIT' AND entry_date=? AND is_deleted=0",
      [todayStr]
    );
    const todayCollPayments = await query(
      'SELECT SUM(amount) as total FROM customer_payments WHERE payment_date=?',
      [todayStr]
    );
    const todayCollections = (todayCollLedger[0].total || 0) + (todayCollPayments[0].total || 0);

    // 11. Total transactions (ledger entries + billing invoices + customer_payments)
    const totalLedger   = await query('SELECT COUNT(*) as count FROM ledger_entries WHERE is_deleted=0');
    const totalPayments = await query('SELECT COUNT(*) as count FROM customer_payments');
    const totalTransactions = (totalLedger[0].count || 0) + (totalPayments[0].count || 0) + (billsCount || 0);

    res.json({
      salesToday,
      salesThisMonth,
      custCount,
      outstandingTotal,
      billsToday,
      billsCount,
      recentCustomers,
      bestSellers,
      lowStockCount,
      todayCollections,
      totalTransactions
    });
  } catch (err) {
    console.error('Dashboard stats fetch failed:', err);
    res.status(500).json({ error: 'Error generating dashboard statistics.' });
  }
});

// GET sales and profit graph coords (for charting)
router.get('/charts', verifyToken, async (req, res) => {
  const { range } = req.query; // 'week', 'month', 'year'
  try {
    let sql = '';
    let params = [];
    
    // Group invoices to render data points
    if (range === 'year') {
      // Monthly aggregate for current year
      const yearStr = new Date().getFullYear().toString() + '%';
      sql = `
        SELECT SUBSTR(i.invoice_date, 1, 7) as label, 
               SUM(i.grand_total) as sales,
               SUM(ii.amount - (p.purchase_price * ii.quantity)) as profit
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        WHERE i.invoice_date LIKE ?
        GROUP BY label
        ORDER BY label ASC
      `;
      params = [yearStr];
    } else {
      // Default to last 30 days
      sql = `
        SELECT i.invoice_date as label,
               SUM(i.grand_total) as sales,
               SUM(ii.amount - (p.purchase_price * ii.quantity)) as profit
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        GROUP BY label
        ORDER BY label DESC
        LIMIT 30
      `;
    }

    const data = await query(sql, params);
    
    // If we limit 30 labels, we return them in ascending order for charting
    if (range !== 'year') {
      data.reverse();
    }
    
    res.json(data);
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
             SUM(ii.amount - (p.purchase_price * ii.quantity)) as net_profit
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN invoice_items ii ON i.id = ii.invoice_id
      JOIN products p ON ii.product_id = p.id
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
             SUM(ii.amount - (p.purchase_price * ii.quantity)) as total_profit
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
