const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// Make sure suppliers and supplier_purchases tables exist
const initSupplierTables = async () => {
  try {
    const isMySQL = process.env.DB_TYPE === 'mysql';
    const pk = isMySQL ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const datetimeType = isMySQL ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';
    const doubleType = isMySQL ? 'DOUBLE' : 'REAL';

    await query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id ${pk},
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        mobile VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        created_at ${datetimeType}
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS supplier_purchases (
        id ${pk},
        supplier_id INTEGER NOT NULL,
        purchase_date VARCHAR(100) NOT NULL,
        total_amount ${doubleType} DEFAULT 0,
        paid_amount ${doubleType} DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        notes TEXT,
        created_at ${datetimeType}
      )
    `);
  } catch (err) {
    console.error('Failed to create supplier tables:', err);
  }
};
initSupplierTables();

// --- SUPPLIER MANAGEMENT ---

// Get all suppliers
router.get('/suppliers', verifyToken, async (req, res) => {
  try {
    const list = await query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching suppliers.' });
  }
});

// Add a new supplier
router.post('/suppliers', verifyToken, async (req, res) => {
  const { name, contact_person, mobile, address } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ error: 'Supplier name and mobile number are required.' });
  }
  try {
    // Check duplicate mobile
    const duplicate = await query('SELECT id FROM suppliers WHERE mobile = ?', [mobile]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'A supplier with this mobile number already exists.' });
    }
    const result = await query(
      'INSERT INTO suppliers (name, contact_person, mobile, address) VALUES (?, ?, ?, ?)',
      [name, contact_person || '', mobile, address || '']
    );
    res.status(201).json({ message: 'Supplier added successfully.', id: result.insertId });
  } catch (err) {
    console.error('Supplier create error:', err);
    res.status(500).json({ error: 'Error adding supplier.' });
  }
});

// Update supplier
router.put('/suppliers/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, contact_person, mobile, address } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ error: 'Supplier name and mobile number are required.' });
  }
  try {
    const duplicate = await query('SELECT id FROM suppliers WHERE mobile = ? AND id != ?', [mobile, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'Another supplier with this mobile number already exists.' });
    }
    await query(
      'UPDATE suppliers SET name = ?, contact_person = ?, mobile = ?, address = ? WHERE id = ?',
      [name, contact_person || '', mobile, address || '', id]
    );
    res.json({ message: 'Supplier details updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating supplier details.' });
  }
});

// Delete supplier
router.delete('/suppliers/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin is authorized to delete suppliers.' });
    }
    // Check if supplier has purchases
    const purchases = await query('SELECT id FROM supplier_purchases WHERE supplier_id = ?', [id]);
    if (purchases.length > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with active billing history.' });
    }
    await query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ message: 'Supplier deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting supplier.' });
  }
});


// --- STOCK OPERATIONS ---

// GET Stock transactions history log
router.get('/history', verifyToken, async (req, res) => {
  const { search, type, startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT t.*, p.name as product_name, p.unit as product_unit, p.category as product_category
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      WHERE 1=1
    `;
    let params = [];

    if (search) {
      sql += ' AND (p.name LIKE ? OR t.reference_id LIKE ? OR t.description LIKE ?)';
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard);
    }
    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }
    if (startDate) {
      sql += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND t.transaction_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY t.created_at DESC';
    const list = await query(sql, params);
    res.json(list);
  } catch (err) {
    console.error('Inventory log error:', err);
    res.status(500).json({ error: 'Error fetching inventory transactions history.' });
  }
});

// POST Manual Stock adjustment (Stock In / Stock Out)
router.post('/stock-adjust', verifyToken, async (req, res) => {
  const { product_id, type, quantity, rate, description, date } = req.body;

  if (!product_id || !type || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Product, transaction type (IN/OUT), and quantity > 0 are required.' });
  }

  const adjustDate = date || new Date().toISOString().split('T')[0];
  const q = parseFloat(quantity);
  const r = parseFloat(rate || 0);

  try {
    const product = await query('SELECT name, stock_quantity FROM products WHERE id = ?', [product_id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (type === 'OUT' && product[0].stock_quantity < q) {
      return res.status(400).json({ error: `Insufficient stock. Current stock is ${product[0].stock_quantity}.` });
    }

    // Update stock quantity
    const newStock = type === 'IN' ? product[0].stock_quantity + q : product[0].stock_quantity - q;
    await query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, product_id]);

    // Log transaction
    await query(
      `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, type, q, r, adjustDate, description || `Manual stock ${type.toLowerCase()}`]
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'STOCK_ADJUST',
      `Manual stock ${type} for ${product[0].name} (Qty: ${q}, Rate: ₹${r}, New Stock: ${newStock})`
    ]);

    res.json({ message: 'Stock adjusted successfully', stock_quantity: newStock });
  } catch (err) {
    console.error('Stock adjust error:', err);
    res.status(500).json({ error: 'Error executing stock adjustment.' });
  }
});

// POST Bulk Purchase Entry from supplier
router.post('/purchase-entry', verifyToken, async (req, res) => {
  const {
    supplier_id,
    purchase_date,
    items, // array of { product_id, quantity, rate }
    total_amount,
    paid_amount,
    payment_method,
    notes
  } = req.body;

  if (!supplier_id || !purchase_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier details and items list are required.' });
  }

  try {
    const tot = parseFloat(total_amount || 0);
    const paid = parseFloat(paid_amount || 0);

    // Save purchase summary
    const purchaseResult = await query(
      `INSERT INTO supplier_purchases (supplier_id, purchase_date, total_amount, paid_amount, payment_method, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [supplier_id, purchase_date, tot, paid, payment_method || 'Cash', notes || '']
    );

    const purchaseId = purchaseResult.insertId;

    // Loop items to update stocks and log stock-in transactions
    for (const item of items) {
      const q = parseFloat(item.quantity);
      const r = parseFloat(item.rate);

      // Increase stock quantity
      await query('UPDATE products SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?', [q, r, item.product_id]);

      // Log transaction
      await query(
        `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.product_id, 'PURCHASE', q, r, purchase_date, `PUR-${purchaseId}`, `Purchase entry from supplier ID ${supplier_id}`]
      );
    }

    res.status(201).json({ message: 'Purchase entry added and product stock updated.', purchaseId });
  } catch (err) {
    console.error('Purchase entry error:', err);
    res.status(500).json({ error: 'Error processing purchase entry.' });
  }
});

module.exports = router;
