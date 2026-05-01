#!/usr/bin/env bash
set -euo pipefail

export MSGVAULT_HOME="${MSGVAULT_HOME:-/root/.msgvault}"

mkdir -p "${MSGVAULT_HOME}"

if [ ! -f "${MSGVAULT_HOME}/config.toml" ]; then
  cat > "${MSGVAULT_HOME}/config.toml" <<EOF
[data]
data_dir = "${MSGVAULT_HOME}"
database_url = "${MSGVAULT_HOME}/msgvault.db"

[oauth]
client_secrets = "/app/credentials.json"

[sync]
rate_limit_qps = 5

[vector]
enabled = false
backend = "sqlite-vec"
EOF
fi

timeout 15 msgvault init-db || true

exec uvicorn api.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8042}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
