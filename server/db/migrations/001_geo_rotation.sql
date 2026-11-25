-- ═══════════════════════════════════════════════════════
-- Contrôle géométrique de la rotation — mesures par vis,
-- alertes de mesures atypiques, historique et traçabilité.
-- Migration idempotente (relançable sans risque).
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  VARCHAR(200)
);

-- Seuils d'aide à la détection (mm) — ce ne sont pas des tolérances constructeur.
INSERT INTO app_settings (key, value)
VALUES ('geo_rotation_thresholds', '{"local": 0.20, "mean": 0.20}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS geo_controls (
  id               SERIAL PRIMARY KEY,
  unit_id          VARCHAR(20) REFERENCES lift_units(id) ON DELETE SET NULL,
  rame             VARCHAR(50) NOT NULL,
  work_order_id    VARCHAR(30) REFERENCES work_orders(id) ON DELETE SET NULL,
  local_threshold  NUMERIC(6,3) NOT NULL,
  mean_threshold   NUMERIC(6,3) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'en-cours',
  notes            TEXT,
  started_by       VARCHAR(200),
  started_at       TIMESTAMPTZ DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS geo_measurements (
  control_id    INTEGER REFERENCES geo_controls(id) ON DELETE CASCADE,
  screw         SMALLINT NOT NULL CHECK (screw BETWEEN 1 AND 40),
  value         NUMERIC(7,3) NOT NULL,
  alert_raised  BOOLEAN NOT NULL DEFAULT false,
  confirmed     BOOLEAN NOT NULL DEFAULT false,
  vigilance     BOOLEAN NOT NULL DEFAULT false,
  observation   TEXT,
  measured_by   VARCHAR(200),
  measured_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (control_id, screw)
);

-- Historique : mesure initiale, corrections, confirmations. Jamais modifié ni supprimé.
CREATE TABLE IF NOT EXISTS geo_measurement_events (
  id            SERIAL PRIMARY KEY,
  control_id    INTEGER REFERENCES geo_controls(id) ON DELETE CASCADE,
  screw         SMALLINT NOT NULL,
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('mesure', 'correction', 'confirmation')),
  old_value     NUMERIC(7,3),
  new_value     NUMERIC(7,3),
  reason        TEXT,
  cleaning      JSONB NOT NULL DEFAULT '[]',
  alert_status  VARCHAR(20),
  observation   TEXT,
  technician    VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_events_control ON geo_measurement_events(control_id, screw);
