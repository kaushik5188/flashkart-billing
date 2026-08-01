const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Build a unified chronological ledger from all sources:
//   1. Manual ledger_entries (DEBIT / CREDIT)
//   2. Billing invoices (treated as DEBIT automatically)
//   3. customer_payments (treated as CREDIT automatically)
// Returns entries sorted ascending by date, with running_balance added.
async function buildUnifiedLedger(customerId, filters = {}) {
  const { startDate, endDate, type, search } = filters;

  // 1. Manual ledger entries
  let ledgerSql = `
    SELECT 
      le.id, le.entry_date as date, le.type, le.amount,
      le.payment_method, le.remark, le.added_by, le.source,
      le.reference_id, le.created_at,
      u.username as added_by_username
    FROM ledger_entries le
    LEFT JOIN users u ON le.user_id = u.id
    WHERE le.customer_id = ? AND le.is_deleted = 0
  `;
  let lParams = [customerId];

  if (startDate) { ledgerSql += ' AND le.entry_date >= ?'; lParams.push(startDate); }
  if (endDate)   { ledgerSql += ' AND le.entry_date <= ?'; lParams.push(endDate); }
  if (type)      { ledgerSql += ' AND le.type = ?';        lParams.push(type); }
  if (search)    { ledgerSql += ' AND (le.remark LIKE ? OR le.added_by LIKE ?)'; lParams.push(`%${search}%`, `%${search}%`); }

  const manualEntries = await query(ledgerSql, lParams);

  // 2. Billing invoices → DEBIT entries
  let invoiceSql = `
    SELECT 
      i.id, i.invoice_date as date, 'DEBIT' as type, i.grand_total as amount,
      i.payment_method, CONCAT('Invoice #', i.bill_number) as remark,
      'System' as added_by, 'BILLING' as source,
      i.bill_number as reference_id, i.created_at
    FROM invoices i
    WHERE i.customer_id = ?
  `;
  let iParams = [customerId];

  if (startDate) { invoiceSql += ' AND i.invoice_date >= ?'; iParams.push(startDate); }
  if (endDate)   { invoiceSql += ' AND i.invoice_date <= ?'; iParams.push(endDate); }
  if (type && type !== 'DEBIT') { iParams = null; } // Skip if only looking for credits
  if (search)    { invoiceSql += ' AND i.bill_number LIKE ?'; iParams.push(`%${search}%`); }

  let invoiceEntries = [];
  if (iParams !== null && (!type || type === 'DEBIT')) {
    invoiceEntries = await query(invoiceSql, iParams);
  }

  // 3. customer_payments → CREDIT entries
  let paymentSql = `
    SELECT 
      cp.id, cp.payment_date as date, 'CREDIT' as type, cp.amount,
      cp.payment_method, cp.remarks as remark,
      'System' as added_by, 'PAYMENT' as source,
      NULL as reference_id, cp.created_at
    FROM customer_payments cp
    WHERE cp.customer_id = ?
  `;
  let pParams = [customerId];

  if (startDate) { paymentSql += ' AND cp.payment_date >= ?'; pParams.push(startDate); }
  if (endDate)   { paymentSql += ' AND cp.payment_date <= ?'; pParams.push(endDate); }
  if (search)    { paymentSql += ' AND cp.remarks LIKE ?'; pParams.push(`%${search}%`); }

  let paymentEntries = [];
  if (!type || type === 'CREDIT') {
    paymentEntries = await query(paymentSql, pParams);
  }

  // Merge and sort ascending by date, then by created_at
  const all = [...manualEntries, ...invoiceEntries, ...paymentEntries]
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

  // Compute running balance
  let running = 0;
  const withBalance = all.map(entry => {
    if (entry.type === 'DEBIT')  running += parseFloat(entry.amount);
    if (entry.type === 'CREDIT') running -= parseFloat(entry.amount);
    return { ...entry, running_balance: parseFloat(running.toFixed(2)) };
  });

  return withBalance;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET unified ledger for a customer (with running balance)
router.get('/customer/:customerId', verifyToken, async (req, res) => {
  const { customerId } = req.params;
  const { startDate, endDate, type, search } = req.query;

  try {
    const customer = await query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customer.length === 0) return res.status(404).json({ error: 'Customer not found.' });

    const entries = await buildUnifiedLedger(customerId, { startDate, endDate, type, search });

    // Summary totals
    let totalDebit = 0, totalCredit = 0;
    entries.forEach(e => {
      if (e.type === 'DEBIT')  totalDebit  += parseFloat(e.amount);
      if (e.type === 'CREDIT') totalCredit += parseFloat(e.amount);
    });

    res.json({
      customer: customer[0],
      entries,
      summary: {
        totalDebit:  parseFloat(totalDebit.toFixed(2)),
        totalCredit: parseFloat(totalCredit.toFixed(2)),
        balance:     parseFloat((totalDebit - totalCredit).toFixed(2)),
        entryCount:  entries.length
      }
    });
  } catch (err) {
    console.error('Ledger fetch error:', err);
    res.status(500).json({ error: 'Error fetching customer ledger.' });
  }
});

// POST — Add a manual ledger entry (debit or credit)
router.post('/', verifyToken, async (req, res) => {
  const { customer_id, entry_date, type, amount, payment_method, remark } = req.body;

  if (!customer_id || !entry_date || !type || !amount) {
    return res.status(400).json({ error: 'Customer, date, type, and amount are required.' });
  }
  if (!['DEBIT', 'CREDIT'].includes(type)) {
    return res.status(400).json({ error: "Type must be 'DEBIT' or 'CREDIT'." });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  try {
    const customer = await query('SELECT name, outstanding_balance FROM customers WHERE id = ?', [customer_id]);
    if (customer.length === 0) return res.status(404).json({ error: 'Customer not found.' });

    // Insert ledger entry
    const result = await query(
      `INSERT INTO ledger_entries (customer_id, entry_date, type, amount, payment_method, remark, added_by, user_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL')`,
      [customer_id, entry_date, type, parsedAmount, payment_method || 'Cash', remark || '', req.user.username, req.user.id]
    );

    // Update customer outstanding balance
    const balanceDelta = type === 'DEBIT' ? parsedAmount : -parsedAmount;
    const newBalance = parseFloat((customer[0].outstanding_balance + balanceDelta).toFixed(2));
    await query('UPDATE customers SET outstanding_balance = ? WHERE id = ?', [newBalance, customer_id]);

    // Audit log
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      `LEDGER_${type}`,
      `${type} entry of ₹${parsedAmount} for ${customer[0].name} (ID:${customer_id}). Remark: ${remark || '-'}. New balance: ₹${newBalance}`
    ]);

    res.status(201).json({
      message: 'Ledger entry saved successfully.',
      id: result.insertId,
      newBalance
    });
  } catch (err) {
    console.error('Ledger entry error:', err);
    res.status(500).json({ error: 'Error saving ledger entry.' });
  }
});

// PUT — Edit a manual ledger entry (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can edit ledger entries.' });
  }
  const { id } = req.params;
  const { entry_date, type, amount, payment_method, remark } = req.body;

  try {
    const existing = await query('SELECT * FROM ledger_entries WHERE id = ? AND is_deleted = 0', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Entry not found.' });

    const old = existing[0];
    const parsedNewAmt = parseFloat(amount);

    // Recalculate customer balance delta: reverse old, apply new
    const customer = await query('SELECT outstanding_balance FROM customers WHERE id = ?', [old.customer_id]);
    let balance = customer[0].outstanding_balance;
    // Reverse old entry
    if (old.type === 'DEBIT')  balance -= parseFloat(old.amount);
    if (old.type === 'CREDIT') balance += parseFloat(old.amount);
    // Apply new entry
    if (type === 'DEBIT')  balance += parsedNewAmt;
    if (type === 'CREDIT') balance -= parsedNewAmt;
    balance = parseFloat(balance.toFixed(2));

    await query(
      `UPDATE ledger_entries SET entry_date=?, type=?, amount=?, payment_method=?, remark=? WHERE id=?`,
      [entry_date, type, parsedNewAmt, payment_method || 'Cash', remark || '', id]
    );
    await query('UPDATE customers SET outstanding_balance = ? WHERE id = ?', [balance, old.customer_id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'LEDGER_EDIT',
      `Edited entry ID ${id}: ${old.type}→${type}, ₹${old.amount}→₹${parsedNewAmt}`
    ]);

    res.json({ message: 'Entry updated.', newBalance: balance });
  } catch (err) {
    console.error('Edit ledger entry error:', err);
    res.status(500).json({ error: 'Error editing ledger entry.' });
  }
});

// DELETE — Soft-delete a manual entry (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete ledger entries.' });
  }
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM ledger_entries WHERE id = ? AND is_deleted = 0', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Entry not found or already deleted.' });

    const old = existing[0];
    // Reverse its effect on customer balance
    const customer = await query('SELECT outstanding_balance FROM customers WHERE id = ?', [old.customer_id]);
    let balance = customer[0].outstanding_balance;
    if (old.type === 'DEBIT')  balance -= parseFloat(old.amount);
    if (old.type === 'CREDIT') balance += parseFloat(old.amount);
    balance = parseFloat(balance.toFixed(2));

    await query('UPDATE ledger_entries SET is_deleted = 1 WHERE id = ?', [id]);
    await query('UPDATE customers SET outstanding_balance = ? WHERE id = ?', [balance, old.customer_id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'LEDGER_DELETE',
      `Soft-deleted ledger entry ID ${id}: ${old.type} ₹${old.amount} for customer ID ${old.customer_id}`
    ]);

    res.json({ message: 'Entry deleted.', newBalance: balance });
  } catch (err) {
    console.error('Delete ledger entry error:', err);
    res.status(500).json({ error: 'Error deleting ledger entry.' });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

// GET Daily Ledger Report — all entries for a given date
router.get('/reports/daily', verifyToken, async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    // Manual entries
    const manual = await query(`
      SELECT le.*, c.name as customer_name, c.mobile as customer_mobile, u.username as added_by_username
      FROM ledger_entries le
      JOIN customers c ON le.customer_id = c.id
      LEFT JOIN users u ON le.user_id = u.id
      WHERE le.entry_date = ? AND le.is_deleted = 0
      ORDER BY le.created_at ASC
    `, [targetDate]);

    // Billing invoices for the day
    const invoices = await query(`
      SELECT i.id, i.invoice_date as entry_date, 'DEBIT' as type, i.grand_total as amount,
             i.payment_method, i.bill_number as reference_id, c.name as customer_name, c.mobile as customer_mobile,
             'Invoice' as source
      FROM invoices i JOIN customers c ON i.customer_id = c.id
      WHERE i.invoice_date = ?
      ORDER BY i.created_at ASC
    `, [targetDate]);

    // Payments for the day
    const payments = await query(`
      SELECT cp.id, cp.payment_date as entry_date, 'CREDIT' as type, cp.amount,
             cp.payment_method, cp.remarks as remark, c.name as customer_name, c.mobile as customer_mobile,
             'Payment' as source
      FROM customer_payments cp JOIN customers c ON cp.customer_id = c.id
      WHERE cp.payment_date = ?
      ORDER BY cp.created_at ASC
    `, [targetDate]);

    const all = [...manual.map(e => ({...e, source: e.source || 'MANUAL'})), ...invoices, ...payments]
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    const totalDebit  = all.filter(e => e.type === 'DEBIT').reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalCredit = all.filter(e => e.type === 'CREDIT').reduce((s, e) => s + parseFloat(e.amount), 0);

    res.json({ date: targetDate, entries: all, totalDebit, totalCredit, netCollection: totalCredit });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ error: 'Error generating daily report.' });
  }
});

// GET Outstanding balances report
router.get('/reports/outstanding', verifyToken, async (req, res) => {
  try {
    const list = await query(`
      SELECT id, name, mobile, place, address, gst_number, outstanding_balance, 
             total_purchases, last_purchase_date, created_at
      FROM customers 
      WHERE outstanding_balance > 0 
      ORDER BY outstanding_balance DESC
    `);
    const total = list.reduce((s, c) => s + parseFloat(c.outstanding_balance), 0);
    res.json({ customers: list, totalOutstanding: parseFloat(total.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching outstanding report.' });
  }
});

// GET Collection report (credits received in date range)
router.get('/reports/collection', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    // Manual CREDIT entries
    let manSql = `
      SELECT le.id, le.entry_date as date, le.amount, le.payment_method, le.remark,
             c.name as customer_name, c.mobile, 'MANUAL' as source, u.username as added_by
      FROM ledger_entries le
      JOIN customers c ON le.customer_id = c.id
      LEFT JOIN users u ON le.user_id = u.id
      WHERE le.type = 'CREDIT' AND le.is_deleted = 0
    `;
    let mParams = [];
    if (startDate) { manSql += ' AND le.entry_date >= ?'; mParams.push(startDate); }
    if (endDate)   { manSql += ' AND le.entry_date <= ?'; mParams.push(endDate); }
    manSql += ' ORDER BY le.entry_date DESC';

    // customer_payments
    let paySql = `
      SELECT cp.id, cp.payment_date as date, cp.amount, cp.payment_method, cp.remarks as remark,
             c.name as customer_name, c.mobile, 'PAYMENT' as source, 'System' as added_by
      FROM customer_payments cp JOIN customers c ON cp.customer_id = c.id WHERE 1=1
    `;
    let pParams = [];
    if (startDate) { paySql += ' AND cp.payment_date >= ?'; pParams.push(startDate); }
    if (endDate)   { paySql += ' AND cp.payment_date <= ?'; pParams.push(endDate); }
    paySql += ' ORDER BY cp.payment_date DESC';

    const [manual, payments] = await Promise.all([
      query(manSql, mParams),
      query(paySql, pParams)
    ]);

    const all = [...manual, ...payments].sort((a, b) => b.date.localeCompare(a.date));
    const total = all.reduce((s, e) => s + parseFloat(e.amount), 0);

    res.json({ entries: all, totalCollection: parseFloat(total.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: 'Error generating collection report.' });
  }
});

// GET Customer ledger print data (full history, no date filter)
router.get('/reports/customer-statement/:customerId', verifyToken, async (req, res) => {
  const { customerId } = req.params;
  try {
    const customer = await query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customer.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    const entries = await buildUnifiedLedger(customerId);
    let totalDebit = 0, totalCredit = 0;
    entries.forEach(e => {
      if (e.type === 'DEBIT')  totalDebit  += parseFloat(e.amount);
      if (e.type === 'CREDIT') totalCredit += parseFloat(e.amount);
    });
    res.json({
      customer: customer[0], entries,
      summary: {
        totalDebit:  parseFloat(totalDebit.toFixed(2)),
        totalCredit: parseFloat(totalCredit.toFixed(2)),
        balance:     parseFloat((totalDebit - totalCredit).toFixed(2))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error generating customer statement.' });
  }
});

module.exports = router;
