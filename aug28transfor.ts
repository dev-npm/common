{% macro format_speednode(value) %}
    -- 1) remove 'Z50'
    {{ return("concat('zip', replace(replace(" ~ value ~ ", 'Z50', ''), '.', ''))") }}
{% endmacro %}


{% macro format_library(value) %}
    -- Convert to lowercase and append 'zz' at the end
    {{ return("lower(" ~ value ~ ") || 'zz'") }}
{% endmacro %}

{% macro format_tdk(value) %}
    -- Remove dots and append 'tdk'
    {{ return("replace(" ~ value ~ ", '.', '') || 'tdk'") }}
{% endmacro %}


FROM python:3.11-slim

# System deps (psycopg, build tools if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# dbt plugins (Postgres example)
RUN pip install --no-cache-dir dbt-core dbt-postgres

# Project files
COPY . .

# Default envs (override in runtime)
ENV DBT_TARGET=dev
ENV OUT_PATH=data/speednode.json

# Make sure entrypoint is executable
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
#!/usr/bin/env bash
set -euo pipefail

echo "[RUN] Fetch API → JSON"
python ingestion/fetch_speednode.py

echo "[RUN] dbt deps"
dbt deps

echo "[RUN] dbt run (incremental models respected)"
dbt run --profiles-dir . --target ${DBT_TARGET:-dev}

echo "[RUN] dbt test (optional, but recommended)"
dbt test --profiles-dir . --target ${DBT_TARGET:-dev}

echo "[DONE]"
speednode:
  target: dev
  outputs:
    dev:
      type: postgres
      host: ${DB_HOST}
      user: ${DB_USER}
      password: ${DB_PASSWORD}
      port: 5432
      dbname: ${DB_NAME}
      schema: public
      threads: 4
