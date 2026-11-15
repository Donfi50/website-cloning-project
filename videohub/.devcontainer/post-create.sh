#!/usr/bin/env bash
# Runs once when a GitHub Codespace is created: installs ffmpeg, writes .env, starts the database and storage.
set -euo pipefail

sudo apt-get update -y
sudo apt-get install -y ffmpeg

[ -f .env ] || cp .env.example .env
set_env() { sed -i "s|^$1=.*|$1=$2|" .env; }   # replaces an existing KEY=value line
set_env AUTH_SECRET "$(openssl rand -base64 32 | tr -d '\n')"

if [ -n "${CODESPACE_NAME:-}" ]; then
  D="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  APP="https://${CODESPACE_NAME}-3000.${D}"
  STORE="https://${CODESPACE_NAME}-9000.${D}"
  set_env APP_URL "$APP"
  set_env S3_SECRET "$(openssl rand -hex 16)"     # the storage port gets exposed, so don't keep the default password
  set_env NEXT_PUBLIC_CDN_URL "$STORE/videohub"
  {
    echo "AUTH_URL=$APP"
    echo "S3_PUBLIC_ENDPOINT=$STORE"
    echo "MINIO_CORS_ORIGIN=$APP"
  } >> .env
fi

npm ci
docker compose up -d

for i in 1 2 3 4 5 6 7 8 9 10; do
  npx prisma migrate dev --name init && break
  echo "Database not ready yet (attempt $i of 10), retrying..."
  sleep 3
done

echo
echo "Ready. Run:  npm run dev   and, in a second terminal,  npm run worker"
echo "In the Ports tab, right-click port 9000 and set Port Visibility to Public (needed for video uploads and playback)."
