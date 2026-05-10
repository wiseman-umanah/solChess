#!/usr/bin/env bash
set -e

# Load DATABASE_URL from .env
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d '=' -f2- | tr -d '"')
  export DATABASE_URL
fi

# Parse DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*\/||' | sed 's|?.*||')
DB_USER=$(echo "$DATABASE_URL" | sed 's|.*://||' | sed 's|:.*||')
DB_PASS=$(echo "$DATABASE_URL" | sed 's|.*://[^:]*:||' | sed 's|@.*||')
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@||' | sed 's|:.*||' | sed 's|\/.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*:\([0-9]*\)\/.*|\1|')

export PGPASSWORD="$DB_PASS"

echo "→ Creating database '$DB_NAME' if it doesn't exist..."

# Connect to the default 'postgres' db to check/create our db
EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$EXISTS" = "1" ]; then
  echo "  Database '$DB_NAME' already exists, skipping."
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
    "CREATE DATABASE \"$DB_NAME\";"
  echo "  Created '$DB_NAME'."
fi

echo "→ Running Prisma migrations..."
cd "$(dirname "$0")/.." && pnpm exec prisma migrate dev --schema prisma/schema --name init

echo "✓ Database ready."