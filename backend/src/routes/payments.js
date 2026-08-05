const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// GET all payments (for reports/history)
router.get('/', verifyToken, async (req, res) => {
  const { startDate, endDate, customerId, billId } = req.query;
  try {
    let sql = `
      SELECT p.*, c.name as customer_name, i.bill_number 
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN invoices i ON p.bill_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND p.payment_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND p.payment_date <= ?';
      params.push(endDate);
    }
    if (customerId) {
      sql += ' AND p.customer_id = ?';
      params.push(customerId);
    }
    if (billId) {
      sql += ' AND p.bill_id = ?';
      params.push(billId);
    }

    sql += ' ORDER BY p.created_at DESC';
    const payments = await query(sql, params);
    res.json(payments);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Error fetching payments.' });
  }
});

// POST a new payment
router.post('/', verifyToken, async (req, res) => {
  const {
    bill_id,
    amount_received,
    discount,
    payment_method,
    reference_number,
    payment_date,
    notes
  } = req.body;

  if (!bill_id || amount_received === undefined) {
    return res.status(400).json({ error: 'Bill ID and Amount Received are required.' });
  }

  try {
    // 1. Fetch the invoice to ensure it exists and get customer_id
    const invoices = await query('SELECT * FROM invoices WHERE id = ?', [bill_id]);
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const invoice = invoices[0];
    const customer_id = invoice.customer_id;

    const amt = parseFloat(amount_received || 0);
    const disc = parseFloat(discount || 0);
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    // 2. Insert into payments table
    await query(
      `INSERT INTO payments (bill_id, customer_id, amount_received, discount, payment_method, reference_number, notes, collected_by, payment_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill_id, customer_id, amt, disc, payment_method || 'Cash', 
        reference_number || '', notes || '', req.user?.username || 'admin', dateVal
      ]
    );

    // 3. Update the invoice
    const newPaidAmount = (parseFloat(invoice.paid_amount) || 0) + amt;
    const newDiscount = (parseFloat(invoice.discount) || 0) + disc;
    
    // Remaining amount decreases by both the amount paid and the discount given
    let newRemainingAmount = (parseFloat(invoice.remaining_amount) || 0) - amt - disc;
    if (newRemainingAmount < 0) newRemainingAmount = 0; // Prevent negative balance

      let newStatus = 'Pending';
      if (newRemainingAmount <= 0) {
        newStatus = 'Collected';
        newRemainingAmount = 0; // Prevent negative
      } else if (newRemainingAmount < invoice.grand_total) {
        newStatus = 'Partial';
      }

    await query(
      `UPDATE invoices 
       SET paid_amount = ?, discount = ?, remaining_amount = ?, payment_status = ? 
       WHERE id = ?`,
      [newPaidAmount, newDiscount, newRemainingAmount, newStatus, bill_id]
    );

    // 4. Update the customer ledger (decrease outstanding balance)
    await query(
      `UPDATE customers 
       SET outstanding_balance = outstanding_balance - ? 
       WHERE id = ?`,
      [amt + disc, customer_id]
    );

    res.json({ message: 'Payment recorded successfully.' });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: 'Error recording payment.' });
  }
});

module.exports = router;
