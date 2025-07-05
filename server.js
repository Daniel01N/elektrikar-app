// server.js

const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Připojení k DB a tvorba tabulek
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), err => {
  if (err) console.error('DB error:', err);
  else console.log('DB connected');
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
  // … další tabulky jako orders atd.
});

// API – MATERIALS

// 1) Seznam materiálů
app.get('/api/materials', (req, res) => {
  db.all('SELECT * FROM materials', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2) Přidat nový materiál
app.post('/api/materials', (req, res) => {
  const { name, unit, price } = req.body;
  db.run(
    'INSERT INTO materials(name, unit, price) VALUES (?,?,?)',
    [name, unit, price],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// 3) Smazat materiál
app.delete('/api/materials/:id', (req, res) => {
  db.run(
    'DELETE FROM materials WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});

// 4) UPDATE – upravit cenu materiálu
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

// … ostatní API routy (customers, stock, usage, orders) …

// Fallback root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
