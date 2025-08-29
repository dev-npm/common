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



      from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import requests
import psycopg2

def extract_api():
    url = "https://api.mycompany.com/speednodes"
    response = requests.get(url)
    records = response.json()  # list of speed nodes

    conn = psycopg2.connect(
        host="your-db-host",
        dbname="yourdb",
        user="dbuser",
        password="secret"
    )
    cur = conn.cursor()

    for node in records:
        cur.execute("""
            INSERT INTO staging.speed_node_stg_raw (speed_node_id, speed_node_name)
            VALUES (%s, %s)
        """, (node['speedNodeId'], node['speedNodeName']))

        for tdk in node['tdks']:
            cur.execute("""
                INSERT INTO staging.tdk_stg_raw (tdk_id, tdk_name, speed_node_id)
                VALUES (%s, %s, %s)
            """, (tdk['tdkId'], tdk['tdkName'], node['speedNodeId']))

            for lib in tdk['libraries']:
                cur.execute("""
                    INSERT INTO staging.library_stg_raw (library_id, library_name, tdk_id)
                    VALUES (%s, %s, %s)
                """, (lib['libraryId'], lib['libraryName'], tdk['tdkId']))

                for ver in lib['versions']:
                    cur.execute("""
                        INSERT INTO staging.version_stg_raw (version_id, version_name, library_id)
                        VALUES (%s, %s, %s)
                    """, (ver['versionId'], ver['versionName'], lib['libraryId']))

    conn.commit()
    cur.close()
    conn.close()

with DAG("speednode_etl_dag", start_date=datetime(2025, 8, 1), schedule_interval="@daily", catchup=False) as dag:
    extract_task = PythonOperator(
        task_id="extract_speednode",
        python_callable=extract_api
    )
**************************************8888


import psycopg2
import requests

# Step 1: Fetch API Data
def fetch_speed_node_data():
    response = requests.get("https://your.api.com/speednodes")
    response.raise_for_status()
    return response.json()

# Step 2: DB Connection
def get_conn():
    return psycopg2.connect(
        dbname="yourdb",
        user="youruser",
        password="yourpass",
        host="localhost",
        port=5432
    )

# Step 3: Hierarchical Inserts
def insert_speed_node_data(data):
    conn = get_conn()
    cursor = conn.cursor()

    for node in data:
        # Insert SpeedNode
        cursor.execute("""
            INSERT INTO speed_node (name)
            VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (node["speed_node_name"],))
        speed_node_id = cursor.fetchone()[0]

        for tdk in node.get("tdks", []):
            # Insert TDK
            cursor.execute("""
                INSERT INTO tdk (name, speed_node_id)
                VALUES (%s, %s)
                RETURNING id
            """, (tdk["name"], speed_node_id))
            tdk_id = cursor.fetchone()[0]

            for lib in tdk.get("libraries", []):
                # Insert Library
                cursor.execute("""
                    INSERT INTO library (name, tdk_id)
                    VALUES (%s, %s)
                    RETURNING id
                """, (lib["library_name"], tdk_id))
                library_id = cursor.fetchone()[0]

                for version in lib.get("versions", []):
                    # Insert Version with 3 FKs
                    cursor.execute("""
                        INSERT INTO library_version (name, speed_node_id, tdk_id, library_id)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        version["version_name"],
                        speed_node_id,
                        tdk_id,
                        library_id
                    ))

    conn.commit()
    cursor.close()
    conn.close()

