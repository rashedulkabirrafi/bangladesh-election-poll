#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <script.py> [args...]" >&2
  exit 1
fi

if [ -x "../.venv/bin/python" ]; then
  PYTHON_BIN="../.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python interpreter not found (tried ../.venv/bin/python, python3, python)." >&2
  exit 1
fi

exec "$PYTHON_BIN" "$@"
