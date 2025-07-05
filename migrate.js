/**
 * migrate.js
 * 1) otevře lokální data.db
 * 2) načte všechny záznamy z SQLite
 * 3) vloží je do Postgresu
 * Spusť `npm run migrate` před `npm start`
 */

const path      = require('path');
const sqlite    = require('sqlite');
const sqlite3   = require('sqlite3').verbose();
const dbPg      = require('./db');

async function migrate() {
  // 1) připoj se k SQLite
  const dbSql = await sqlite.open({
    filename: path.join(__dirname, 'data.db'),
    driver:   sqlite3.Database
  });

  // 2) Vytvoř tabulky v Postgresu (pokud neexistují)
  await dbPg.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT, email TEXT, address TEXT
    );
  `);
  await dbPg.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price NUMERIC NOT NULL
    );
  `);
  await dbPg.query(`
    CREATE TABLE IF NOT EXISTS stock (
      id SERIAL PRIMARY KEY,
      material_id INTEGER REFERENCES materials(id),
      quantity NUMERIC NOT NULL
    );
  `);
  await dbPg.query(`
    CREATE TABLE IF NOT EXISTS usage (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      material_id INTEGER REFERENCES materials(id),
      quantity NUMERIC NOT NULL,
      price NUMERIC NOT NULL
    );
  `);

  // 3) Zkontroluj, zda už tam není data (seed idempotentní)
  const { rows: ccount } = await dbPg.query('SELECT COUNT(*) FROM customers');
  if (+ccount[0].count > 0) {
    console.log('🔄 Postgres už obsahuje data, přeskočeno seedování.');
    return;
  }

  // 4) Načti data ze SQLite
  const customers = await dbSql.all('SELECT * FROM customers');
  const materials = await dbSql.all('SELECT * FROM materials');
  const stock     = await dbSql.all('SELECT * FROM stock');
  const usage     = await dbSql.all('SELECT * FROM usage');

  // 5) Vlož je do Postgresu
  for (const c of customers) {
    await dbPg.query(
      'INSERT INTO customers(name,phone,email,address) VALUES($1,$2,$3,$4)',
      [c.name, c.phone, c.email, c.address]
    );
  }
  for (const m of materials) {
    await dbPg.query(
      'INSERT INTO materials(name,unit,price) VALUES($1,$2,$3)',
      [m.name, m.unit, m.price]
    );
  }
  for (const s of stock) {
    // musíme najít nový material_id – v SQLite a Postgresu se id shodí, protože jsme vložili v pořadí
    await dbPg.query(
      'INSERT INTO stock(material_id,quantity) VALUES($1,$2)',
      [s.material_id, s.quantity]
    );
  }
  for (const u of usage) {
    await dbPg.query(
      'INSERT INTO usage(customer_id,material_id,quantity,price) VALUES($1,$2,$3,$4)',
      [u.customer_id, u.material_id, u.quantity, u.price]
    );
  }

  console.log(`🌱 Migrace dokončena: 
    customers=${customers.length},
    materials=${materials.length},
    stock=${stock.length},
    usage=${usage.length}`);
}

migrate()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Chyba při migraci:', e);
    process.exit(1);
  });
