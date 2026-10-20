#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
python3 scripts/build_web.py
exec python3 -m http.server "${1:-8770}" --bind 127.0.0.1 --directory web-dist
