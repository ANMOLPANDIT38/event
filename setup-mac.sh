#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is not installed. Install Python 3.11+ from python.org or Homebrew."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed. Install Node.js 24+ via Homebrew or nvm."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//')
NODE_MAJOR=${NODE_VERSION%%.*}
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERROR: Node.js 22.13+ or 24+ is required. Found v$NODE_VERSION."
  exit 1
fi

python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip setuptools wheel
python -m pip install -r forecasting/requirements.txt

cd backend
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install

echo "Setup complete. Use ./.venv/bin/python and npm from your shell to start services."