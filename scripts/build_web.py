"""Build a static PWA from an explicit allowlist, never from user score folders."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "reader"
SHELL = ["index.html", "credits.html", "app.js", "style.css", "library.js", "playback.js",
         "import-score.js", "import-worker.js", "offline.js", "manifest.webmanifest",
         "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"]
ENGINE = ["webmscore.lib.js", "webmscore.lib.data", "webmscore.lib.wasm",
          "webmscore.lib.js.mem", "src/index.js", "src/helper.js", "src/utils.js", "LICENSE.GPL"]
ASSETS = ["assets/fluidsynth.js", "assets/synth.js", "assets/standalone/sounds.sf3",
          "assets/LICENSE.synth.txt", "assets/LICENSE.fluidsynth.txt", "assets/LICENSE.soundfont.txt",
          "assets/fflate.js", "assets/LICENSE.fflate.txt"]
FILES = SHELL + ASSETS + ["assets/webmscore/" + name for name in ENGINE]


def build(output):
    output = output.resolve()
    if output == ROOT or output == PUBLIC or ROOT.is_relative_to(output):
        raise SystemExit("Le dossier de sortie doit être distinct des sources.")
    missing = [name for name in FILES if not (PUBLIC / name).is_file()]
    if missing:
        raise SystemExit("Ressources absentes ; lancer scripts/setup_assets.py --standalone : " + ", ".join(missing))
    # Refuse to reuse a directory containing files outside this build's ownership.
    allowed = set(FILES + ["sw.js", "offline-assets.json", ".nojekyll"])
    if output.exists():
        previous_manifest = output / "offline-assets.json"
        previous = json.loads(previous_manifest.read_text()) if previous_manifest.is_file() else {}
        for entry in previous.get("files", []):
            name = entry.get("path", "")
            candidate = output / name
            if not name or not candidate.resolve().is_relative_to(output):
                raise SystemExit("Ancien manifeste de sortie invalide.")
            if name not in allowed and candidate.is_file():
                if hashlib.sha256(candidate.read_bytes()).hexdigest() != entry.get("sha256"):
                    raise SystemExit("Ancienne ressource modifiée à préserver : " + name)
                candidate.unlink()
        extra = [str(p.relative_to(output)) for p in output.rglob("*") if p.is_file() and str(p.relative_to(output)) not in allowed]
        if extra:
            raise SystemExit("La sortie contient des fichiers étrangers : " + ", ".join(extra[:5]))
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for name in FILES:
        data = (PUBLIC / name).read_bytes()
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        entries.append({"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    source_worker = (PUBLIC / "sw.js").read_text(encoding="utf-8")
    version = hashlib.sha256((json.dumps(entries, sort_keys=True) + source_worker).encode()).hexdigest()[:20]
    worker = source_worker.replace("__PUPITRO_BUILD__", version)
    (output / "sw.js").write_text(worker, encoding="utf-8")
    manifest = {"version": version, "bytes": sum(item["bytes"] for item in entries), "files": entries}
    (output / "offline-assets.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    (output / ".nojekyll").write_text("")
    print(json.dumps({"output": str(output), "files": len(entries), "bytes": manifest["bytes"], "version": version}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "web-dist")
    build(parser.parse_args().output)
