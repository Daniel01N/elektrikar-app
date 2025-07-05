const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const app  = express();
const PORT = process.env.PORT || 3000;

// parsování JSON a servírování statických souborů
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// inicializace SQLite DB
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), err => {
  if (err) console.error('DB error:', err);
  else console.log('DB connected');
});
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    price REAL NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    FOREIGN KEY(material_id) REFERENCES materials(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(material_id) REFERENCES materials(id)
  )`);
});

// === ROUTES: CUSTOMERS ===
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers', (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/customers', (req, res) => {
  const { name, phone, email, address } = req.body;
  db.run(
    'INSERT INTO customers(name,phone,email,address) VALUES (?,?,?,?)',
    [name, phone, email, address],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ id: this.lastID });
    }
  );
});
app.delete('/api/customers/:id', (req, res) => {
  db.run(
    'DELETE FROM customers WHERE id = ?',
    [req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ deleted: this.changes });
    }
  );
});

// === ROUTES: MATERIALS ===
app.get('/api/materials', (req, res) => {
  db.all('SELECT * FROM materials', (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/materials', (req, res) => {
  const { name, unit, price } = req.body;
  db.run(
    'INSERT INTO materials(name,unit,price) VALUES (?,?,?)',
    [name, unit, price],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ id: this.lastID });
    }
  );
});
app.delete('/api/materials/:id', (req, res) => {
  db.run(
    'DELETE FROM materials WHERE id = ?',
    [req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ deleted: this.changes });
    }
  );
});
app.put('/api/materials/:id', (req, res) => {
  const { price } = req.body;
  db.run(
    'UPDATE materials SET price = ? WHERE id = ?',
    [price, req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ updated: this.changes });
    }
  );
});

// === ROUTES: STOCK ===
app.get('/api/stock', (req, res) => {
  const sql = `
    SELECT s.id, m.name, m.unit, s.quantity
    FROM stock s
    JOIN materials m ON m.id = s.material_id
  `;
  db.all(sql, [], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/stock', (req, res) => {
  const { material_id, quantity } = req.body;
  db.get(
    'SELECT id FROM stock WHERE material_id = ?',
    [material_id],
    (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      if (row) {
        db.run(
          'UPDATE stock SET quantity = quantity + ? WHERE material_id = ?',
          [quantity, material_id],
          function(e2) {
            e2 ? res.status(500).json({ error: e2.message }) : res.json({ id: row.id });
          }
        );
      } else {
        db.run(
          'INSERT INTO stock(material_id,quantity) VALUES (?,?)',
          [material_id, quantity],
          function(e2) {
            e2 ? res.status(500).json({ error: e2.message }) : res.json({ id: this.lastID });
          }
        );
      }
    }
  );
});
app.delete('/api/stock/:id', (req, res) => {
  db.run(
    'DELETE FROM stock WHERE id = ?',
    [req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ deleted: this.changes });
    }
  );
});

// === ROUTES: USAGE ===
app.get('/api/usage/:customer_id', (req, res) => {
  const cid = req.params.customer_id;
  const sql = `
    SELECT u.id, m.name, u.quantity, u.price
    FROM usage u
    JOIN materials m ON m.id = u.material_id
    WHERE u.customer_id = ?
  `;
  db.all(sql, [cid], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
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
          err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID });
        }
      );
    }
  );
});

// fallback root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => console.log(`Server běží na http://localhost:${PORT}`));
