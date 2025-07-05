const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Logging + JSON + static
app.use((req, res, next) => {
  console.log(`--> ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB init
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), err => {
  if (err) console.error('DB error:', err);
  else console.log('DB připojena');
});
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY(material_id) REFERENCES materials(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    )
  `);
});

// API – customers
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers', (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});
app.post('/api/customers', (req, res) => {
  const { name, phone, email, address } = req.body;
  db.run(
    'INSERT INTO customers(name,phone,email,address) VALUES (?,?,?,?)',
    [name, phone, email, address],
    function(e) {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ id: this.lastID });
    }
  );
});
app.delete('/api/customers/:id', (req, res) => {
  db.run(
    'DELETE FROM customers WHERE id = ?',
    [req.params.id],
    function(e) {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ deleted: this.changes });
    }
  );
});

// API – materials
app.get('/api/materials', (req, res) => {
  db.all('SELECT * FROM materials', (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});
app.post('/api/materials', (req, res) => {
  const { name, unit, price } = req.body;
  db.run(
    'INSERT INTO materials(name,unit,price) VALUES (?,?,?)',
    [name, unit, price],
    function(e) {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ id: this.lastID });
    }
  );
});
// UPDATE – upravit cenu materiálu
app.put('/api/materials/:id', (req, res) => {
  const id    = req.params.id;
  const { price } = req.body;
  db.run(
    'UPDATE materials SET price = ? WHERE id = ?',
    [price, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/materials/:id', (req, res) => {
  db.run(
    'DELETE FROM materials WHERE id = ?',
    [req.params.id],
    function(e) {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ deleted: this.changes });
    }
  );
});

// API – stock
app.get('/api/stock', (req, res) => {
  const sql = `
    SELECT s.id, m.name, m.unit, s.quantity
    FROM stock s
    JOIN materials m ON m.id = s.material_id
  `;
  db.all(sql, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});
app.post('/api/stock', (req, res) => {
  const { material_id, quantity } = req.body;
  db.get(
    'SELECT id FROM stock WHERE material_id = ?',
    [material_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(
          'UPDATE stock SET quantity = quantity + ? WHERE material_id = ?',
          [quantity, material_id],
          function(e) {
            if (e) return res.status(500).json({ error: e.message });
            res.json({ id: row.id });
          }
        );
      } else {
        db.run(
          'INSERT INTO stock(material_id,quantity) VALUES (?,?)',
          [material_id, quantity],
          function(e) {
            if (e) return res.status(500).json({ error: e.message });
            res.json({ id: this.lastID });
          }
        );
      }
    }
  );
});
app.delete('/api/stock/:id', (req, res) => {
  db.run('DELETE FROM stock WHERE id = ?', [req.params.id], function(e) {
    if (e) return res.status(500).json({ error: e.message });
    res.json({ deleted: this.changes });
  });
});

// API – usage
app.get('/api/usage/:customer_id', (req, res) => {
  const cid = req.params.customer_id;
  const sql = `
    SELECT u.id, m.name, u.quantity, u.price
    FROM usage u
    JOIN materials m ON m.id = u.material_id
    WHERE u.customer_id = ?
  `;
  db.all(sql, [cid], (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});
app.post('/api/usage', (req, res) => {
  const { customer_id, material_id, quantity } = req.body;
  db.get(
    'SELECT price FROM materials WHERE id = ?',
    [material_id],
    (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      const total = row.price * quantity;
      db.run(
        'INSERT INTO usage(customer_id,material_id,quantity,price) VALUES (?,?,?,?)',
        [customer_id, material_id, quantity, total],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID });
        }
      );
    }
  );
});

// Fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
