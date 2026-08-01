const express = require('express');
const router = express.Router();
const { query } = require('../db/db');

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await query('SELECT * FROM suppliers ORDER BY created_at DESC');
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new supplier
router.post('/', async (req, res) => {
  try {
    const { name, mobile, address } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required.' });
    }

    const result = await query(
      `INSERT INTO suppliers (name, mobile, address, outstanding_balance, total_purchases) 
       VALUES (?, ?, ?, 0, 0)`,
      [name, mobile, address]
    );

    res.json({ message: 'Supplier created successfully', id: result.insertId || result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a supplier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, address } = req.body;
    
    await query(
      `UPDATE suppliers SET name = ?, mobile = ?, address = ? WHERE id = ?`,
      [name, mobile, address, id]
    );
    res.json({ message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single supplier details with their purchase history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (suppliers.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    
    const purchases = await query('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY created_at DESC', [id]);
    
    res.json({ supplier: suppliers[0], purchases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a supplier (if they have no purchases)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchases = await query('SELECT id FROM purchases WHERE supplier_id = ? LIMIT 1', [id]);
    if (purchases.length > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with existing purchase history.' });
    }

    await query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
