const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbType = process.env.DB_TYPE || 'sqlite';
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mysql') || process.env.DATABASE_URL.startsWith('postgres'))) {
  // We assume MySQL for this app, even if URL scheme is slightly different on Vercel sometimes. 
  // mysql2 supports URI strings.
  dbType = 'mysql';
}
let sqliteDb = null;
let mysqlPool = null;

if (dbType === 'mysql') {
  const mysql = require('mysql2/promise');
  if (process.env.DATABASE_URL) {
    mysqlPool = mysql.createPool(process.env.DATABASE_URL);
    console.log('Database initialized: MySQL (via DATABASE_URL)');
  } else {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'flashkart',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('Database initialized: MySQL');
  }
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.resolve(dbDir, 'flashkart.db');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log(`Database initialized: SQLite at ${dbPath}`);
}

/**
 * Executes a SQL query with parameters and returns a promise.
 * Works seamlessly with SQLite and MySQL by providing a unified return interface.
 */
function query(sql, params = []) {
  if (dbType === 'mysql') {
    return mysqlPool.query(sql, params).then(([rows]) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        return rows;
      } else {
        return { insertId: rows.insertId, changes: rows.affectedRows };
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      const trimmedSql = sql.trim().toUpperCase();
      const isSelect = trimmedSql.startsWith('SELECT');
      
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err, 'SQL:', sql);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) {
            console.error('SQLite execute error:', err, 'SQL:', sql);
            reject(err);
          } else {
            resolve({ insertId: this.lastID, changes: this.changes });
          }
        });
      }
    });
  }
}

module.exports = {
  query,
  dbType
};
