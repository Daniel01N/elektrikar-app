// server.js
const express = require('express');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

// --- API: CUSTOMERS ---
app.get('/api/customers', async (req,res) => {
  try {
    const { rows } = await db.query('SELECT * FROM customers ORDER BY id');
    res.json(rows);
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.post('/api/customers', async (req,res) => {
  const { name,phone,email,address } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO customers(name,phone,email,address) VALUES($1,$2,$3,$4) RETURNING id',
      [name,phone,email,address]
    );
    res.json({ id: rows[0].id });
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.delete('/api/customers/:id', async (req,res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM customers WHERE id=$1',[req.params.id]);
    res.json({ deleted: rowCount });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// --- API: MATERIALS ---
app.get('/api/materials', async (req,res) => {
  try {
    const { rows } = await db.query('SELECT * FROM materials ORDER BY id');
    res.json(rows);
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.post('/api/materials', async (req,res) => {
  const { name,unit,price } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO materials(name,unit,price) VALUES($1,$2,$3) RETURNING id',
      [name,unit,price]
    );
    res.json({ id: rows[0].id });
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.put('/api/materials/:id', async (req,res) => {
  const { name,unit,price } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE materials SET name=$1,unit=$2,price=$3 WHERE id=$4',
      [name,unit,price,req.params.id]
    );
    res.json({ updated: rowCount });
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.delete('/api/materials/:id', async (req,res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM materials WHERE id=$1',[req.params.id]);
    res.json({ deleted: rowCount });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// --- API: STOCK ---
app.get('/api/stock', async (req,res) => {
  const sql = `
    SELECT s.id, m.name, m.unit, s.quantity
    FROM stock s JOIN materials m ON m.id=s.material_id
    ORDER BY s.id
  `;
  try {
    const { rows } = await db.query(sql);
    res.json(rows);
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.post('/api/stock', async (req,res) => {
  const { material_id,quantity } = req.body;
  try {
    const { rows } = await db.query(
      'SELECT id FROM stock WHERE material_id=$1',[material_id]
    );
    if (rows.length) {
      await db.query(
        'UPDATE stock SET quantity=quantity+$1 WHERE material_id=$2',
        [quantity,material_id]
      );
      res.json({ id: rows[0].id });
    } else {
      const ins = await db.query(
        'INSERT INTO stock(material_id,quantity) VALUES($1,$2) RETURNING id',
        [material_id,quantity]
      );
      res.json({ id: ins.rows[0].id });
    }
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.delete('/api/stock/:id', async (req,res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM stock WHERE id=$1',[req.params.id]);
    res.json({ deleted: rowCount });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// --- API: USAGE ---
app.get('/api/usage/:customer_id', async (req,res) => {
  const cid = req.params.customer_id;
  const sql = `
    SELECT u.id, m.name, u.quantity, u.price
    FROM usage u JOIN materials m ON m.id=u.material_id
    WHERE u.customer_id=$1
    ORDER BY u.id
  `;
  try {
    const { rows } = await db.query(sql,[cid]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error:e.message }); }
});
app.post('/api/usage', async (req,res) => {
  const { customer_id,material_id,quantity } = req.body;
  try {
    const p = await db.query('SELECT price FROM materials WHERE id=$1',[material_id]);
    const total = Number(p.rows[0].price) * Number(quantity);
    const ins   = await db.query(
      'INSERT INTO usage(customer_id,material_id,quantity,price) VALUES($1,$2,$3,$4) RETURNING id',
      [customer_id,material_id,quantity,total]
    );
    res.json({ id: ins.rows[0].id });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// fallback
app.get('/', (req,res) =>
  res.sendFile(path.join(__dirname,'public','index.html'))
);

app.listen(PORT, () => console.log(`Server běží na portu ${PORT}`));
