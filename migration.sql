-- ============================================================
-- BridalManager – Migrare schema PostgreSQL pentru Railway
-- Rulează o singură dată după ce conectezi baza de date.
-- ============================================================

-- ── Tabel: furnizori ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS furnizori (
  id         SERIAL PRIMARY KEY,
  nume       VARCHAR(200) NOT NULL,
  cui        VARCHAR(30),
  iban       VARCHAR(40),
  categorie  VARCHAR(30)  NOT NULL DEFAULT 'altele',
  persoana   VARCHAR(100),
  telefon    VARCHAR(30),
  email      VARCHAR(100),
  adresa     TEXT,
  note       TEXT,
  creat_la   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Tabel: facturi ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturi (
  id             SERIAL PRIMARY KEY,
  furnizor_id    INTEGER      NOT NULL REFERENCES furnizori(id) ON DELETE RESTRICT,
  numar          VARCHAR(50)  NOT NULL,
  data_emisa     DATE         NOT NULL,
  data_scadenta  DATE,
  suma_totala    NUMERIC(12,2) NOT NULL CHECK (suma_totala >= 0),
  moneda         VARCHAR(3)   NOT NULL DEFAULT 'RON',
  observatii     TEXT,
  creat_la       TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (furnizor_id, numar)
);

-- ── Tabel: plati_facturi ────────────────────────────────────
CREATE TABLE IF NOT EXISTS plati_facturi (
  id           SERIAL PRIMARY KEY,
  factura_id   INTEGER       NOT NULL REFERENCES facturi(id) ON DELETE CASCADE,
  data_plata   DATE          NOT NULL,
  suma_plata   NUMERIC(12,2) NOT NULL CHECK (suma_plata > 0),
  modalitate   VARCHAR(20)   NOT NULL DEFAULT 'transfer'
                             CHECK (modalitate IN ('transfer','cash','card')),
  referinta    VARCHAR(100),
  observatii   TEXT,
  creat_la     TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── Constrângere: suma plăților ≤ suma totală facturii ──────
-- Implementată prin trigger (PostgreSQL nu suportă CHECK cu subquery)
CREATE OR REPLACE FUNCTION check_suma_plati()
RETURNS TRIGGER AS $$
DECLARE
  suma_total    NUMERIC;
  suma_platita  NUMERIC;
BEGIN
  SELECT suma_totala INTO suma_total
  FROM facturi WHERE id = NEW.factura_id;

  SELECT COALESCE(SUM(suma_plata), 0) INTO suma_platita
  FROM plati_facturi
  WHERE factura_id = NEW.factura_id
    AND id IS DISTINCT FROM NEW.id;  -- exclude rândul curent la UPDATE

  IF (suma_platita + NEW.suma_plata) > suma_total THEN
    RAISE EXCEPTION 'Suma plăților (% + %) depășește suma totală a facturii (%)',
      suma_platita, NEW.suma_plata, suma_total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_suma_plati ON plati_facturi;
CREATE TRIGGER trg_check_suma_plati
  BEFORE INSERT OR UPDATE ON plati_facturi
  FOR EACH ROW EXECUTE FUNCTION check_suma_plati();

-- ── View: facturi_cu_status ─────────────────────────────────
-- Status calculat automat: neplatita / partial / platita
CREATE OR REPLACE VIEW facturi_cu_status AS
SELECT
  f.id,
  f.furnizor_id,
  fz.nume                                    AS furnizor_nume,
  f.numar,
  f.data_emisa,
  f.data_scadenta,
  f.suma_totala,
  f.moneda,
  f.observatii,
  COALESCE(SUM(p.suma_plata), 0)             AS suma_platita,
  f.suma_totala - COALESCE(SUM(p.suma_plata), 0) AS suma_ramasa,
  CASE
    WHEN COALESCE(SUM(p.suma_plata), 0) = 0               THEN 'neplatita'
    WHEN COALESCE(SUM(p.suma_plata), 0) >= f.suma_totala   THEN 'platita'
    ELSE 'partial'
  END                                        AS status,
  CASE
    WHEN f.data_scadenta IS NULL                           THEN NULL
    WHEN COALESCE(SUM(p.suma_plata), 0) >= f.suma_totala   THEN NULL
    WHEN f.data_scadenta < CURRENT_DATE                    THEN 'overdue'
    WHEN f.data_scadenta <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
    ELSE NULL
  END                                        AS alerta_scadenta
FROM facturi f
JOIN furnizori fz ON fz.id = f.furnizor_id
LEFT JOIN plati_facturi p ON p.factura_id = f.id
GROUP BY f.id, fz.nume;

-- ── View: furnizori_cu_sold ─────────────────────────────────
-- Total datorat și număr facturi deschise per furnizor
CREATE OR REPLACE VIEW furnizori_cu_sold AS
SELECT
  fz.*,
  COUNT(f.id) FILTER (WHERE fcs.status <> 'platita')  AS facturi_deschise,
  COALESCE(SUM(fcs.suma_ramasa)
    FILTER (WHERE fcs.status <> 'platita'), 0)         AS total_datorat
FROM furnizori fz
LEFT JOIN facturi_cu_status fcs ON fcs.furnizor_id = fz.id
LEFT JOIN facturi f ON f.id = fcs.id
GROUP BY fz.id;

-- ── Indexuri ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_facturi_furnizor   ON facturi(furnizor_id);
CREATE INDEX IF NOT EXISTS idx_facturi_scadenta   ON facturi(data_scadenta);
CREATE INDEX IF NOT EXISTS idx_plati_factura      ON plati_facturi(factura_id);
CREATE INDEX IF NOT EXISTS idx_plati_data         ON plati_facturi(data_plata);

-- ── Tabelele existente (clienți, comenzi etc.) ───────────────
-- Păstrate neschimbate. Schema lor rămâne ca înainte.
-- Dacă migrezi de la zero, adaugă și CREATE TABLE pentru:
--   clienti, comenzi, programari, plati

-- ============================================================
-- GATA! Conectează aplicația la DATABASE_URL din Railway
-- și înlocuiește localStorage cu apeluri REST/API.
-- ============================================================
