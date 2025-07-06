kubectl create secret generic db-credentials \
  --from-literal=DB_NAME=mydbname \
  --from-literal=DB_USER=myuser \
  --from-literal=DB_PASSWORD=mysecretpassword \
  --from-literal=DB_HOST=mydb.rds.amazonaws.com \
  --from-literal=DB_PORT=5432
