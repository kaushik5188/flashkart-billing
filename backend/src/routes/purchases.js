const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// 1. Log a new Market Purchase (Cart System)
router.post('/', verifyToken, async (req, res) => {
  const { 
    purchase_date, supplier_id, partner_id, market_name, 
    cart, // Array of items: { vegetable_name, quantity, purchase_rate, total_amount }
    base_amount, transport_charge, labour_charge, other_charges, 
    grand_total, payment_method, remark, bill_photo 
  } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty. Please add items.' });
  }

  try {
    await query('BEGIN TRANSACTION');

    // 1. Insert into purchase_invoices
    const pDate = purchase_date || new Date().toISOString().split('T')[0];
    const result = await query(
      `INSERT INTO purchase_invoices 
        (supplier_id, partner_id, purchase_date, market_name, total_items, base_amount, transport_charge, labour_charge, other_charges, grand_total, payment_method, remark, bill_photo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier_id || null, partner_id || null, pDate, market_name, cart.length,
        base_amount || 0, transport_charge || 0, labour_charge || 0, other_charges || 0,
        grand_total, payment_method || 'Cash', remark, bill_photo
      ]
    );

    const purchaseInvoiceId = result.lastID;

    // 2. Insert items into purchase_items
    for (let item of cart) {
      await query(
        `INSERT INTO purchase_items (purchase_invoice_id, vegetable_name, quantity, purchase_rate, total_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseInvoiceId, item.vegetable_name, item.quantity, item.purchase_rate, item.total_amount]
      );
    }

    // 3. Log as Business Expense if Paid By Partner
    if (partner_id) {
      await query(
        `INSERT INTO partner_expenses (partner_id, expense_date, amount, category, market_name, vendor_name, payment_method, remark, user_id) 
         VALUES (?, ?, ?, 'Vegetables', ?, ?, ?, ?, ?)`,
        [partner_id, pDate, grand_total, market_name, null, payment_method, `Market Purchase INV-${purchaseInvoiceId}`, req.user.id]
      );
    } else {
      // General expense
      await query(
        `INSERT INTO expenses (date, amount, category, remark) VALUES (?, ?, 'Vegetables', ?)`,
        [pDate, grand_total, `Market Purchase INV-${purchaseInvoiceId}`]
      );
    }

    // 4. Update Supplier Ledger
    if (supplier_id) {
      if (payment_method === 'Credit') {
        await query(
          `UPDATE suppliers SET outstanding_balance = outstanding_balance + ?, total_purchases = total_purchases + ? WHERE id = ?`,
          [grand_total, grand_total, supplier_id]
        );
      } else {
        await query(
          `UPDATE suppliers SET total_purchases = total_purchases + ? WHERE id = ?`,
          [grand_total, supplier_id]
        );
      }
    }

    // (Stock update has been completely removed as per user request)

    await query('COMMIT');
    res.status(201).json({ success: true, message: 'Purchase logged successfully', invoice_id: purchaseInvoiceId });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Purchase logging failed:', err);
    res.status(500).json({ error: 'Internal server error while logging purchase' });
  }
});

// 2. GET all Purchase Invoices with Supplier details
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await query(`
      SELECT p.*, s.name as supplier_name, pt.name as partner_name
      FROM purchase_invoices p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN partners pt ON p.partner_id = pt.id
      ORDER BY p.id DESC
    `);
    res.json(list);
  } catch (err) {
    console.error('Fetching purchases failed:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// 3. GET items for a specific purchase invoice
router.get('/:id/items', verifyToken, async (req, res) => {
  try {
    const items = await query(
      `SELECT * FROM purchase_items WHERE purchase_invoice_id = ?`, 
      [req.params.id]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;
