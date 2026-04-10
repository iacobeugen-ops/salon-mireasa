-- Migration 3: Add marfa_sosita field to facturi
ALTER TABLE facturi ADD COLUMN IF NOT EXISTS marfa_sosita BOOLEAN DEFAULT FALSE;

-- Recreate view to include marfa_sosita
DROP VIEW IF EXISTS facturi_cu_status;
CREATE VIEW facturi_cu_status AS
SELECT
  f.id,
  f.furnizor_id,
  fz.nume AS furnizor_nume,
  f.numar,
  f.data_emisa,
  f.data_scadenta,
  f.suma_totala,
  f.moneda,
  f.observatii,
  f.marfa_sosita,
  COALESCE(SUM(pf.suma_plata), 0)                        AS suma_platita,
  f.suma_totala - COALESCE(SUM(pf.suma_plata), 0)        AS suma_ramasa,
  CASE
    WHEN COALESCE(SUM(pf.suma_plata), 0) >= f.suma_totala THEN 'platita'
    WHEN COALESCE(SUM(pf.suma_plata), 0) > 0              THEN 'partial'
    ELSE                                                       'neplatita'
  END AS status,
  CASE
    WHEN COALESCE(SUM(pf.suma_plata), 0) >= f.suma_totala THEN NULL
    WHEN f.data_scadenta IS NULL                           THEN NULL
    WHEN f.data_scadenta < CURRENT_DATE                    THEN 'overdue'
    WHEN f.data_scadenta <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
    ELSE NULL
  END AS alerta_scadenta
FROM facturi f
LEFT JOIN furnizori fz ON fz.id = f.furnizor_id
LEFT JOIN plati_facturi pf ON pf.factura_id = f.id
GROUP BY f.id, fz.nume;
