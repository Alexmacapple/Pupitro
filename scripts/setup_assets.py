"""Install pinned browser audio resources and copy the local MuseScore sound bank."""
from pathlib import Path
import hashlib
import io
import shutil
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
URL = "https://registry.npmjs.org/js-synthesizer/-/js-synthesizer-1.13.0.tgz"
SHA256 = "ccb5749ba87c6e15bfbea72be0a91802c27deba4133e6945ac50a7fe37345c35"
SOUNDFONT = Path("/Applications/MuseScore 2.app/Contents/Resources/sound/MuseScore_General.sf3")


def main():
    if not SOUNDFONT.is_file():
        raise SystemExit("MuseScore 2 et sa banque MuseScore_General.sf3 sont nécessaires sur ce Mac.")
    cache = ROOT / ".cache/js-synthesizer-1.13.0.tgz"
    if cache.is_file():
        data = cache.read_bytes()
    elif (ROOT / "js-synthesizer-1.13.0.tgz").is_file():
        data = (ROOT / "js-synthesizer-1.13.0.tgz").read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=30) as response:
            data = response.read(10 * 1024 * 1024 + 1)
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise SystemExit("L’archive audio ne correspond pas à l’empreinte attendue ; installation arrêtée.")
    cache.parent.mkdir(exist_ok=True)
    cache.write_bytes(data)
    assets = ROOT / "reader/assets"
    assets.mkdir(parents=True, exist_ok=True)
    files = {
        "package/dist/js-synthesizer.min.js": "synth.js",
        "package/externals/libfluidsynth-2.4.6-with-libsndfile.js": "fluidsynth.js",
        "package/LICENSE": "LICENSE.synth.txt",
        "package/externals/LICENSE.fluidsynth.txt": "LICENSE.fluidsynth.txt",
    }
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member, name in files.items():
            entry = archive.getmember(member)
            if not entry.isfile():
                raise SystemExit(f"Ressource inattendue dans l’archive : {member}")
            with archive.extractfile(entry) as source:
                (assets / name).write_bytes(source.read())
    shutil.copyfile(SOUNDFONT, assets / "sounds.sf3")
    print("Pupitro : ressources audio installées ; aucune partition ajoutée.")


if __name__ == "__main__":
    main()
