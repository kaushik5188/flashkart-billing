const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// ─── File upload setup ────────────────────────────────────────────────────────
const expenseUploadDir = path.join(__dirname, '../../uploads/expenses');
if (!fs.existsSync(expenseUploadDir)) fs.mkdirSync(expenseUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, expenseUploadDir),
  filename:    (req, file, cb) => cb(null, `bill_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ─── PARTNER CRUD ─────────────────────────────────────────────────────────────

// GET all active partners
router.get('/partners', verifyToken, async (req, res) => {
  try {
    const partners = await query(
      'SELECT * FROM partners WHERE is_active = 1 ORDER BY id ASC'
    );
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching partners.' });
  }
});

// POST create new partner (admin only)
router.post('/partners', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { name, mobile, color, avatar_initials } = req.body;
  if (!name) return res.status(400).json({ error: 'Partner name is required.' });

  try {
    const initials = avatar_initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const result = await query(
      'INSERT INTO partners (name, mobile, color, avatar_initials, is_active, total_contribution) VALUES (?, ?, ?, ?, 1, 0)',
      [name, mobile || '', color || '#2E7D32', initials]
    );
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'PARTNER_CREATE', `Created partner: ${name}`]);
    res.status(201).json({ message: 'Partner created.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating partner.' });
  }
});

// PUT update partner
router.put('/partners/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { id } = req.params;
  const { name, mobile, color } = req.body;
  try {
    const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : undefined;
    await query(
      'UPDATE partners SET name = COALESCE(?, name), mobile = COALESCE(?, mobile), color = COALESCE(?, color), avatar_initials = COALESCE(?, avatar_initials) WHERE id = ?',
      [name || null, mobile || null, color || null, initials || null, id]
    );
    res.json({ message: 'Partner updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating partner.' });
  }
});

// DELETE deactivate partner (admin only)
router.delete('/partners/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { id } = req.params;
  try {
    await query('UPDATE partners SET is_active = 0 WHERE id = ?', [id]);
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'PARTNER_DEACTIVATE', `Deactivated partner ID ${id}`]);
    res.json({ message: 'Partner deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deactivating partner.' });
  }
});

// ─── EXPENSE CRUD ─────────────────────────────────────────────────────────────

// GET all expenses (with rich filters)
router.get('/', verifyToken, async (req, res) => {
  const { partner_id, category, startDate, endDate, search, limit = 50, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT pe.*, p.name as partner_name, p.color as partner_color, p.avatar_initials
      FROM partner_expenses pe
      JOIN partners p ON pe.partner_id = p.id
      WHERE pe.is_deleted = 0
    `;
    const params = [];

    if (partner_id) { sql += ' AND pe.partner_id = ?'; params.push(partner_id); }
    if (category)   { sql += ' AND pe.category = ?';   params.push(category); }
    if (startDate)  { sql += ' AND pe.expense_date >= ?'; params.push(startDate); }
    if (endDate)    { sql += ' AND pe.expense_date <= ?'; params.push(endDate); }
    if (search) {
      sql += ' AND (p.name LIKE ? OR pe.vendor_name LIKE ? OR pe.market_name LIKE ? OR pe.remark LIKE ? OR pe.category LIKE ?)';
      const w = `%${search}%`;
      params.push(w, w, w, w, w);
    }

    sql += ' ORDER BY pe.expense_date DESC, pe.created_at DESC';

    const total = await query(`SELECT COUNT(*) as cnt FROM (${sql}) t`, params);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const expenses = await query(sql, params);
    res.json({ expenses, total: total[0].cnt });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Error fetching expenses.' });
  }
});

// GET single expense
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT pe.*, p.name as partner_name, p.color as partner_color FROM partner_expenses pe
       JOIN partners p ON pe.partner_id = p.id WHERE pe.id = ? AND pe.is_deleted = 0`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Expense not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching expense.' });
  }
});

// POST create new expense
router.post('/', verifyToken, async (req, res) => {
  const { partner_id, expense_date, amount, category, market_name, vendor_name, payment_method, remark, bill_photo } = req.body;

  if (!partner_id || !expense_date || !amount || !category) {
    return res.status(400).json({ error: 'Partner, date, amount, and category are required.' });
  }
  const parsedAmt = parseFloat(amount);
  if (isNaN(parsedAmt) || parsedAmt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  try {
    const partner = await query('SELECT name FROM partners WHERE id = ? AND is_active = 1', [partner_id]);
    if (!partner.length) return res.status(404).json({ error: 'Partner not found.' });

    const result = await query(
      `INSERT INTO partner_expenses 
       (partner_id, expense_date, amount, category, market_name, vendor_name, payment_method, remark, bill_photo, added_by, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [partner_id, expense_date, parsedAmt, category,
       market_name || '', vendor_name || '', payment_method || 'Cash',
       remark || '', bill_photo || '', req.user.username, req.user.id]
    );

    // Update partner's total contribution
    await query('UPDATE partners SET total_contribution = total_contribution + ? WHERE id = ?', [parsedAmt, partner_id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'EXPENSE_CREATE',
       `${req.user.username} recorded expense of ₹${parsedAmt} by ${partner[0].name} for ${category}`]);

    res.status(201).json({ message: 'Expense saved successfully.', id: result.insertId });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Error saving expense.' });
  }
});

// PUT update expense (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { id } = req.params;
  const { expense_date, amount, category, market_name, vendor_name, payment_method, remark } = req.body;

  try {
    const existing = await query('SELECT * FROM partner_expenses WHERE id = ? AND is_deleted = 0', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Expense not found.' });

    const old = existing[0];
    const parsedAmt = parseFloat(amount);

    // Recalculate partner total: reverse old, add new
    const delta = parsedAmt - parseFloat(old.amount);
    await query(
      `UPDATE partner_expenses 
       SET expense_date=?, amount=?, category=?, market_name=?, vendor_name=?, payment_method=?, remark=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [expense_date, parsedAmt, category, market_name || '', vendor_name || '', payment_method || 'Cash', remark || '', id]
    );
    await query('UPDATE partners SET total_contribution = total_contribution + ? WHERE id = ?', [delta, old.partner_id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'EXPENSE_EDIT', `Edited expense ID ${id}: ₹${old.amount}→₹${parsedAmt}`]);

    res.json({ message: 'Expense updated.' });
  } catch (err) {
    console.error('Edit expense error:', err);
    res.status(500).json({ error: 'Error editing expense.' });
  }
});

// DELETE soft-delete expense (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM partner_expenses WHERE id = ? AND is_deleted = 0', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Expense not found.' });

    await query('UPDATE partner_expenses SET is_deleted = 1 WHERE id = ?', [id]);
    await query('UPDATE partners SET total_contribution = total_contribution - ? WHERE id = ?',
      [existing[0].amount, existing[0].partner_id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'EXPENSE_DELETE', `Deleted expense ID ${id}: ₹${existing[0].amount}`]);

    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting expense.' });
  }
});

// POST upload bill photo
router.post('/upload-bill', verifyToken, upload.single('bill'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const filePath = `/uploads/expenses/${req.file.filename}`;
  res.json({ message: 'Bill uploaded.', path: filePath });
});

// ─── DASHBOARD & REPORTS ──────────────────────────────────────────────────────

// GET dashboard statistics
router.get('/reports/dashboard', verifyToken, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7) + '%';

  try {
    // Today's total
    const todayResult = await query(
      "SELECT SUM(amount) as total, COUNT(*) as cnt FROM partner_expenses WHERE expense_date=? AND is_deleted=0",
      [today]
    );

    // This month total
    const monthResult = await query(
      "SELECT SUM(amount) as total FROM partner_expenses WHERE expense_date LIKE ? AND is_deleted=0",
      [month]
    );

    // Per-partner contributions
    const perPartner = await query(`
      SELECT p.id, p.name, p.color, p.avatar_initials,
             COALESCE(SUM(pe.amount), 0) as total_contribution,
             COALESCE(SUM(CASE WHEN pe.expense_date=? THEN pe.amount ELSE 0 END), 0) as today_amount,
             COALESCE(SUM(CASE WHEN pe.expense_date LIKE ? THEN pe.amount ELSE 0 END), 0) as month_amount,
             COUNT(pe.id) as tx_count
      FROM partners p
      LEFT JOIN partner_expenses pe ON p.id=pe.partner_id AND pe.is_deleted=0
      WHERE p.is_active=1
      GROUP BY p.id
      ORDER BY total_contribution DESC
    `, [today, month]);

    // Category breakdown (this month)
    const categories = await query(`
      SELECT category, SUM(amount) as total, COUNT(*) as cnt
      FROM partner_expenses
      WHERE expense_date LIKE ? AND is_deleted=0
      GROUP BY category ORDER BY total DESC
    `, [month]);

    // Recent 10 expenses
    const recent = await query(`
      SELECT pe.*, p.name as partner_name, p.color as partner_color, p.avatar_initials
      FROM partner_expenses pe JOIN partners p ON pe.partner_id=p.id
      WHERE pe.is_deleted=0
      ORDER BY pe.expense_date DESC, pe.created_at DESC LIMIT 10
    `);

    // Monthly trend (last 6 months)
    const trend = await query(`
      SELECT SUBSTR(expense_date,1,7) as month, SUM(amount) as total
      FROM partner_expenses WHERE is_deleted=0
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);

    res.json({
      todayTotal: todayResult[0].total || 0,
      todayCount: todayResult[0].cnt || 0,
      monthTotal: monthResult[0].total || 0,
      perPartner,
      categories,
      recent,
      trend: trend.reverse()
    });
  } catch (err) {
    console.error('Expense dashboard error:', err);
    res.status(500).json({ error: 'Error fetching dashboard data.' });
  }
});

// GET partner-wise full ledger
router.get('/reports/partner/:partnerId', verifyToken, async (req, res) => {
  const { partnerId } = req.params;
  const { startDate, endDate, category, search } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7) + '%';
  const year  = today.substring(0, 4) + '%';

  try {
    const partner = await query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (!partner.length) return res.status(404).json({ error: 'Partner not found.' });

    // Summary stats
    const stats = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_all,
        COALESCE(SUM(CASE WHEN expense_date=? THEN amount ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN expense_date LIKE ? THEN amount ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN expense_date LIKE ? THEN amount ELSE 0 END), 0) as this_year,
        COUNT(*) as total_tx
      FROM partner_expenses WHERE partner_id=? AND is_deleted=0
    `, [today, month, year, partnerId]);

    // Filtered transactions
    let sql = `SELECT * FROM partner_expenses WHERE partner_id=? AND is_deleted=0`;
    const params = [partnerId];
    if (startDate) { sql += ' AND expense_date >= ?'; params.push(startDate); }
    if (endDate)   { sql += ' AND expense_date <= ?'; params.push(endDate); }
    if (category)  { sql += ' AND category = ?'; params.push(category); }
    if (search) {
      sql += ' AND (vendor_name LIKE ? OR market_name LIKE ? OR remark LIKE ?)';
      const w = `%${search}%`;
      params.push(w, w, w);
    }
    sql += ' ORDER BY expense_date DESC, created_at DESC';

    const expenses = await query(sql, params);

    // Category summary
    const catSummary = await query(`
      SELECT category, SUM(amount) as total, COUNT(*) as cnt
      FROM partner_expenses WHERE partner_id=? AND is_deleted=0
      GROUP BY category ORDER BY total DESC
    `, [partnerId]);

    res.json({ partner: partner[0], stats: stats[0], expenses, catSummary });
  } catch (err) {
    console.error('Partner ledger error:', err);
    res.status(500).json({ error: 'Error fetching partner ledger.' });
  }
});

// GET daily report
router.get('/reports/daily', verifyToken, async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const expenses = await query(`
      SELECT pe.*, p.name as partner_name, p.color as partner_color, p.avatar_initials
      FROM partner_expenses pe JOIN partners p ON pe.partner_id=p.id
      WHERE pe.expense_date=? AND pe.is_deleted=0
      ORDER BY pe.created_at ASC
    `, [targetDate]);

    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const byPartner = {};
    expenses.forEach(e => {
      if (!byPartner[e.partner_name]) byPartner[e.partner_name] = 0;
      byPartner[e.partner_name] += parseFloat(e.amount);
    });

    res.json({ date: targetDate, expenses, total, byPartner });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching daily report.' });
  }
});

// GET monthly report
router.get('/reports/monthly', verifyToken, async (req, res) => {
  const { year, month } = req.query;
  const y = year || new Date().getFullYear();
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `${y}-${m}%`;

  try {
    const expenses = await query(`
      SELECT pe.*, p.name as partner_name, p.color as partner_color, p.avatar_initials
      FROM partner_expenses pe JOIN partners p ON pe.partner_id=p.id
      WHERE pe.expense_date LIKE ? AND pe.is_deleted=0
      ORDER BY pe.expense_date ASC
    `, [prefix]);

    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    // Daily breakdown
    const byDay = {};
    expenses.forEach(e => {
      if (!byDay[e.expense_date]) byDay[e.expense_date] = 0;
      byDay[e.expense_date] += parseFloat(e.amount);
    });

    res.json({ year: y, month: m, expenses, total, byDay });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching monthly report.' });
  }
});

// GET category-wise report
router.get('/reports/category', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT pe.category, SUM(pe.amount) as total, COUNT(*) as cnt,
             GROUP_CONCAT(DISTINCT p.name) as partners
      FROM partner_expenses pe JOIN partners p ON pe.partner_id=p.id
      WHERE pe.is_deleted=0
    `;
    const params = [];
    if (startDate) { sql += ' AND pe.expense_date >= ?'; params.push(startDate); }
    if (endDate)   { sql += ' AND pe.expense_date <= ?'; params.push(endDate); }
    sql += ' GROUP BY pe.category ORDER BY total DESC';

    const data = await query(sql, params);
    const grandTotal = data.reduce((s, r) => s + parseFloat(r.total), 0);
    res.json({ categories: data, grandTotal });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching category report.' });
  }
});

// GET market/vendor-wise report
router.get('/reports/market', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT COALESCE(NULLIF(pe.market_name,''), 'Unknown Market') as market,
             COALESCE(NULLIF(pe.vendor_name,''), 'Unknown Vendor') as vendor,
             SUM(pe.amount) as total, COUNT(*) as cnt
      FROM partner_expenses pe WHERE pe.is_deleted=0
    `;
    const params = [];
    if (startDate) { sql += ' AND pe.expense_date >= ?'; params.push(startDate); }
    if (endDate)   { sql += ' AND pe.expense_date <= ?'; params.push(endDate); }
    sql += ' GROUP BY market, vendor ORDER BY total DESC';

    const data = await query(sql, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching market report.' });
  }
});

module.exports = router;
