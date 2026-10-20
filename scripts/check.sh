#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
python_bin=python3
if [[ -x .venv/bin/python ]]; then python_bin=.venv/bin/python; fi
"$python_bin" - <<'PY'
import ast
from pathlib import Path
import fitz
for path in [*Path('.').glob('*.py'), *Path('scripts').glob('*.py')]:
    ast.parse(path.read_text(), filename=str(path))
assert Path('/Applications/MuseScore 2.app/Contents/MacOS/mscore').is_file(), 'MuseScore 2 absent'
for name in ('synth.js', 'fluidsynth.js', 'sounds.sf3'):
    assert (Path('reader/assets') / name).is_file(), f'Ressource absente : {name}'
print('Python : syntaxe, PyMuPDF et dépendances locales disponibles')
PY
node --check reader/app.js
printf '%s\n' 'JavaScript : syntaxe correcte'
