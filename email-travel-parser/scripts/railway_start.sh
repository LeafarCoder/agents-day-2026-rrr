#!/usr/bin/env bash
set -euo pipefail

export MSGVAULT_HOME="${MSGVAULT_HOME:-/root/.msgvault}"
export OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-/root/.ollama/models}"

mkdir -p "${MSGVAULT_HOME}" "${OLLAMA_MODELS}"

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
enabled = true
backend = "sqlite-vec"

[vector.embeddings]
endpoint = "${OLLAMA_HOST}/v1"
model = "nomic-embed-text"
dimension = 768
batch_size = 8
max_input_chars = 4000
EOF
fi

ollama serve &
OLLAMA_PID="$!"

for _ in $(seq 1 60); do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! ollama list | grep -q '^nomic-embed-text'; then
  ollama pull nomic-embed-text
fi

msgvault init-db || true

exec uvicorn api.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8042}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
