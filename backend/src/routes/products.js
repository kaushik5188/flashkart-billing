const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db/db');
const { verifyToken } = require('./auth');

// Setup image upload directory
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'veg-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, WEBP, GIF) are allowed.'));
  }
});

// GET all products
router.get('/', verifyToken, async (req, res) => {
  const { search, category, lowStock } = req.query;
  try {
    let sql = 'SELECT * FROM products WHERE 1=1';
    let params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR barcode LIKE ?)';
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (lowStock === 'true') {
      sql += ' AND stock_quantity <= min_stock_alert';
    }

    sql += ' ORDER BY name ASC';
    const list = await query(sql, params);
    res.json(list);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Error fetching products.' });
  }
});

// POST create new product
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  const { name, category, purchase_price, selling_price, unit, stock_quantity, min_stock_alert, barcode } = req.body;

  if (!name || !purchase_price || !selling_price) {
    return res.status(400).json({ error: 'Name, purchase price, and selling price are required.' });
  }

  try {
    // Check duplication
    const duplicate = await query('SELECT id FROM products WHERE name = ?', [name]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'A product with this vegetable name already exists.' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const stock = parseFloat(stock_quantity || 0);
    const pPrice = parseFloat(purchase_price);
    const sPrice = parseFloat(selling_price);
    const alertStock = parseFloat(min_stock_alert || 10);

    const result = await query(
      `INSERT INTO products (name, category, purchase_price, selling_price, unit, stock_quantity, min_stock_alert, barcode, image_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || 'Vegetables', pPrice, sPrice, unit || 'Kg', stock, alertStock, barcode || '', imagePath]
    );

    const productId = result.insertId;

    // Log the initial stock transaction if stock > 0
    if (stock > 0) {
      await query(
        `INSERT INTO inventory_transactions (product_id, type, quantity, rate, transaction_date, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, 'IN', stock, pPrice, new Date().toISOString().split('T')[0], 'Initial stock upload']
      );
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'PRODUCT_CREATE',
      `Added product: ${name} (Stock: ${stock} ${unit || 'Kg'}, Selling Price: ₹${sPrice})`
    ]);

    res.status(201).json({ message: 'Product added successfully.', id: productId });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Error adding product.' });
  }
});

// PUT update product details
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, category, purchase_price, selling_price, unit, min_stock_alert, barcode } = req.body;

  if (!name || !purchase_price || !selling_price) {
    return res.status(400).json({ error: 'Name, purchase price, and selling price are required.' });
  }

  try {
    const product = await query('SELECT * FROM products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check duplicate name
    const duplicate = await query('SELECT id FROM products WHERE name = ? AND id != ?', [name, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'Another product with this name already exists.' });
    }

    let imagePath = product[0].image_path;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      // Optional: Delete old image from disk to save space
      if (product[0].image_path) {
        const oldFile = path.join(__dirname, '../..', product[0].image_path);
        fs.unlink(oldFile, () => {});
      }
    }

    const pPrice = parseFloat(purchase_price);
    const sPrice = parseFloat(selling_price);
    const alertStock = parseFloat(min_stock_alert || 10);

    await query(
      `UPDATE products 
       SET name = ?, category = ?, purchase_price = ?, selling_price = ?, unit = ?, min_stock_alert = ?, barcode = ?, image_path = ? 
       WHERE id = ?`,
      [name, category || 'Vegetables', pPrice, sPrice, unit || 'Kg', alertStock, barcode || '', imagePath, id]
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'PRODUCT_UPDATE',
      `Updated product ID ${id}: ${name}`
    ]);

    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Error updating product.' });
  }
});

// DELETE product
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin is authorized to delete products.' });
    }

    const product = await query('SELECT name, image_path FROM products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if product is in invoice items
    const items = await query('SELECT id FROM invoice_items WHERE product_id = ?', [id]);
    if (items.length > 0) {
      return res.status(400).json({ error: 'Cannot delete product. This vegetable is listed in billing transactions.' });
    }

    // Delete database item
    await query('DELETE FROM products WHERE id = ?', [id]);

    // Delete image if exists
    if (product[0].image_path) {
      const oldFile = path.join(__dirname, '../..', product[0].image_path);
      fs.unlink(oldFile, () => {});
    }

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'PRODUCT_DELETE',
      `Deleted product: ${product[0].name} (ID: ${id})`
    ]);

    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Error deleting product.' });
  }
});

module.exports = router;
