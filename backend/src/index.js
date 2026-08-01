const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initSchema } = require('./db/schema');

// Import route modules
const auth = require('./routes/auth');
const customersRouter = require('./routes/customers');
const productsRouter = require('./routes/products');
const billingRouter = require('./routes/billing');
const inventoryRouter = require('./routes/inventory');
const reportsRouter = require('./routes/reports');
const settingsRouter = require('./routes/settings');
const ledgerRouter = require('./routes/ledger');
const usersRouter = require('./routes/users');
const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload folder exists and serve statically
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Route mounts
app.use('/api/auth', auth.router);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/users', usersRouter);
app.use('/api/expenses', expensesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    db_type: process.env.DB_TYPE || 'sqlite'
  });
});

// App initialization wrapper
const bootstrap = async () => {
  try {
    console.log('Starting FLASHKART backend server...');
    console.log('Checking database table structure...');
    await initSchema();
    console.log('Database initialized successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is now listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Critical Error: Failed to bootstrap backend server:', error);
    process.exit(1);
  }
};

bootstrap();
