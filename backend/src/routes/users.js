const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// Admin-only middleware
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// GET all users (admin only)
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users.' });
  }
});

// POST Create new user (admin only)
router.post('/', verifyToken, adminOnly, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'staff'." });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, role, pin_for_reset, status) VALUES (?, ?, ?, ?, ?)',
      [username, hash, role || 'staff', '1234', 'active']
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'USER_CREATE',
      `Admin ${req.user.username} created user: ${username} (role: ${role})`
    ]);

    res.status(201).json({ message: 'User created successfully.', id: result.insertId });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Error creating user.' });
  }
});

// PUT Update user role or status (admin only)
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { role, status, password } = req.body;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot modify your own account via this endpoint.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

    if (role)   await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    if (status) await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'USER_UPDATE',
      `Updated user ID ${id}: role=${role || 'unchanged'}, status=${status || 'unchanged'}`
    ]);

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Error updating user.' });
  }
});

// DELETE — Deactivate user (admin only, never hard-delete)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }
  try {
    const users = await query('SELECT username FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

    await query("UPDATE users SET status = 'inactive' WHERE id = ?", [id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'USER_DEACTIVATE',
      `Deactivated user: ${users[0].username} (ID: ${id})`
    ]);

    res.json({ message: 'User deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deactivating user.' });
  }
});

module.exports = router;
