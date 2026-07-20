#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://vehicleos:vehicleos@localhost:5432/vehicleos}"

for migration in "$ROOT"/db/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  psql "$DATABASE_URL" -f "$migration"
done

echo "Migrations complete."
