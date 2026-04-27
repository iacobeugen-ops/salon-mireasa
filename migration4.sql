-- Migration 4: tipuri_produse + campuri produse pe facturi

CREATE TABLE tipuri_produse (
  id       SERIAL PRIMARY KEY,
  denumire VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO tipuri_produse (denumire) VALUES ('Rochii de mireasă'), ('Voaluri');

ALTER TABLE facturi
  ADD COLUMN tip_produs_id INTEGER REFERENCES tipuri_produse(id),
  ADD COLUMN nr_produse    INTEGER;
