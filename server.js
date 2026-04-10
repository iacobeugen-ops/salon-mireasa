const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Helper ────────────────────────────────────────────────
const q = (text, params) => pool.query(text, params);
const d = v => v ? (v instanceof Date ? v.toISOString().slice(0,10) : String(v).slice(0,10)) : null;
const ok = (res, data) => res.json(data);
const err = (res, e) => {
  const msg = e.message || (process.env.DATABASE_URL ? 'Database error' : 'DATABASE_URL not configured');
  console.error('API Error:', msg);
  res.status(500).json({ error: msg });
};

// ── CLIENTI ───────────────────────────────────────────────
const mapClient = r => ({
  id: r.id, prenume: r.prenume, nume: r.nume, telefon: r.telefon,
  email: r.email||'', nunta: d(r.nunta), status: r.status,
  bust: r.bust, talie: r.talie, solduri: r.solduri, inaltime: r.inaltime, note: r.note||''
});

app.get('/api/clienti', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM clienti ORDER BY id'); ok(res, rows.map(mapClient)); }
  catch (e) { err(res, e); }
});

app.post('/api/clienti', async (req, res) => {
  const { prenume, nume, telefon, email, nunta, status, bust, talie, solduri, inaltime, note } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO clienti (prenume,nume,telefon,email,nunta,status,bust,talie,solduri,inaltime,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [prenume,nume,telefon,email||null,nunta||null,status||'activ',bust||null,talie||null,solduri||null,inaltime||null,note||null]
    );
    ok(res, mapClient(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/clienti/:id', async (req, res) => {
  const { prenume, nume, telefon, email, nunta, status, bust, talie, solduri, inaltime, note } = req.body;
  try {
    const { rows } = await q(
      `UPDATE clienti SET prenume=$1,nume=$2,telefon=$3,email=$4,nunta=$5,status=$6,
       bust=$7,talie=$8,solduri=$9,inaltime=$10,note=$11 WHERE id=$12 RETURNING *`,
      [prenume,nume,telefon,email||null,nunta||null,status,bust||null,talie||null,solduri||null,inaltime||null,note||null,req.params.id]
    );
    ok(res, mapClient(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/clienti/:id', async (req, res) => {
  try { await q('DELETE FROM clienti WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── COMENZI ───────────────────────────────────────────────
const mapComanda = r => ({
  id:r.id, clientId:r.client_id, model:r.model, culoare:r.culoare||'',
  termen:d(r.termen), pret:Number(r.pret), status:r.status, desc:r.descriere||''
});

app.get('/api/comenzi', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM comenzi ORDER BY id'); ok(res, rows.map(mapComanda)); }
  catch (e) { err(res, e); }
});

app.post('/api/comenzi', async (req, res) => {
  const { clientId, model, culoare, termen, pret, status, desc } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO comenzi (client_id,model,culoare,termen,pret,status,descriere)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [clientId,model,culoare||null,termen||null,pret||0,status||'masura',desc||null]
    );
    ok(res, mapComanda(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/comenzi/:id', async (req, res) => {
  const { clientId, model, culoare, termen, pret, status, desc } = req.body;
  try {
    const { rows } = await q(
      `UPDATE comenzi SET client_id=$1,model=$2,culoare=$3,termen=$4,pret=$5,status=$6,descriere=$7
       WHERE id=$8 RETURNING *`,
      [clientId,model,culoare||null,termen||null,pret||0,status,desc||null,req.params.id]
    );
    ok(res, mapComanda(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/comenzi/:id', async (req, res) => {
  try { await q('DELETE FROM comenzi WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── PROGRAMARI ────────────────────────────────────────────
const mapProg = r => ({
  id:r.id, clientId:r.client_id, data:d(r.data),
  ora: String(r.ora).slice(0,5), tip:r.tip, note:r.note||''
});

app.get('/api/programari', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM programari ORDER BY data,ora'); ok(res, rows.map(mapProg)); }
  catch (e) { err(res, e); }
});

app.post('/api/programari', async (req, res) => {
  const { clientId, data, ora, tip, note } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO programari (client_id,data,ora,tip,note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [clientId,data,ora,tip||'consultatie',note||null]
    );
    ok(res, mapProg(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/programari/:id', async (req, res) => {
  const { clientId, data, ora, tip, note } = req.body;
  try {
    const { rows } = await q(
      `UPDATE programari SET client_id=$1,data=$2,ora=$3,tip=$4,note=$5 WHERE id=$6 RETURNING *`,
      [clientId,data,ora,tip,note||null,req.params.id]
    );
    ok(res, mapProg(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/programari/:id', async (req, res) => {
  try { await q('DELETE FROM programari WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── PLATI CLIENTI ─────────────────────────────────────────
const mapPlata = r => ({
  id:r.id, clientId:r.client_id, tip:r.tip,
  suma:Number(r.suma), data:d(r.data), metoda:r.metoda, note:r.note||''
});

app.get('/api/plati', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM plati ORDER BY data DESC'); ok(res, rows.map(mapPlata)); }
  catch (e) { err(res, e); }
});

app.post('/api/plati', async (req, res) => {
  const { clientId, tip, suma, data, metoda, note } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO plati (client_id,tip,suma,data,metoda,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [clientId,tip||'avans',suma,data,metoda||'cash',note||null]
    );
    ok(res, mapPlata(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/plati/:id', async (req, res) => {
  const { clientId, tip, suma, data, metoda, note } = req.body;
  try {
    const { rows } = await q(
      `UPDATE plati SET client_id=$1,tip=$2,suma=$3,data=$4,metoda=$5,note=$6 WHERE id=$7 RETURNING *`,
      [clientId,tip,suma,data,metoda,note||null,req.params.id]
    );
    ok(res, mapPlata(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/plati/:id', async (req, res) => {
  try { await q('DELETE FROM plati WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── FURNIZORI ─────────────────────────────────────────────
const mapFurnizor = r => ({
  id:r.id, nume:r.nume, cui:r.cui||'', iban:r.iban||'', categorie:r.categorie,
  persoana:r.persoana||'', telefon:r.telefon||'', email:r.email||'',
  adresa:r.adresa||'', note:r.note||'',
  facturiDeschise: Number(r.facturi_deschise||0),
  totalDatorat: Number(r.total_datorat||0)
});

app.get('/api/furnizori', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM furnizori_cu_sold ORDER BY nume'); ok(res, rows.map(mapFurnizor)); }
  catch (e) { err(res, e); }
});

app.post('/api/furnizori', async (req, res) => {
  const { nume, cui, iban, categorie, persoana, telefon, email, adresa, note } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO furnizori (nume,cui,iban,categorie,persoana,telefon,email,adresa,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nume,cui||null,iban||null,categorie||'altele',persoana||null,telefon||null,email||null,adresa||null,note||null]
    );
    ok(res, { ...mapFurnizor(rows[0]), facturiDeschise:0, totalDatorat:0 });
  } catch (e) { err(res, e); }
});

app.put('/api/furnizori/:id', async (req, res) => {
  const { nume, cui, iban, categorie, persoana, telefon, email, adresa, note } = req.body;
  try {
    await q(
      `UPDATE furnizori SET nume=$1,cui=$2,iban=$3,categorie=$4,persoana=$5,
       telefon=$6,email=$7,adresa=$8,note=$9 WHERE id=$10`,
      [nume,cui||null,iban||null,categorie||'altele',persoana||null,telefon||null,email||null,adresa||null,note||null,req.params.id]
    );
    const { rows } = await q('SELECT * FROM furnizori_cu_sold WHERE id=$1',[req.params.id]);
    ok(res, mapFurnizor(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/furnizori/:id', async (req, res) => {
  try { await q('DELETE FROM furnizori WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── FACTURI ───────────────────────────────────────────────
const mapFactura = r => ({
  id:r.id, furnizorId:r.furnizor_id, furnizorNume:r.furnizor_nume||'',
  numar:r.numar, dataEmisa:d(r.data_emisa), dataScadenta:d(r.data_scadenta),
  sumaTotala:Number(r.suma_totala), moneda:r.moneda||'RON', observatii:r.observatii||'',
  sumaPlatita:Number(r.suma_platita||0), sumaRamasa:Number(r.suma_ramasa||0),
  status:r.status||'neplatita', alertaScadenta:r.alerta_scadenta||null,
  marfaSosita:r.marfa_sosita||false
});

app.get('/api/facturi', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM facturi_cu_status ORDER BY data_emisa DESC'); ok(res, rows.map(mapFactura)); }
  catch (e) { err(res, e); }
});

app.post('/api/facturi', async (req, res) => {
  const { furnizorId, numar, dataEmisa, dataScadenta, sumaTotala, moneda, observatii } = req.body;
  try {
    const { rows: ins } = await q(
      `INSERT INTO facturi (furnizor_id,numar,data_emisa,data_scadenta,suma_totala,moneda,observatii)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [furnizorId,numar,dataEmisa,dataScadenta||null,sumaTotala,moneda||'RON',observatii||null]
    );
    const { rows } = await q('SELECT * FROM facturi_cu_status WHERE id=$1',[ins[0].id]);
    ok(res, mapFactura(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/facturi/:id', async (req, res) => {
  const { furnizorId, numar, dataEmisa, dataScadenta, sumaTotala, moneda, observatii } = req.body;
  try {
    await q(
      `UPDATE facturi SET furnizor_id=$1,numar=$2,data_emisa=$3,data_scadenta=$4,
       suma_totala=$5,moneda=$6,observatii=$7 WHERE id=$8`,
      [furnizorId,numar,dataEmisa,dataScadenta||null,sumaTotala,moneda||'RON',observatii||null,req.params.id]
    );
    const { rows } = await q('SELECT * FROM facturi_cu_status WHERE id=$1',[req.params.id]);
    ok(res, mapFactura(rows[0]));
  } catch (e) { err(res, e); }
});

app.patch('/api/facturi/:id/marfa-sosita', async (req, res) => {
  const { marfaSosita } = req.body;
  try {
    await q('UPDATE facturi SET marfa_sosita=$1 WHERE id=$2', [!!marfaSosita, req.params.id]);
    res.json({ ok: true, marfaSosita: !!marfaSosita });
  } catch (e) { err(res, e); }
});

app.delete('/api/facturi/:id', async (req, res) => {
  try { await q('DELETE FROM facturi WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── PLATI FACTURI ─────────────────────────────────────────
const mapPlataF = r => ({
  id:r.id, facturaId:r.factura_id, dataPlata:d(r.data_plata),
  sumaPlata:Number(r.suma_plata), modalitate:r.modalitate,
  referinta:r.referinta||'', observatii:r.observatii||''
});

app.get('/api/plati-facturi', async (req, res) => {
  try { const { rows } = await q('SELECT * FROM plati_facturi ORDER BY data_plata DESC'); ok(res, rows.map(mapPlataF)); }
  catch (e) { err(res, e); }
});

app.post('/api/plati-facturi', async (req, res) => {
  const { facturaId, dataPlata, sumaPlata, modalitate, referinta, observatii } = req.body;
  try {
    const { rows } = await q(
      `INSERT INTO plati_facturi (factura_id,data_plata,suma_plata,modalitate,referinta,observatii)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [facturaId,dataPlata,sumaPlata,modalitate||'transfer',referinta||null,observatii||null]
    );
    ok(res, mapPlataF(rows[0]));
  } catch (e) { err(res, e); }
});

app.put('/api/plati-facturi/:id', async (req, res) => {
  const { facturaId, dataPlata, sumaPlata, modalitate, referinta, observatii } = req.body;
  try {
    const { rows } = await q(
      `UPDATE plati_facturi SET factura_id=$1,data_plata=$2,suma_plata=$3,
       modalitate=$4,referinta=$5,observatii=$6 WHERE id=$7 RETURNING *`,
      [facturaId,dataPlata,sumaPlata,modalitate||'transfer',referinta||null,observatii||null,req.params.id]
    );
    ok(res, mapPlataF(rows[0]));
  } catch (e) { err(res, e); }
});

app.delete('/api/plati-facturi/:id', async (req, res) => {
  try { await q('DELETE FROM plati_facturi WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch (e) { err(res, e); }
});

// ── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`BridalManager running on port ${PORT}`));
