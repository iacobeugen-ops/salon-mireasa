-- ============================================================
-- BridalManager – Tabelele pentru clienți, comenzi, programări, plăți
-- Rulează în Railway după migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS clienti (
  id        SERIAL PRIMARY KEY,
  prenume   VARCHAR(100)  NOT NULL,
  nume      VARCHAR(100)  NOT NULL,
  telefon   VARCHAR(30)   NOT NULL,
  email     VARCHAR(100),
  nunta     DATE,
  status    VARCHAR(20)   NOT NULL DEFAULT 'activ',
  bust      NUMERIC(5,1),
  talie     NUMERIC(5,1),
  solduri   NUMERIC(5,1),
  inaltime  NUMERIC(5,1),
  note      TEXT,
  creat_la  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comenzi (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER       NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
  model       VARCHAR(200)  NOT NULL,
  culoare     VARCHAR(100),
  termen      DATE,
  pret        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status      VARCHAR(30)   NOT NULL DEFAULT 'masura',
  descriere   TEXT,
  creat_la    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programari (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER  NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  data        DATE     NOT NULL,
  ora         TIME     NOT NULL,
  tip         VARCHAR(30) NOT NULL DEFAULT 'consultatie',
  note        TEXT,
  creat_la    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plati (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER       NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
  tip         VARCHAR(20)   NOT NULL DEFAULT 'avans',
  suma        NUMERIC(12,2) NOT NULL,
  data        DATE          NOT NULL,
  metoda      VARCHAR(20)   NOT NULL DEFAULT 'cash',
  note        TEXT,
  creat_la    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comenzi_client   ON comenzi(client_id);
CREATE INDEX IF NOT EXISTS idx_programari_client ON programari(client_id);
CREATE INDEX IF NOT EXISTS idx_programari_data   ON programari(data);
CREATE INDEX IF NOT EXISTS idx_plati_client      ON plati(client_id);
CREATE INDEX IF NOT EXISTS idx_plati_data        ON plati(data);
