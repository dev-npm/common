---
# ✅ Full Working Setup for `dev` Environment with Kubeconfig Integration

# 📁 Folder Structure
k8s/
├── dev/
│   ├── configmap.yaml          # ConfigMap specific to dev
│   ├── secrets.yaml            # Secret specific to dev (generated dynamically)
│   └── deployment.yaml         # Deployment referencing dev config & secret
.github/
  workflows/
    └── deploy-dev.yaml         # GitHub Actions workflow

---
# 🔐 Step 1: Create `k8s/dev/configmap.yaml`
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config-dev
  namespace: dev
data:
  AZURE_CLIENT_ID: "client-dev"
  AZURE_TENANT_ID: "tenant-dev"

---
# 🔐 Step 2: Create Secret YAML (name `myapp-secrets-dev`, dynamically generated)

### It will be generated dynamically in the GitHub Actions workflow. Do **not** store this YAML in Git.

---
# 🚀 Step 3: Create `k8s/dev/deployment.yaml`
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry/myapp:latest
          env:
            - name: AZURE_CLIENT_ID
              valueFrom:
                configMapKeyRef:
                  name: myapp-config-dev
                  key: AZURE_CLIENT_ID
            - name: AZURE_TENANT_ID
              valueFrom:
                configMapKeyRef:
                  name: myapp-config-dev
                  key: AZURE_TENANT_ID
            - name: DB_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets-dev
                  key: DB_CONNECTION_STRING
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets-dev
                  key: API_KEY

---
# 🧑‍💻 Step 4: GitHub Secrets Setup

In GitHub → Repo → Settings → Secrets and Variables → **Actions**:

| Secret Name                | Purpose                          |
|----------------------------|----------------------------------|
| `KUBE_CONFIG_B64`          | Your base64-encoded kubeconfig   |
| `DB_CONNECTION_STRING_DEV` | Dev database connection string   |
| `API_KEY_DEV`              | Dev API key                      |

### How to get `KUBE_CONFIG_B64`
```bash
# From your local dev machine:
cat ~/.kube/config | base64 -w 0
```
Copy the output and paste it as the value for `KUBE_CONFIG_B64` secret in GitHub.

---
# ✅ Step 5: `.github/workflows/deploy-dev.yaml`

```yaml
name: Deploy to Dev

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ENV: dev

    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Set up KUBECONFIG
        run: |
          echo "${{ secrets.KUBE_CONFIG_B64 }}" | base64 --decode > kubeconfig.yaml
          export KUBECONFIG=$PWD/kubeconfig.yaml
        shell: bash

      - name: Create secrets-dev.yaml from GitHub Secrets
        run: |
          cat <<EOF > secrets-dev.yaml
          apiVersion: v1
          kind: Secret
          metadata:
            name: myapp-secrets-dev
            namespace: dev
          type: Opaque
          stringData:
            DB_CONNECTION_STRING: "${{ secrets.DB_CONNECTION_STRING_DEV }}"
            API_KEY: "${{ secrets.API_KEY_DEV }}"
          EOF

      - name: Apply ConfigMap
        run: kubectl apply -f k8s/dev/configmap.yaml

      - name: Apply Secret
        run: kubectl apply -f secrets-dev.yaml

      - name: Deploy Application
        run: kubectl apply -f k8s/dev/deployment.yaml

      - name: Cleanup
        run: rm secrets-dev.yaml
```

---
# ✅ Summary
| Component              | Purpose                             |
|------------------------|-------------------------------------|
| `configmap.yaml`       | Stores AZURE_CLIENT_ID + TENANT_ID  |
| `secrets-dev.yaml`     | Stores DB/API keys (generated live) |
| `deployment.yaml`      | Connects config + secrets to pod    |
| `KUBE_CONFIG_B64`      | Authenticates GitHub to your cluster|
| `deploy-dev.yaml`      | Full CI/CD pipeline with security   |

Use this structure and workflow to maintain clean, per-environment deployments securely via GitHub Actions.
