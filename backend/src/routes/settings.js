const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, dbType } = require('../db/db');
const { verifyToken } = require('./auth');

// Multer setup for logo uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'company-logo' + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET all settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await query('SELECT * FROM settings');
    // Convert array of key-value into a single object
    const config = {};
    list.forEach(row => {
      config[row.setting_key] = row.setting_value;
    });
    res.json(config);
  } catch (err) {
    console.error('Fetch settings failed:', err);
    res.status(500).json({ error: 'Error fetching settings.' });
  }
});

// POST save bulk settings
router.post('/', verifyToken, async (req, res) => {
  const settingsObj = req.body;
  try {
    for (const [key, value] of Object.entries(settingsObj)) {
      // Check if setting exists
      const existing = await query('SELECT * FROM settings WHERE setting_key = ?', [key]);
      if (existing.length > 0) {
        await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [String(value), key]);
      } else {
        await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, String(value)]);
      }
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'SETTINGS_UPDATE',
      'System settings updated'
    ]);

    res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('Save settings failed:', err);
    res.status(500).json({ error: 'Error saving settings.' });
  }
});

// POST upload logo
router.post('/upload-logo', verifyToken, upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file provided.' });
  }
  
  const logoPath = `/uploads/${req.file.filename}`;
  try {
    const key = 'company_logo';
    const existing = await query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    if (existing.length > 0) {
      await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [logoPath, key]);
    } else {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, logoPath]);
    }

    res.json({ message: 'Logo uploaded successfully.', logo_path: logoPath });
  } catch (err) {
    console.error('Logo upload DB sync failed:', err);
    res.status(500).json({ error: 'Error mapping logo path to settings.' });
  }
});

// --- DATABASE BACKUP AND RESTORE ---

// GET Export Database Backup (JSON format, database-agnostic)
router.get('/backup/export', verifyToken, async (req, res) => {
  try {
    const backupData = {};
    const tables = [
      'users', 'customers', 'products', 'invoices', 'invoice_items',
      'inventory_transactions', 'settings', 'customer_payments', 'suppliers', 'supplier_purchases'
    ];

    for (const table of tables) {
      try {
        const rows = await query(`SELECT * FROM ${table}`);
        backupData[table] = rows;
      } catch (tableErr) {
        // Table might not exist yet, ignore or set empty
        backupData[table] = [];
      }
    }

    res.setHeader('Content-disposition', `attachment; filename=flashkart_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2));
    res.end();
  } catch (err) {
    console.error('Backup export failed:', err);
    res.status(500).json({ error: 'Failed to generate database export.' });
  }
});

// POST Import Database Backup (JSON format)
router.post('/backup/import', verifyToken, async (req, res) => {
  const { backupData } = req.body;
  if (!backupData || typeof backupData !== 'object') {
    return res.status(400).json({ error: 'Invalid backup format. Expected backup JSON object.' });
  }

  try {
    const tables = [
      'users', 'customers', 'products', 'invoices', 'invoice_items',
      'inventory_transactions', 'settings', 'customer_payments', 'suppliers', 'supplier_purchases'
    ];

    // Verify critical tables are present in backup
    if (!backupData.users || !backupData.customers || !backupData.products) {
      return res.status(400).json({ error: 'Missing critical tables in backup. Import canceled.' });
    }

    console.log('Restoring database tables...');
    for (const table of tables) {
      const rows = backupData[table] || [];
      
      // Truncate table
      await query(`DELETE FROM ${table}`);
      
      if (rows.length === 0) continue;

      // Build dynamic bulk insert query
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await query(sql, values);
      }
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'RESTORE_BACKUP',
      'System database restored from JSON backup.'
    ]);

    res.json({ message: 'Database restored successfully. Please refresh the page.' });
  } catch (err) {
    console.error('Backup import failed:', err);
    res.status(500).json({ error: 'Error importing backup. Database may be in an inconsistent state.' });
  }
});

// GET Activity Logs (Audit Trail)
router.get('/logs', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const logs = await query(`
      SELECT l.*, u.username 
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching activity logs.' });
  }
});

module.exports = router;
