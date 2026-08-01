const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// Helper to generate next invoice number
router.get('/next-bill-number', verifyToken, async (req, res) => {
  try {
    const prefixResult = await query("SELECT setting_value FROM settings WHERE setting_key = 'invoice_prefix'");
    const prefix = prefixResult.length > 0 ? prefixResult[0].setting_value : 'FK';
    
    // Select the invoice with highest ID to increment
    const lastInvoice = await query("SELECT id FROM invoices ORDER BY id DESC LIMIT 1");
    const nextId = lastInvoice.length > 0 ? lastInvoice[0].id + 1 : 1;
    
    // Format: FK0001, FK0002, etc.
    const billNumber = `${prefix}${String(nextId).padStart(4, '0')}`;
    res.json({ billNumber });
  } catch (err) {
    console.error('Error generating bill number:', err);
    res.status(500).json({ error: 'Error generating invoice number.' });
  }
});

// GET all invoices (with extensive filters)
router.get('/', verifyToken, async (req, res) => {
  const { search, startDate, endDate, paymentMethod, minAmount, maxAmount } = req.query;
  try {
    let sql = `
      SELECT i.*, c.name as customer_name, c.mobile as customer_mobile, c.place as customer_place
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    let params = [];

    if (search) {
      sql += ' AND (i.bill_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ? OR i.notes LIKE ?)';
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }

    if (startDate) {
      sql += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    if (paymentMethod) {
      sql += ' AND i.payment_method = ?';
      params.push(paymentMethod);
    }

    if (minAmount) {
      sql += ' AND i.grand_total >= ?';
      params.push(parseFloat(minAmount));
    }
    if (maxAmount) {
      sql += ' AND i.grand_total <= ?';
      params.push(parseFloat(maxAmount));
    }

    sql += ' ORDER BY i.created_at DESC';
    const list = await query(sql, params);
    res.json(list);
  } catch (err) {
    console.error('Fetch invoices error:', err);
    res.status(500).json({ error: 'Error searching invoices.' });
  }
});

// GET single invoice details (with list of items and customer data)
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const invoices = await query(`
      SELECT i.*, c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address, 
             c.gst_number as customer_gst, c.place as customer_place
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    res.json({ invoice: invoices[0], items });
  } catch (err) {
    console.error('Fetch single invoice error:', err);
    res.status(500).json({ error: 'Error fetching invoice details.' });
  }
});

// POST Create new invoice (transactions, customer ledger update, inventory stock depletion)
router.post('/', verifyToken, async (req, res) => {
  const {
    customer_id,
    invoice_date,
    items, // array of { product_id, product_name, quantity, rate, amount, remarks }
    discount,
    previous_balance,
    grand_total,
    paid_amount,
    remaining_amount,
    payment_method,
    notes
  } = req.body;

  if (!customer_id || !invoice_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Incomplete invoice data. Customer and items are required.' });
  }

  try {
    // 1. Generate next invoice number to prevent concurrency mismatch
    const prefixResult = await query("SELECT setting_value FROM settings WHERE setting_key = 'invoice_prefix'");
    const prefix = prefixResult.length > 0 ? prefixResult[0].setting_value : 'FK';
    const lastInvoice = await query("SELECT id FROM invoices ORDER BY id DESC LIMIT 1");
    const nextId = lastInvoice.length > 0 ? lastInvoice[0].id + 1 : 1;
    const billNumber = `${prefix}${String(nextId).padStart(4, '0')}`;

    const dateVal = invoice_date;
    const disc = parseFloat(discount || 0);
    const prevBal = parseFloat(previous_balance || 0);
    const gTotal = parseFloat(grand_total);
    const paidAmt = parseFloat(paid_amount || 0);
    const remAmt = parseFloat(remaining_amount || 0);
    const payMethod = payment_method || 'Cash';
    
    let totalWeight = 0;
    items.forEach(item => {
      totalWeight += parseFloat(item.quantity || 0);
    });

    // 2. Insert Invoice
    const invoiceResult = await query(
      `INSERT INTO invoices (bill_number, customer_id, invoice_date, total_weight, discount, previous_balance, grand_total, paid_amount, remaining_amount, payment_method, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [billNumber, customer_id, dateVal, totalWeight, disc, prevBal, gTotal, paidAmt, remAmt, payMethod, notes || '']
    );

    const invoiceId = invoiceResult.insertId;

    // 3. Insert Items and deplete stocks
    for (const item of items) {
      const q = parseFloat(item.quantity);
      const r = parseFloat(item.rate);
      const amt = parseFloat(item.amount);
      const pid = parseInt(item.product_id) || 0;

      // Save item (product_id=0 means free-text/custom item)
      await query(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, rate, amount, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, pid, item.product_name, q, r, amt, item.remarks || '']
      );

      // Only deplete stock and log if this is a catalogued product (id > 0)
      if (pid > 0) {
        await query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [q, pid]
        );
        await query(
          `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pid, 'SALE', q, r, dateVal, billNumber, `Sale invoice #${billNumber} to customer ID ${customer_id}`]
        );
      }
    }

    // 4. Update customer ledger information
    const customer = await query('SELECT name, outstanding_balance, total_purchases FROM customers WHERE id = ?', [customer_id]);
    if (customer.length > 0) {
      // Calculate outstanding balance change:
      // We add remaining amount (grand_total - paid_amount) to customer outstanding balance
      const balanceChange = gTotal - paidAmt;
      const newBalance = customer[0].outstanding_balance + balanceChange;
      const newTotalPurchases = customer[0].total_purchases + gTotal;

      await query(
        `UPDATE customers 
         SET outstanding_balance = ?, total_purchases = ?, last_purchase_date = ? 
         WHERE id = ?`,
        [newBalance, newTotalPurchases, dateVal, customer_id]
      );
    }

    // 5. Activity Logging
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'INVOICE_CREATE',
      `Created invoice #${billNumber} (Customer ID: ${customer_id}, Grand Total: ₹${gTotal}, Paid: ₹${paidAmt}, Remaining Balance added: ₹${gTotal - paidAmt})`
    ]);

    res.status(201).json({
      message: 'Invoice created successfully.',
      invoiceId,
      billNumber
    });
  } catch (err) {
    console.error('Invoice creation failed:', err);
    res.status(500).json({ error: 'Error saving invoice to database.' });
  }
});

// DELETE Invoice (Admin only - handles stock recovery and customer ledger rollback)
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete invoice records.' });
    }

    // Retrieve invoice details
    const invoices = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const inv = invoices[0];

    // Retrieve items to restore stock
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of items) {
      const pid = parseInt(item.product_id) || 0;
      // Only restore stock for catalogued products (id > 0)
      if (pid > 0) {
        await query(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, pid]
        );
        await query(
          `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pid, 'IN', item.quantity, item.rate, new Date().toISOString().split('T')[0], inv.bill_number, `Restored from deleted invoice #${inv.bill_number}`]
        );
      }
    }

    // Deduct customer ledger stats
    const customer = await query('SELECT outstanding_balance, total_purchases FROM customers WHERE id = ?', [inv.customer_id]);
    if (customer.length > 0) {
      const balanceRollback = inv.grand_total - inv.paid_amount;
      const newBalance = customer[0].outstanding_balance - balanceRollback;
      const newTotalPurchases = customer[0].total_purchases - inv.grand_total;

      await query(
        `UPDATE customers 
         SET outstanding_balance = ?, total_purchases = ?
         WHERE id = ?`,
        [newBalance, newTotalPurchases, inv.customer_id]
      );
    }

    // Delete invoice items and invoice from database
    await query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    await query('DELETE FROM invoices WHERE id = ?', [id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'INVOICE_DELETE',
      `Deleted invoice #${inv.bill_number} (Customer ID: ${inv.customer_id}, Total Refunded to Stock).`
    ]);

    res.json({ message: `Invoice #${inv.bill_number} deleted and stock/ledger rolls back completed.` });
  } catch (err) {
    console.error('Invoice deletion failed:', err);
    res.status(500).json({ error: 'Error deleting invoice.' });
  }
});

// PUT Update Invoice (Edit mode)
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { customer_id, invoice_date, items, discount, previous_balance, grand_total, paid_amount, remaining_amount, payment_method, notes } = req.body;
  if (!customer_id || !invoice_date || !items || items.length === 0) return res.status(400).json({ error: 'Incomplete data.' });

  try {
    const existing = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Invoice not found.' });
    const inv = existing[0];

    // 1. ROLLBACK OLD INVOICE
    const oldItems = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of oldItems) {
      const pid = parseInt(item.product_id) || 0;
      if (pid > 0) {
        await query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, pid]);
        await query(`INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pid, 'IN', item.quantity, item.rate, inv.invoice_date, inv.bill_number, `Edit rollback for invoice #${inv.bill_number}`]);
      }
    }
    const customer = await query('SELECT outstanding_balance, total_purchases FROM customers WHERE id = ?', [inv.customer_id]);
    if (customer.length > 0) {
      await query(`UPDATE customers SET outstanding_balance = outstanding_balance - ?, total_purchases = total_purchases - ? WHERE id = ?`,
        [(inv.grand_total - inv.paid_amount), inv.grand_total, inv.customer_id]);
    }
    await query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

    // 2. APPLY NEW INVOICE DATA
    const dateVal = invoice_date;
    const disc = parseFloat(discount || 0);
    const prevBal = parseFloat(previous_balance || 0);
    const gTotal = parseFloat(grand_total);
    const paidAmt = parseFloat(paid_amount || 0);
    const remAmt = parseFloat(remaining_amount || 0);
    const payMethod = payment_method || 'Cash';
    let totalWeight = 0;
    
    for (const item of items) {
      totalWeight += parseFloat(item.quantity || 0);
      const q = parseFloat(item.quantity);
      const r = parseFloat(item.rate);
      const amt = parseFloat(item.amount);
      const pid = parseInt(item.product_id) || 0;

      await query(`INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, rate, amount, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, pid, item.product_name, q, r, amt, item.remarks || '']);

      if (pid > 0) {
        await query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [q, pid]);
        await query(`INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pid, 'SALE', q, r, dateVal, inv.bill_number, `Edited invoice #${inv.bill_number}`]);
      }
    }

    await query(`UPDATE invoices SET customer_id=?, invoice_date=?, total_weight=?, discount=?, previous_balance=?, grand_total=?, paid_amount=?, remaining_amount=?, payment_method=?, notes=? WHERE id=?`,
      [customer_id, dateVal, totalWeight, disc, prevBal, gTotal, paidAmt, remAmt, payMethod, notes || '', id]);

    const newCustomer = await query('SELECT outstanding_balance, total_purchases FROM customers WHERE id = ?', [customer_id]);
    if (newCustomer.length > 0) {
      await query(`UPDATE customers SET outstanding_balance = outstanding_balance + ?, total_purchases = total_purchases + ? WHERE id = ?`,
        [(gTotal - paidAmt), gTotal, customer_id]);
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id, 'INVOICE_EDIT', `Edited invoice #${inv.bill_number}`
    ]);

    res.json({ message: 'Invoice updated successfully.', billNumber: inv.bill_number });
  } catch (err) {
    console.error('Invoice edit failed:', err);
    res.status(500).json({ error: 'Error updating invoice.' });
  }
});

module.exports = router;
