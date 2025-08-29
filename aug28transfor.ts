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



from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator
from kubernetes.client import models as k8s

# ---- K8s objects: mount profiles ConfigMap and pull creds from Secret ----
profiles_volume = k8s.V1Volume(
    name="profiles",
    config_map=k8s.V1ConfigMapVolumeSource(name="dbt-profiles-config")
)
profiles_mount = k8s.V1VolumeMount(
    name="profiles",
    mount_path="/usr/app/profiles",
    read_only=True
)

env_vars = [
    k8s.V1EnvVar(name="DBT_PROFILES_DIR", value="/usr/app/profiles"),
    k8s.V1EnvVar(name="DB_HOST",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DB_HOST"))),
    k8s.V1EnvVar(name="DB_PORT",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DB_PORT"))),
    k8s.V1EnvVar(name="DB_NAME",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DB_NAME"))),
    k8s.V1EnvVar(name="DB_SCHEMA",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DB_SCHEMA"))),
    k8s.V1EnvVar(name="DB_USER",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DB_USER"))),
    # dbt masks DBT_ENV_SECRET_* in logs
    k8s.V1EnvVar(name="DBT_ENV_SECRET_DB_PASSWORD",
                 value_from=k8s.V1EnvVarSource(
                     secret_key_ref=k8s.V1SecretKeySelector(name="dbt-secrets", key="DBT_ENV_SECRET_DB_PASSWORD"))),
]

default_args = {
    "owner": "data-eng",
    "retries": 1,
    "retry_delay": timedelta(minutes=3),
}

with DAG(
    dag_id="dbt_build",
    start_date=datetime(2025, 1, 1),
    schedule=None,  # trigger manually for demo; set cron later
    catchup=False,
    default_args=default_args,
    tags=["dbt", "kubernetes"],
) as dag:

    dbt_build = KubernetesPodOperator(
        task_id="dbt_build_task",
        name="dbt-build",
        namespace="default",                           # <--- change if you use another ns
        image="harbor.myco.io/data/my-dbt:latest",     # <--- your DBT image
        cmds=["dbt"],
        arguments=["build", "--no-use-colors"],        # run dbt build
        env_vars=env_vars,
        volumes=[profiles_volume],
        volume_mounts=[profiles_mount],
        get_logs=True,
        is_delete_operator_pod=True,                   # auto-clean pod after success
        image_pull_policy="IfNotPresent",
        # service_account_name="airflow",              # set if you use a custom SA/RBAC
        startup_timeout_seconds=600,
    )

