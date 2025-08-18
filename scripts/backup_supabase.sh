#!/bin/bash
# Backup Supabase PostgreSQL database using credentials from server/.env

# Load environment variables from .env
env_file="$(dirname "$0")/../server/.env"
if [ -f "$env_file" ]; then
  echo "Loading environment variables from $env_file"
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$env_file" | grep -v '^//' | xargs)
else
  echo ".env file not found in $(dirname "$0")/../server — continuing with existing environment variables"
fi

# Check required variables
if [[ -z "$PGHOST" || -z "$PGPORT" || -z "$PGUSER" || -z "$PGPASSWORD" || -z "$PGDATABASE" ]]; then
  echo "Missing one or more required PG* environment variables in .env"
  exit 1
fi

# Output file with timestamp
BACKUP_DIR="$(dirname "$0")/../.dbbackups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Using env file: $env_file"
echo "PGHOST=$PGHOST"
echo "PGPORT=$PGPORT"
echo "PGUSER=$PGUSER"
echo "PGDATABASE=$PGDATABASE"
echo "Backup directory: $BACKUP_DIR"
echo "Backup file: $BACKUP_FILE"

PGDUMP_EXECUTABLE="${PGDUMP_EXECUTABLE:-pg_dump}"
echo "Using pg_dump executable: $PGDUMP_EXECUTABLE"

# Run pg_dump
PGPASSWORD="$PGPASSWORD" $PGDUMP_EXECUTABLE -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -F c -b -v -f "$BACKUP_FILE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "Backup complete: $BACKUP_FILE"
else
  echo "Backup failed with exit code $EXIT_CODE."
  exit 1
fi
