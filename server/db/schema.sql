-- ═══════════════════════════════════════════════════════
-- LIFT GMAO — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════

-- Enums
CREATE TYPE configuration AS ENUM ('E''', 'F', 'G', 'H', 'I');
CREATE TYPE unit_status AS ENUM ('operational', 'en-retrofit', 'en-maintenance', 'bloque');
CREATE TYPE ot_status AS ENUM ('planifie', 'en-cours', 'en-attente-pieces', 'termine', 'annule');
CREATE TYPE ot_type AS ENUM ('retrofit', 'correctif', 'preventif', 'inspection');
CREATE TYPE op_status AS ENUM ('attente', 'en-cours', 'fait', 'bloque');
CREATE TYPE tech_skill AS ENUM ('Mecanicien', 'Electricien', 'Chef d''equipe');
CREATE TYPE tech_availability AS ENUM ('disponible', 'en-intervention', 'indisponible');
CREATE TYPE ot_priority AS ENUM ('basse', 'normale', 'haute', 'critique');
CREATE TYPE section_type AS ENUM ('PARTIE FIXE', 'PARTIE MOBILE');
CREATE TYPE discipline_type AS ENUM ('MECA', 'ELEC');
CREATE TYPE fnc_status AS ENUM ('ouverte', 'traitee', 'cloturee');
CREATE TYPE user_role AS ENUM ('admin', 'bureau-etude', 'logistique', 'technicien');

-- ═══════ Users ═══════
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  full_name     VARCHAR(200) NOT NULL,
  role          user_role NOT NULL,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════ Technicians ═══════
CREATE TABLE technicians (
  id            VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  skill         tech_skill NOT NULL,
  city          VARCHAR(100) NOT NULL,
  availability  tech_availability DEFAULT 'disponible',
  active_ots    INTEGER DEFAULT 0
);

-- ═══════ Lift Units ═══════
CREATE TABLE lift_units (
  id              VARCHAR(20) PRIMARY KEY,
  serial_number   VARCHAR(50) UNIQUE NOT NULL,
  client          VARCHAR(100) NOT NULL,
  site            VARCHAR(200) NOT NULL,
  city            VARCHAR(100) NOT NULL,
  partie_fixe_id  VARCHAR(20) NOT NULL,
  partie_mobile_id VARCHAR(20) NOT NULL,
  current_config  configuration NOT NULL,
  target_config   configuration,
  status          unit_status DEFAULT 'operational',
  install_date    DATE NOT NULL,
  last_service_date DATE
);

-- ═══════ Retrofit Operations (reference catalog) ═══════
CREATE TABLE retrofit_operations (
  id              VARCHAR(20) PRIMARY KEY,
  code            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  estimated_hours NUMERIC(5,2) NOT NULL,
  personnel       INTEGER DEFAULT 1,
  tools           TEXT[] DEFAULT '{}',
  consumables     TEXT[] DEFAULT '{}',
  steps           TEXT[] DEFAULT '{}',
  from_config     configuration NOT NULL,
  to_config       configuration NOT NULL
);

-- Parts required per operation
CREATE TABLE operation_parts (
  id            SERIAL PRIMARY KEY,
  operation_id  VARCHAR(20) REFERENCES retrofit_operations(id) ON DELETE CASCADE,
  designation   VARCHAR(200) NOT NULL,
  quantity      INTEGER NOT NULL,
  reference     VARCHAR(100) NOT NULL
);

-- ═══════ Work Orders ═══════
CREATE TABLE work_orders (
  id              VARCHAR(30) PRIMARY KEY,
  type            ot_type NOT NULL,
  status          ot_status DEFAULT 'planifie',
  unit_id         VARCHAR(20) REFERENCES lift_units(id),
  client          VARCHAR(100) NOT NULL,
  site            VARCHAR(200) NOT NULL,
  city            VARCHAR(100) NOT NULL,
  created_date    DATE NOT NULL,
  planned_date    DATE NOT NULL,
  completed_date  DATE,
  from_config     configuration,
  to_config       configuration,
  priority        ot_priority DEFAULT 'normale',
  description     TEXT NOT NULL,
  notes           TEXT
);

-- Work order ↔ technician (many-to-many)
CREATE TABLE work_order_technicians (
  work_order_id VARCHAR(30) REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id VARCHAR(20) REFERENCES technicians(id) ON DELETE CASCADE,
  PRIMARY KEY (work_order_id, technician_id)
);

-- Work order operations (instance per OT)
CREATE TABLE work_order_operations (
  id              SERIAL PRIMARY KEY,
  work_order_id   VARCHAR(30) REFERENCES work_orders(id) ON DELETE CASCADE,
  operation_id    VARCHAR(20) REFERENCES retrofit_operations(id),
  status          op_status DEFAULT 'attente',
  technician_id   VARCHAR(20) REFERENCES technicians(id),
  completed_at    DATE,
  notes           TEXT
);

-- FNC references from work order operations
CREATE TABLE work_order_operation_fncs (
  work_order_operation_id INTEGER REFERENCES work_order_operations(id) ON DELETE CASCADE,
  fnc_id                  VARCHAR(30),
  PRIMARY KEY (work_order_operation_id, fnc_id)
);

-- ═══════ Gammes ═══════
CREATE TABLE gammes (
  id          VARCHAR(30) PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  section     section_type NOT NULL,
  discipline  discipline_type NOT NULL,
  configs     configuration[] DEFAULT '{}',
  category    VARCHAR(100) NOT NULL,
  revision    VARCHAR(10) NOT NULL
);

CREATE TABLE gamme_documents (
  id        SERIAL PRIMARY KEY,
  gamme_id  VARCHAR(30) REFERENCES gammes(id) ON DELETE CASCADE,
  filename  VARCHAR(300) NOT NULL
);

-- ═══════ Part Alerts ═══════
CREATE TABLE parts_alerts (
  id            VARCHAR(20) PRIMARY KEY,
  designation   VARCHAR(200) NOT NULL,
  reference     VARCHAR(100) NOT NULL,
  stock_actuel  INTEGER DEFAULT 0,
  stock_min     INTEGER DEFAULT 0,
  linked_ot     VARCHAR(30) REFERENCES work_orders(id),
  site          VARCHAR(200) NOT NULL
);

-- ═══════ FNCs ═══════
CREATE TABLE fncs (
  id              VARCHAR(30) PRIMARY KEY,
  work_order_id   VARCHAR(30) REFERENCES work_orders(id),
  date            DATE NOT NULL,
  part_reference  VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL,
  status          fnc_status DEFAULT 'ouverte',
  severity        VARCHAR(20),
  category        VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_lift_units_client ON lift_units(client);
CREATE INDEX idx_lift_units_status ON lift_units(status);
CREATE INDEX idx_work_orders_unit ON work_orders(unit_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_fncs_work_order ON fncs(work_order_id);
CREATE INDEX idx_woo_work_order ON work_order_operations(work_order_id);
