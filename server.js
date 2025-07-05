const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const app  = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// otevření/nebo vytvoření SQLite DB
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), err => {
  if (err) console.error('DB error:', err);
  else console.log('✅ SQLite opened');
});

// vytvoření tabulek
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    phone    TEXT,
    email    TEXT,
    address  TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS materials (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    unit     TEXT    NOT NULL,
    price    REAL    NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id  INTEGER NOT NULL,
    quantity     REAL    NOT NULL,
    FOREIGN KEY(material_id) REFERENCES materials(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS usage (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id  INTEGER NOT NULL,
    material_id  INTEGER NOT NULL,
    quantity     REAL    NOT NULL,
    price        REAL    NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(material_id)  REFERENCES materials(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id  INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    total        REAL    NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL,
    material_id  INTEGER NOT NULL,
    quantity     REAL    NOT NULL,
    price        REAL    NOT NULL,
    FOREIGN KEY(order_id)    REFERENCES orders(id),
    FOREIGN KEY(material_id) REFERENCES materials(id)
  )`);
});

// ---------- API ROUTES ---------- //

// CUSTOMERS
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY id', [], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/customers', (req, res) => {
  const { name, phone, email, address } = req.body;
  db.run(
    'INSERT INTO customers(name,phone,email,address) VALUES(?,?,?,?)',
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

// MATERIALS
app.get('/api/materials', (req, res) => {
  db.all('SELECT * FROM materials ORDER BY id', [], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/materials', (req, res) => {
  const { name, unit, price } = req.body;
  db.run(
    'INSERT INTO materials(name,unit,price) VALUES(?,?,?)',
    [name, unit, price],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ id: this.lastID });
    }
  );
});
app.put('/api/materials/:id', (req, res) => {
  const { name, unit, price } = req.body;
  db.run(
    'UPDATE materials SET name=?,unit=?,price=? WHERE id=?',
    [name, unit, price, req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ updated: this.changes });
    }
  );
});
app.delete('/api/materials/:id', (req, res) => {
  db.run(
    'DELETE FROM materials WHERE id=?',
    [req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ deleted: this.changes });
    }
  );
});

// STOCK
app.get('/api/stock', (req, res) => {
  const sql = `
    SELECT s.id, m.name, m.unit, s.quantity
    FROM stock s
    JOIN materials m ON m.id=s.material_id
    ORDER BY s.id
  `;
  db.all(sql, [], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/stock', (req, res) => {
  const { material_id, quantity } = req.body;
  db.get('SELECT id FROM stock WHERE material_id=?', [material_id], (e, row) => {
    if (e) return res.status(500).json({ error: e.message });
    if (row) {
      db.run(
        'UPDATE stock SET quantity=quantity+? WHERE material_id=?',
        [quantity, material_id],
        function(e2) {
          e2 ? res.status(500).json({ error: e2.message }) : res.json({ id: row.id });
        }
      );
    } else {
      db.run(
        'INSERT INTO stock(material_id,quantity) VALUES(?,?)',
        [material_id, quantity],
        function(e2) {
          e2 ? res.status(500).json({ error: e2.message }) : res.json({ id: this.lastID });
        }
      );
    }
  });
});
app.delete('/api/stock/:id', (req, res) => {
  db.run(
    'DELETE FROM stock WHERE id=?',
    [req.params.id],
    function(e) {
      e ? res.status(500).json({ error: e.message }) : res.json({ deleted: this.changes });
    }
  );
});

// USAGE (Zakázka)
app.get('/api/usage/:customer_id', (req, res) => {
  const cid = req.params.customer_id;
  const sql = `
    SELECT u.id, m.name, u.quantity, u.price
    FROM usage u
    JOIN materials m ON m.id=u.material_id
    WHERE u.customer_id=?
    ORDER BY u.id
  `;
  db.all(sql, [cid], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/usage', (req, res) => {
  const { customer_id, material_id, quantity } = req.body;
  db.get('SELECT price FROM materials WHERE id=?', [material_id], (e, row) => {
    if (e) return res.status(500).json({ error: e.message });
    const total = row.price * quantity;
    db.run(
      'INSERT INTO usage(customer_id,material_id,quantity,price) VALUES(?,?,?,?)',
      [customer_id, material_id, quantity, total],
      function(err2) {
        err2 ? res.status(500).json({ error: err2.message }) : res.json({ id: this.lastID });
      }
    );
  });
});

// ORDERS (Prodej)
app.get('/api/orders', (req, res) => {
  const sql = `
    SELECT o.id, o.created_at, o.total, c.name AS customer
    FROM orders o
    JOIN customers c ON c.id=o.customer_id
    ORDER BY o.created_at DESC
  `;
  db.all(sql, [], (e, rows) =>
    e ? res.status(500).json({ error: e.message }) : res.json(rows)
  );
});
app.post('/api/orders', (req, res) => {
  const { customer_id, items } = req.body;
  // spočti total
  let total = 0;
  const prices = {};
  db.serialize(() => {
    items.forEach((it, i) => {
      db.get('SELECT price FROM materials WHERE id=?', [it.material_id], (e, r) => {
        prices[i] = r.price;
        total += r.price * it.quantity;
        if (i === items.length - 1) {
          // vlož order
          db.run(
            'INSERT INTO orders(customer_id,total) VALUES(?,?)',
            [customer_id, total],
            function(err3) {
              if (err3) return res.status(500).json({ error: err3.message });
              const oid = this.lastID;
              // vlož položky
              items.forEach((it2, j) => {
                const line = prices[j] * it2.quantity;
                db.run(
                  'INSERT INTO order_items(order_id,material_id,quantity,price) VALUES(?,?,?,?)',
                  [oid, it2.material_id, it2.quantity, line]
                );
                // odečti ze skladu
                db.run(
                  'UPDATE stock SET quantity=quantity-? WHERE material_id=?',
                  [it2.quantity, it2.material_id]
                );
              });
              res.json({ orderId: oid });
            }
          );
        }
      });
    });
  });
});

// fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
