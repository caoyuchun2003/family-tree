#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-baidu-test}"
APP_DIR="${APP_DIR:-/opt/apps/family-tree}"
TARBALL="${TARBALL:-/private/tmp/family-tree-api-deploy.tar.gz}"

cd "$ROOT"
tar -czf "$TARBALL" \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./data' \
  --exclude='./.git' \
  backend docker-compose.yml

scp "$TARBALL" "$REMOTE_HOST:/tmp/family-tree-api-deploy.tar.gz"
ssh "$REMOTE_HOST" "mkdir -p '$APP_DIR'; tar -xzf /tmp/family-tree-api-deploy.tar.gz -C '$APP_DIR'; mkdir -p '$APP_DIR/data'; cd '$APP_DIR'; podman-compose up -d --build api; podman exec family-tree-api python -c 'import urllib.request; print(urllib.request.urlopen(\"http://127.0.0.1:18091/health\").read().decode())'"
echo "API deployed to $REMOTE_HOST:$APP_DIR"
