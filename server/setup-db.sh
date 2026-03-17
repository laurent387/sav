#!/bin/bash
set -e

echo "=== LIFT GMAO — PostgreSQL Setup ==="

# Create user and database
sudo -u postgres psql <<'EOF'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lift') THEN
    CREATE ROLE lift WITH LOGIN PASSWORD 'lift';
  END IF;
END $$;

SELECT 'User lift exists' AS status;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_database WHERE datname = 'lift_gmao') THEN
    PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE lift_gmao OWNER lift');
  END IF;
END $$;
EOF

# Create database if not exists (can't do conditionally in psql easily)
sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname='lift_gmao'" | grep -q lift_gmao || sudo -u postgres createdb -O lift lift_gmao

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lift_gmao TO lift;"
echo "[OK] Database lift_gmao ready"

# Run schema
cd /home/deploy/rork-in-spectra-asset---control
PGPASSWORD=lift psql -h localhost -U lift -d lift_gmao -f server/db/schema.sql
echo "[OK] Schema applied"

# Install pg dependency
cd /home/deploy/rork-in-spectra-asset---control
npm install pg 2>/dev/null || npm install --save pg 2>/dev/null || echo "npm install pg failed, trying manually..."
echo "[OK] Dependencies installed"

# Run seed
cd /home/deploy/rork-in-spectra-asset---control
PGPASSWORD=lift PGHOST=localhost node server/db/seed.mjs
echo "[OK] Seed data inserted"

# Start/restart API server
pkill -f "node server/api.mjs" 2>/dev/null || true
cd /home/deploy/rork-in-spectra-asset---control
nohup env PGPASSWORD=lift PGHOST=localhost CORS_ORIGIN='*' node server/api.mjs > /tmp/lift-api.log 2>&1 &
sleep 2
curl -s http://localhost:5000/health && echo "" && echo "[OK] API server running on port 5000" || echo "[FAIL] API not responding"

echo "=== Setup complete ==="
