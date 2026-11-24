#!/usr/bin/env bash
# Lance la pile complète LIFT GMAO (PostgreSQL + API + front Vite) sans Docker,
# par exemple dans une session cloud Claude Code (Ubuntu avec PostgreSQL 16).
#
#   bash scripts/cloud-dev.sh         # démarre (idempotent)
#   bash scripts/cloud-dev.sh stop    # arrête tout
#
# Front : http://localhost:5173/lift-gmao/   API : http://localhost:5000/health
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PG_DIR="${PG_DIR:-/var/lib/postgresql/lift-dev}"
PG_PORT="${PG_PORT:-5432}"
LOG_DIR="$PG_DIR/logs"

as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }

stop() {
  pkill -f "node --watch server/api.mjs" 2>/dev/null || true
  pkill -f "vite --host 0.0.0.0" 2>/dev/null || true
  as_pg "$PG_BIN/pg_ctl -D $PG_DIR/data stop -m fast" >/dev/null 2>&1 || true
  echo "[cloud-dev] Arrêté."
}

if [ "${1:-}" = "stop" ]; then stop; exit 0; fi

cd "$ROOT"
[ -d node_modules ] || npm ci

# ─── PostgreSQL ───
if [ "$(id -u)" = 0 ]; then mkdir -p "$PG_DIR" && chown postgres "$PG_DIR"; else mkdir -p "$PG_DIR"; fi
as_pg "mkdir -p $LOG_DIR"
if [ ! -f "$PG_DIR/data/PG_VERSION" ]; then
  echo "[cloud-dev] Création du cluster PostgreSQL..."
  as_pg "$PG_BIN/initdb -D $PG_DIR/data -U lift --auth=trust" >/dev/null
fi
if ! as_pg "$PG_BIN/pg_ctl -D $PG_DIR/data status" >/dev/null 2>&1; then
  as_pg "$PG_BIN/pg_ctl -D $PG_DIR/data -o '-p $PG_PORT -k $PG_DIR -c listen_addresses=localhost' -l $LOG_DIR/postgres.log -w start" >/dev/null
fi

export PGHOST=localhost PGPORT="$PG_PORT" PGUSER=lift PGPASSWORD=lift PGDATABASE=lift_gmao
if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='lift_gmao'" | grep -q 1; then
  psql -d postgres -qc "CREATE DATABASE lift_gmao"
  psql -q -v ON_ERROR_STOP=1 -f server/db/schema.sql >/dev/null
  echo "[cloud-dev] Schéma appliqué."
fi
node server/db/init-dev.mjs

# ─── API ───
if ! pgrep -f "node --watch server/api.mjs" >/dev/null; then
  nohup env API_PORT=5000 CORS_ORIGIN='*' node --watch server/api.mjs > "$LOG_DIR/api.log" 2>&1 &
fi

# ─── Front ───
if ! pgrep -f "vite --host 0.0.0.0" >/dev/null; then
  nohup npx vite --host 0.0.0.0 --port 5173 > "$LOG_DIR/vite.log" 2>&1 &
fi

for _ in $(seq 1 30); do
  curl -sf localhost:5000/health >/dev/null && curl -sf localhost:5173/lift-gmao/ >/dev/null && break
  sleep 1
done
curl -sf localhost:5000/health >/dev/null && echo "[cloud-dev] ✓ API      http://localhost:5000/health" || echo "[cloud-dev] ✗ API (voir $LOG_DIR/api.log)"
curl -sf localhost:5173/lift-gmao/ >/dev/null && echo "[cloud-dev] ✓ Front    http://localhost:5173/lift-gmao/" || echo "[cloud-dev] ✗ Front (voir $LOG_DIR/vite.log)"
echo "[cloud-dev] Logs : $LOG_DIR"
