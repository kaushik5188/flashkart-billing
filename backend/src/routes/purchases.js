const express = require('express');
const router = express.Router();
const { query } = require('../db/db');

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await query(`
      SELECT p.*, s.name as supplier_name, pr.name as product_name, pt.name as partner_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN partners pt ON p.partner_id = pt.id
      ORDER BY p.created_at DESC
    `);
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new purchase entry
router.post('/', async (req, res) => {
  try {
    const { 
      supplier_id, partner_id, purchase_date, market_name, 
      product_id, quantity, purchase_rate, total_amount, 
      transport_charge, labour_charge, other_charges, 
      grand_total, payment_method, remark 
    } = req.body;

    if (!supplier_id || !product_id || !quantity || !purchase_rate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const q = parseFloat(quantity) || 0;
    const r = parseFloat(purchase_rate) || 0;
    
    // 1. Insert Purchase Record
    const result = await query(
      `INSERT INTO purchases (
        supplier_id, partner_id, purchase_date, market_name, 
        product_id, quantity, purchase_rate, total_amount, 
        transport_charge, labour_charge, other_charges, 
        grand_total, payment_method, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier_id, partner_id, purchase_date, market_name,
        product_id, q, r, total_amount,
        transport_charge || 0, labour_charge || 0, other_charges || 0,
        grand_total, payment_method, remark
      ]
    );
    const purchaseId = result.insertId || result.lastID;

    // 2. Fetch current product info for moving average
    const products = await query('SELECT stock_quantity, average_purchase_rate FROM products WHERE id = ?', [product_id]);
    if (products.length > 0) {
      const prod = products[0];
      const currentStock = Math.max(0, parseFloat(prod.stock_quantity) || 0); // Ignore negative stock for avg
      const currentAvg = parseFloat(prod.average_purchase_rate) || 0;
      
      const newStock = currentStock + q;
      // Note: The total cost of this batch *includes* the transport/labour charges for accurate profit tracking
      // Calculate true rate = grand_total / quantity
      const trueBatchRate = (parseFloat(grand_total) || 0) / q;
      
      let newAvgRate = trueBatchRate;
      if (newStock > 0) {
        newAvgRate = ((currentStock * currentAvg) + (q * trueBatchRate)) / newStock;
      }

      // 3. Update Product Stock and Average Rate
      await query(
        `UPDATE products SET 
          stock_quantity = stock_quantity + ?, 
          average_purchase_rate = ? 
         WHERE id = ?`,
        [q, newAvgRate, product_id]
      );
    }

    // 4. Record Inventory Transaction
    await query(
      `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, reference_id, description) 
       VALUES (?, 'IN', ?, ?, ?, ?, ?)`,
      [product_id, q, purchase_rate, purchase_date, `PUR-${purchaseId}`, 'Market Purchase']
    );

    // 5. Update Supplier Ledger (Total Purchases, and outstanding balance if unpaid)
    // Assuming 'Unpaid' or 'Credit' means we owe them
    let balanceAdd = 0;
    if (payment_method === 'Unpaid' || payment_method === 'Credit') {
      balanceAdd = parseFloat(grand_total) || 0;
    }
    await query(
      `UPDATE suppliers SET 
        total_purchases = total_purchases + ?,
        outstanding_balance = outstanding_balance + ?
       WHERE id = ?`,
      [parseFloat(grand_total) || 0, balanceAdd, supplier_id]
    );

    res.json({ message: 'Purchase recorded successfully', purchaseId });
  } catch (err) {
    console.error("Purchase Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single purchase
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const purchases = await query(`
      SELECT p.*, s.name as supplier_name, pr.name as product_name, pt.name as partner_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN partners pt ON p.partner_id = pt.id
      WHERE p.id = ?
    `, [id]);
    
    if (purchases.length === 0) return res.status(404).json({ error: 'Purchase not found' });
    res.json(purchases[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
