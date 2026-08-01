const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// Make sure customer_payments table exists
const initPaymentsTable = async () => {
  try {
    const isMySQL = process.env.DB_TYPE === 'mysql';
    const pk = isMySQL ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const datetimeType = isMySQL ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';
    
    await query(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id ${pk},
        customer_id INTEGER NOT NULL,
        payment_date VARCHAR(100) NOT NULL,
        amount REAL NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        remarks TEXT,
        created_at ${datetimeType}
      )
    `);
  } catch (err) {
    console.error('Failed to create customer_payments table:', err);
  }
};
initPaymentsTable();

// Get all customers (with search support)
router.get('/', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    let sql = 'SELECT * FROM customers';
    let params = [];
    
    if (search) {
      sql += ' WHERE name LIKE ? OR mobile LIKE ? OR place LIKE ?';
      const searchWild = `%${search}%`;
      params = [searchWild, searchWild, searchWild];
    }
    
    sql += ' ORDER BY name ASC';
    const list = await query(sql, params);
    res.json(list);
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Error fetching customers.' });
  }
});

// Create new customer
router.post('/', verifyToken, async (req, res) => {
  const { name, mobile, address, gst_number, place, notes } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Customer name and mobile number are required.' });
  }

  try {
    // Check if mobile already exists
    const duplicate = await query('SELECT id FROM customers WHERE mobile = ?', [mobile]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'A customer with this mobile number already exists.' });
    }

    const result = await query(
      `INSERT INTO customers (name, mobile, address, gst_number, place, notes, outstanding_balance, total_purchases) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [name, mobile, address || '', gst_number || '', place || '', notes || '']
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'CUSTOMER_CREATE',
      `Created customer: ${name} (${mobile})`
    ]);

    res.status(201).json({ message: 'Customer created successfully', id: result.insertId });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Error creating customer.' });
  }
});

// Update customer details
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, gst_number, place, notes } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Customer name and mobile number are required.' });
  }

  try {
    // Check if mobile is used by another customer
    const duplicate = await query('SELECT id FROM customers WHERE mobile = ? AND id != ?', [mobile, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'Another customer with this mobile number already exists.' });
    }

    await query(
      `UPDATE customers 
       SET name = ?, mobile = ?, address = ?, gst_number = ?, place = ?, notes = ? 
       WHERE id = ?`,
      [name, mobile, address || '', gst_number || '', place || '', notes || '', id]
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'CUSTOMER_UPDATE',
      `Updated customer ID ${id}: ${name}`
    ]);

    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Error updating customer.' });
  }
});

// Delete customer (only if they have no unpaid balance or bills, or allow deletion with audit logging)
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Only admins can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins are authorized to delete records.' });
    }

    const customer = await query('SELECT name, outstanding_balance FROM customers WHERE id = ?', [id]);
    if (customer.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Check if they have invoices
    const bills = await query('SELECT id FROM invoices WHERE customer_id = ?', [id]);
    if (bills.length > 0) {
      return res.status(400).json({ error: 'Cannot delete customer. This profile has existing billing history.' });
    }

    await query('DELETE FROM customers WHERE id = ?', [id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'CUSTOMER_DELETE',
      `Deleted customer: ${customer[0].name} (ID: ${id})`
    ]);

    res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Error deleting customer.' });
  }
});

// Get customer profile summary and details
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const list = await query('SELECT * FROM customers WHERE id = ?', [id]);
    if (list.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json(list[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching customer profile.' });
  }
});

// Get customer full bill history and ledger list
router.get('/:id/ledger', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { year, month, date } = req.query;
  try {
    let sql = 'SELECT * FROM invoices WHERE customer_id = ?';
    let params = [id];

    if (date) {
      sql += ' AND invoice_date = ?';
      params.push(date);
    } else if (month && year) {
      // Dates are stored as YYYY-MM-DD
      const monthPrefix = `${year}-${month.padStart(2, '0')}%`;
      sql += ' AND invoice_date LIKE ?';
      params.push(monthPrefix);
    } else if (year) {
      const yearPrefix = `${year}%`;
      sql += ' AND invoice_date LIKE ?';
      params.push(yearPrefix);
    }

    sql += ' ORDER BY created_at DESC';
    const bills = await query(sql, params);

    // Fetch payments list
    let paySql = 'SELECT * FROM customer_payments WHERE customer_id = ?';
    let payParams = [id];
    if (date) {
      paySql += ' AND payment_date = ?';
      payParams.push(date);
    } else if (month && year) {
      const monthPrefix = `${year}-${month.padStart(2, '0')}%`;
      paySql += ' AND payment_date LIKE ?';
      payParams.push(monthPrefix);
    } else if (year) {
      const yearPrefix = `${year}%`;
      paySql += ' AND payment_date LIKE ?';
      payParams.push(yearPrefix);
    }
    paySql += ' ORDER BY created_at DESC';
    const payments = await query(paySql, payParams);

    res.json({ invoices: bills, payments });
  } catch (err) {
    console.error('Ledger fetch error:', err);
    res.status(500).json({ error: 'Error fetching customer ledger.' });
  }
});

// Add manual payment (outstanding balance offset)
router.post('/:id/payment', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { amount, payment_method, remarks, date } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  const paymentDate = date || new Date().toISOString().split('T')[0];

  try {
    const customer = await query('SELECT name, outstanding_balance FROM customers WHERE id = ?', [id]);
    if (customer.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const parsedAmount = parseFloat(amount);
    
    // Add payment entry
    await query(
      `INSERT INTO customer_payments (customer_id, payment_date, amount, payment_method, remarks) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, paymentDate, parsedAmount, payment_method || 'Cash', remarks || '']
    );

    // Reduce outstanding balance
    const newBalance = customer[0].outstanding_balance - parsedAmount;
    await query('UPDATE customers SET outstanding_balance = ? WHERE id = ?', [newBalance, id]);

    // Add activity log
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'CUSTOMER_PAYMENT',
      `Manual payment of ₹${parsedAmount} received from ${customer[0].name} (ID: ${id}). New balance: ₹${newBalance}`
    ]);

    res.json({ message: 'Payment recorded successfully', outstanding_balance: newBalance });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Error recording payment.' });
  }
});

module.exports = router;
