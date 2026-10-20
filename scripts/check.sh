#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
python_bin=python3
if [[ -x .venv/bin/python ]]; then python_bin=.venv/bin/python; fi
"$python_bin" - <<'PY'
import ast
from pathlib import Path
for path in [*Path('.').glob('*.py'), *Path('scripts').glob('*.py')]:
    ast.parse(path.read_text(), filename=str(path))
print('Python : syntaxe correcte')
PY
"$python_bin" -m unittest discover -s tests -p 'test_*.py'
for source in reader/*.js; do node --check "$source"; done
for source in tests/*.cjs; do node --check "$source"; done
npm test
"$python_bin" scripts/build_web.py
if [[ "${1:-}" == "--native" ]]; then
  "$python_bin" - <<'PY'
from pathlib import Path
import fitz
assert Path('/Applications/MuseScore 2.app/Contents/MacOS/mscore').is_file(), 'MuseScore 2 absent'
print('Ancienne conversion native : PyMuPDF et MuseScore 2 disponibles')
PY
fi
printf '%s\n' 'JavaScript : syntaxe correcte'
