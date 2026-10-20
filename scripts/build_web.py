"""Build a static PWA from an explicit allowlist, never from user score folders."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "reader"
SHELL = ["index.html", "credits.html", "app.js", "style.css", "library.js", "playback.js", "backup.js", "score-metadata.js",
         "import-score.js", "import-worker.js", "offline.js", "manifest.webmanifest",
         "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"]
ENGINE = ["webmscore.lib.js", "webmscore.lib.data", "webmscore.lib.wasm",
          "webmscore.lib.js.mem", "src/index.js", "src/helper.js", "src/utils.js", "LICENSE.GPL"]
ASSETS = ["assets/fluidsynth.js", "assets/synth.js", "assets/standalone/sounds.sf3",
          "assets/LICENSE.synth.txt", "assets/LICENSE.fluidsynth.txt", "assets/LICENSE.soundfont.txt",
          "assets/fflate.js", "assets/LICENSE.fflate.txt"]
FILES = SHELL + ASSETS + ["assets/webmscore/" + name for name in ENGINE]
OUTPUT_STATE = ".pupitro-build.json"
GENERATED = {"sw.js", "offline-assets.json", ".nojekyll"}


def verify_generated(output, previous, source_worker):
    """Verify generated controls independently of the manifest they describe."""
    state_path = output / OUTPUT_STATE
    if state_path.is_file():
        try:
            raw = state_path.read_bytes()
            state = json.loads(raw)
            if (set(state) != {"format", "sha256"} or state["format"] != 1
                    or not isinstance(state["sha256"], dict) or set(state["sha256"]) != GENERATED
                    or raw != json.dumps(state, sort_keys=True).encode()):
                raise ValueError()
        except (ValueError, TypeError, OSError):
            raise SystemExit("Reçu de construction invalide ou modifié ; sortie conservée.") from None
        for name, digest in state["sha256"].items():
            candidate = output / name
            if candidate.is_file() and hashlib.sha256(candidate.read_bytes()).hexdigest() != digest:
                raise SystemExit("Ancienne ressource modifiée à préserver : " + name)
    else:
        # Upgrade a legacy output only when its old version proves that the
        # current worker template produced it. Otherwise require a fresh output.
        expected = hashlib.sha256((json.dumps(previous["files"], sort_keys=True) + source_worker).encode()).hexdigest()[:20]
        if (set(previous) != {"version", "bytes", "files"} or previous.get("version") != expected
                or (output / "offline-assets.json").read_bytes() != json.dumps(previous, ensure_ascii=False).encode()):
            raise SystemExit("Ancienne sortie sans reçu vérifiable ; choisir un dossier vide. Sortie conservée.")
        worker = output / "sw.js"
        if worker.is_file() and worker.read_bytes() != source_worker.replace("__PUPITRO_BUILD__", expected).encode():
            raise SystemExit("Ancienne ressource modifiée à préserver : sw.js")
        marker = output / ".nojekyll"
        if marker.is_file() and marker.read_bytes() != b"":
            raise SystemExit("Ancienne ressource modifiée à préserver : .nojekyll")


def build(output):
    if output.is_symlink():
        raise SystemExit("Le dossier de sortie ne doit pas être un lien symbolique.")
    output = output.resolve()
    root = ROOT.resolve()
    if root.is_relative_to(output) or (output.is_relative_to(root) and output != root / "web-dist"):
        raise SystemExit("Le dossier de sortie doit être distinct des sources.")
    missing = [name for name in FILES if not (PUBLIC / name).is_file()]
    if missing:
        raise SystemExit("Ressources absentes ; lancer scripts/setup_assets.py --standalone : " + ", ".join(missing))
    source_worker = (PUBLIC / "sw.js").read_text(encoding="utf-8")
    if source_worker.count("__PUPITRO_BUILD__") != 1:
        raise SystemExit("Le Service Worker doit contenir exactement un repère de version.")
    # Preflight every path before any deletion or write, including retained resources.
    allowed = set(FILES) | GENERATED | {OUTPUT_STATE}
    obsolete = []
    if output.exists():
        if not output.is_dir() or any(path.is_symlink() for path in output.rglob("*")):
            raise SystemExit("La sortie contient un lien symbolique ou n’est pas un dossier.")
        previous_manifest = output / "offline-assets.json"
        present = [p for p in output.rglob("*") if p.is_file()]
        if present and not previous_manifest.is_file():
            raise SystemExit("La sortie contient des fichiers étrangers sans manifeste de construction.")
        try:
            previous = json.loads(previous_manifest.read_text()) if previous_manifest.is_file() else {"files": []}
            if not isinstance(previous, dict) or not isinstance(previous.get("files"), list):
                raise ValueError()
        except (ValueError, OSError):
            raise SystemExit("Ancien manifeste de sortie invalide.") from None
        if present:
            verify_generated(output, previous, source_worker)
        owned = GENERATED | {OUTPUT_STATE}
        for entry in previous["files"]:
            if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
                raise SystemExit("Ancien manifeste de sortie invalide.")
            name = entry["path"]
            candidate = output / name
            if not name or Path(name).is_absolute() or ".." in Path(name).parts or not candidate.resolve().is_relative_to(output) or name in owned:
                raise SystemExit("Ancien manifeste de sortie invalide.")
            owned.add(name)
            if candidate.is_file():
                if hashlib.sha256(candidate.read_bytes()).hexdigest() != entry.get("sha256"):
                    raise SystemExit("Ancienne ressource modifiée à préserver : " + name)
                if name not in allowed:
                    obsolete.append(candidate)
        extra = [str(p.relative_to(output)) for p in present if str(p.relative_to(output)) not in owned]
        if extra:
            raise SystemExit("La sortie contient des fichiers étrangers : " + ", ".join(extra[:5]))
        for name in allowed:
            target = output / name
            if target.exists() and not target.is_file():
                raise SystemExit("Chemin de sortie occupé par un dossier : " + name)
    output.mkdir(parents=True, exist_ok=True)
    for candidate in obsolete:
        candidate.unlink()
    entries = []
    for name in FILES:
        data = (PUBLIC / name).read_bytes()
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        entries.append({"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    version = hashlib.sha256((json.dumps(entries, sort_keys=True) + source_worker).encode()).hexdigest()[:20]
    worker = source_worker.replace("__PUPITRO_BUILD__", version)
    (output / "sw.js").write_text(worker, encoding="utf-8")
    manifest = {"version": version, "bytes": sum(item["bytes"] for item in entries), "files": entries}
    (output / "offline-assets.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    (output / ".nojekyll").write_text("")
    state = {"format": 1, "sha256": {name: hashlib.sha256((output / name).read_bytes()).hexdigest()
                                    for name in sorted(GENERATED)}}
    (output / OUTPUT_STATE).write_bytes(json.dumps(state, sort_keys=True).encode())
    print(json.dumps({"output": str(output), "files": len(entries), "bytes": manifest["bytes"], "version": version}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "web-dist")
    build(parser.parse_args().output)
