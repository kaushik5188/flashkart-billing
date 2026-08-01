const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flashkart_secret_key_2026';

// Middleware to protect routes
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// Admin Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username and password.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE username = ? AND status = ?', [username, 'active']);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' } // Long session for business convenience
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Forgot Password (Reset via security PIN)
router.post('/forgot-password', async (req, res) => {
  const { username, pin, newPassword } = req.body;

  if (!username || !pin || !newPassword) {
    return res.status(400).json({ error: 'Please enter username, security reset PIN, and new password.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Username not found.' });
    }

    const user = users[0];
    if (user.pin_for_reset !== pin) {
      return res.status(403).json({ error: 'Incorrect security reset PIN.' });
    }

    // Hash and update password
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    // Log action
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      user.id,
      'PASSWORD_RESET_PIN',
      `Password reset via PIN for user: ${username}`
    ]);

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Internal server error resetting password.' });
  }
});

// Change Password (Requires Authenticated Session)
router.post('/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Please enter old password and new password.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Incorrect old password.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      user.id,
      'PASSWORD_CHANGE',
      `Password updated by user: ${user.username}`
    ]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error changing password.' });
  }
});

// Get Current Profile Details
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const users = await query('SELECT id, username, role, pin_for_reset, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching profile.' });
  }
});

// Update Security PIN
router.post('/update-pin', verifyToken, async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) {
    return res.status(400).json({ error: 'Security PIN must be at least 4 digits.' });
  }
  try {
    await query('UPDATE users SET pin_for_reset = ? WHERE id = ?', [pin, req.user.id]);
    res.json({ message: 'Security PIN updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating security PIN.' });
  }
});

module.exports = {
  router,
  verifyToken
};
