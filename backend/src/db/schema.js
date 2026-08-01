const { query, dbType } = require('./db');
const bcrypt = require('bcryptjs');

async function initSchema() {
  const isMySQL = dbType === 'mysql';
  
  const pk = isMySQL ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const datetimeType = isMySQL ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';
  const doubleType = isMySQL ? 'DOUBLE' : 'REAL';

  // 1. users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id ${pk},
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      pin_for_reset VARCHAR(10) DEFAULT '1234',
      status VARCHAR(50) DEFAULT 'active',
      created_at ${datetimeType}
    )
  `);

  // 2. customers table
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id ${pk},
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) UNIQUE NOT NULL,
      address TEXT,
      gst_number VARCHAR(100),
      place VARCHAR(255),
      notes TEXT,
      outstanding_balance ${doubleType} DEFAULT 0,
      total_purchases ${doubleType} DEFAULT 0,
      last_purchase_date VARCHAR(100),
      created_at ${datetimeType}
    )
  `);

  // 3. products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id ${pk},
      name VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100) DEFAULT 'Vegetables',
      purchase_price ${doubleType} DEFAULT 0,
      average_purchase_rate ${doubleType} DEFAULT 0,
      selling_price ${doubleType} DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'Kg',
      stock_quantity ${doubleType} DEFAULT 0,
      min_stock_alert ${doubleType} DEFAULT 50,
      barcode VARCHAR(255),
      image_path TEXT,
      created_at ${datetimeType}
    )
  `);

  // 4. invoices table
  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id ${pk},
      bill_number VARCHAR(100) UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      invoice_date VARCHAR(100) NOT NULL,
      total_weight ${doubleType} DEFAULT 0,
      discount ${doubleType} DEFAULT 0,
      previous_balance ${doubleType} DEFAULT 0,
      grand_total ${doubleType} DEFAULT 0,
      paid_amount ${doubleType} DEFAULT 0,
      remaining_amount ${doubleType} DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      notes TEXT,
      created_at ${datetimeType}
    )
  `);

  // 5. invoice_items table
  await query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id ${pk},
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity ${doubleType} NOT NULL,
      rate ${doubleType} NOT NULL,
      purchase_rate ${doubleType} DEFAULT 0,
      amount ${doubleType} NOT NULL,
      remarks VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  // 6. inventory_transactions table
  await query(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id ${pk},
      product_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      quantity ${doubleType} NOT NULL,
      rate ${doubleType} DEFAULT 0,
      transaction_date VARCHAR(100) NOT NULL,
      reference_id VARCHAR(100),
      description TEXT,
      created_at ${datetimeType}
    )
  `);

  // 7. settings table
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(255) PRIMARY KEY,
      setting_value TEXT
    )
  `);

  // 8. activity_logs table
  await query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id ${pk},
      user_id INTEGER,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      created_at ${datetimeType}
    )
  `);

  // 9. ledger_entries table — manual debit/credit entries per customer
  await query(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id ${pk},
      customer_id INTEGER NOT NULL,
      entry_date VARCHAR(100) NOT NULL,
      type VARCHAR(10) NOT NULL,
      amount ${doubleType} NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      remark TEXT,
      added_by VARCHAR(100),
      user_id INTEGER,
      source VARCHAR(50) DEFAULT 'MANUAL',
      reference_id VARCHAR(100),
      is_deleted INTEGER DEFAULT 0,
      created_at ${datetimeType}
    )
  `);

  // 10. partners table — 6 business partners who share costs
  await query(`
    CREATE TABLE IF NOT EXISTS partners (
      id ${pk},
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(20),
      color VARCHAR(20) DEFAULT '#2E7D32',
      avatar_initials VARCHAR(5),
      is_active INTEGER DEFAULT 1,
      total_contribution ${doubleType} DEFAULT 0,
      created_at ${datetimeType}
    )
  `);

  // 11. partner_expenses table — daily market purchase records
  await query(`
    CREATE TABLE IF NOT EXISTS partner_expenses (
      id ${pk},
      partner_id INTEGER NOT NULL,
      expense_date VARCHAR(100) NOT NULL,
      amount ${doubleType} NOT NULL,
      category VARCHAR(50) NOT NULL,
      market_name VARCHAR(100),
      vendor_name VARCHAR(100),
      payment_method VARCHAR(50) DEFAULT 'Cash',
      remark TEXT,
      bill_photo VARCHAR(255),
      added_by VARCHAR(100),
      user_id INTEGER,
      is_deleted INTEGER DEFAULT 0,
      created_at ${datetimeType},
      updated_at ${datetimeType}
    )
  `);

  // 12. suppliers table
  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id ${pk},
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) UNIQUE NOT NULL,
      address TEXT,
      outstanding_balance ${doubleType} DEFAULT 0,
      total_purchases ${doubleType} DEFAULT 0,
      created_at ${datetimeType}
    )
  `);

  // 13. purchases table
  await query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id ${pk},
      supplier_id INTEGER,
      partner_id INTEGER,
      purchase_date VARCHAR(100) NOT NULL,
      market_name VARCHAR(255),
      product_id INTEGER NOT NULL,
      quantity ${doubleType} NOT NULL,
      purchase_rate ${doubleType} NOT NULL,
      total_amount ${doubleType} NOT NULL,
      transport_charge ${doubleType} DEFAULT 0,
      labour_charge ${doubleType} DEFAULT 0,
      other_charges ${doubleType} DEFAULT 0,
      grand_total ${doubleType} NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      remark TEXT,
      bill_photo VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  // 14. expenses table (general business expenses)
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id ${pk},
      date VARCHAR(100) NOT NULL,
      amount ${doubleType} NOT NULL,
      category VARCHAR(100) NOT NULL,
      partner_id INTEGER,
      remark TEXT,
      attachment VARCHAR(255),
      created_at ${datetimeType}
    )
  `);

  const users = await query('SELECT * FROM users WHERE username = ?', ['admin']);
  if (users.length === 0) {
    const defaultPassword = 'admin123';
    const hash = await bcrypt.hash(defaultPassword, 10);
    await query(
      'INSERT INTO users (username, password_hash, role, pin_for_reset) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'admin', '1234']
    );
    console.log('Admin user seeded (admin / admin123)');
  }

  // Seed default system settings
  const settingsList = [
    { key: 'company_name', val: 'FLASHKART' },
    { key: 'tagline', val: 'Fresh Fruits & Vegetables Supplier' },
    { key: 'contacts', val: '6352856495, 9773271029' },
    { key: 'owners', val: 'Kaushik Patel, Om Patel' },
    { key: 'address', val: 'Shop No. 12, Wholesale Vegetable Market, Ahmedabad, Gujarat, India' },
    { key: 'gst_number', val: '24AAAAA0000A1Z5' },
    { key: 'invoice_prefix', val: 'FK' },
    { key: 'invoice_terms', val: '1. Goods once sold will not be taken back.\n2. Payment is due immediately upon billing.' },
    { key: 'upi_id', val: '6352856495@upi' }
  ];

  for (const s of settingsList) {
    const existing = await query('SELECT * FROM settings WHERE setting_key = ?', [s.key]);
    if (existing.length === 0) {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [s.key, s.val]);
    }
  }

  // Seed default vegetables
  const productsList = await query('SELECT * FROM products');
  if (productsList.length === 0) {
    const defaultVegetables = [
      { name: 'Potato', category: 'Vegetables', purchase_price: 15, selling_price: 25, unit: 'Kg', stock_quantity: 500, min_stock_alert: 100 },
      { name: 'Tomato', category: 'Vegetables', purchase_price: 20, selling_price: 35, unit: 'Kg', stock_quantity: 300, min_stock_alert: 80 },
      { name: 'Onion', category: 'Vegetables', purchase_price: 18, selling_price: 30, unit: 'Kg', stock_quantity: 600, min_stock_alert: 120 },
      { name: 'Brinjal', category: 'Vegetables', purchase_price: 12, selling_price: 25, unit: 'Kg', stock_quantity: 150, min_stock_alert: 50 },
      { name: 'Lady Finger', category: 'Vegetables', purchase_price: 35, selling_price: 55, unit: 'Kg', stock_quantity: 200, min_stock_alert: 60 },
      { name: 'Capsicum', category: 'Vegetables', purchase_price: 40, selling_price: 65, unit: 'Kg', stock_quantity: 120, min_stock_alert: 40 },
      { name: 'Spinach', category: 'Vegetables', purchase_price: 10, selling_price: 20, unit: 'Bunch', stock_quantity: 80, min_stock_alert: 30 },
      { name: 'Coriander', category: 'Vegetables', purchase_price: 15, selling_price: 30, unit: 'Kg', stock_quantity: 50, min_stock_alert: 20 }
    ];
    for (const v of defaultVegetables) {
      await query(
        `INSERT INTO products (name, category, purchase_price, selling_price, unit, stock_quantity, min_stock_alert) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [v.name, v.category, v.purchase_price, v.selling_price, v.unit, v.stock_quantity, v.min_stock_alert]
      );
    }
    console.log('Initial vegetable products catalog seeded.');
  }

  // Seed default customer
  const customersList = await query('SELECT * FROM customers');
  if (customersList.length === 0) {
    await query(
      `INSERT INTO customers (name, mobile, address, gst_number, place, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Raj Patel', '9876543210', 'Satellite Road', '24GSTXXXXX', 'Ahmedabad', 'Regular wholesale customer']
    );
    console.log('Default customer seeded.');
  }

  // Seed 6 default partners
  const partnersList = await query('SELECT * FROM partners');
  if (partnersList.length === 0) {
    const defaultPartners = [
      { name: 'Kaushik Patel', color: '#2E7D32', initials: 'KP' },
      { name: 'Om Patel',     color: '#E65100', initials: 'OP' },
      { name: 'Partner 3',   color: '#1565C0', initials: 'P3' },
      { name: 'Partner 4',   color: '#6A1B9A', initials: 'P4' },
      { name: 'Partner 5',   color: '#00695C', initials: 'P5' },
      { name: 'Partner 6',   color: '#BF360C', initials: 'P6' },
    ];
    for (const p of defaultPartners) {
      await query(
        'INSERT INTO partners (name, color, avatar_initials, is_active, total_contribution) VALUES (?, ?, ?, 1, 0)',
        [p.name, p.color, p.initials]
      );
    }
    console.log('6 default business partners seeded.');
  }

  // --- MIGRATIONS FOR ERP UPGRADE ---
  try {
    await query("ALTER TABLE products ADD COLUMN average_purchase_rate REAL DEFAULT 0");
    console.log("Migration: Added average_purchase_rate to products");
    await query("UPDATE products SET average_purchase_rate = purchase_price");
  } catch (err) {
    // Ignore error if column already exists
  }

  try {
    await query("ALTER TABLE invoice_items ADD COLUMN purchase_rate REAL DEFAULT 0");
    console.log("Migration: Added purchase_rate to invoice_items");
  } catch (err) {
    // Ignore error if column already exists
  }
}

module.exports = {
  initSchema
};
