#!/usr/bin/env bash
set -Eeuo pipefail

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=e2e_password="$E2E_DB_PASSWORD" <<'SQL'
CREATE ROLE lucem_e2e LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 30 PASSWORD :'e2e_password';
CREATE DATABASE lucem_retail_e2e OWNER lucem_e2e;
REVOKE ALL ON DATABASE lucem_retail_e2e FROM PUBLIC;
SQL
