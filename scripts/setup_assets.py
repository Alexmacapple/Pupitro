"""Install pinned browser audio resources and copy the local MuseScore sound bank."""
from pathlib import Path
import hashlib
import io
import shutil
import tarfile
import urllib.request
import argparse

ROOT = Path(__file__).resolve().parent.parent
URL = "https://registry.npmjs.org/js-synthesizer/-/js-synthesizer-1.13.0.tgz"
SHA256 = "ccb5749ba87c6e15bfbea72be0a91802c27deba4133e6945ac50a7fe37345c35"
SOUNDFONT = Path("/Applications/MuseScore 2.app/Contents/Resources/sound/MuseScore_General.sf3")


def install_native():
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


def download(name, url, digest, limit):
    cache = ROOT / ".cache" / name
    if cache.is_file():
        data = cache.read_bytes()
    else:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(limit + 1)
    if len(data) > limit or hashlib.sha256(data).hexdigest() != digest:
        raise SystemExit(f"Ressource non conforme à l’empreinte attendue : {name}")
    cache.parent.mkdir(exist_ok=True)
    cache.write_bytes(data)
    return data


def extract_files(data, target, files):
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member, name in files.items():
            entry = archive.getmember(member)
            if not entry.isfile():
                raise SystemExit(f"Ressource inattendue : {member}")
            dest = target / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(entry) as source:
                dest.write_bytes(source.read())


def install_standalone():
    assets = ROOT / "reader/assets"
    assets.mkdir(parents=True, exist_ok=True)
    audio = download("js-synthesizer-1.13.0.tgz", URL, SHA256, 10 * 1024 * 1024)
    extract_files(audio, assets, {
        "package/dist/js-synthesizer.min.js": "synth.js",
        "package/externals/libfluidsynth-2.4.6-with-libsndfile.js": "fluidsynth.js",
        "package/LICENSE": "LICENSE.synth.txt",
        "package/externals/LICENSE.fluidsynth.txt": "LICENSE.fluidsynth.txt",
    })
    engine = download("webmscore-0.22.0.tgz", "https://registry.npmjs.org/webmscore/-/webmscore-0.22.0.tgz",
                      "f9e77054dce7c803e6e42949385b5e3e626d902b3722123bd879e9356b5b1992", 20 * 1024 * 1024)
    engine_files = ["webmscore.lib.js", "webmscore.lib.data", "webmscore.lib.wasm",
                    "src/index.js", "src/helper.js", "src/utils.js"]
    engine_map = {"package/" + name: name for name in engine_files}
    # The raw Emscripten entry expects this name; the npm wrapper renames it.
    # Expose the original memory file exactly where the raw entry requests it.
    engine_map["package/webmscore.lib.mem.wasm"] = "webmscore.lib.js.mem"
    extract_files(engine, assets / "webmscore", engine_map)
    archive_reader = download("fflate-0.8.2.tgz", "https://registry.npmjs.org/fflate/-/fflate-0.8.2.tgz",
                              "61fd5061e2fc8e5e3e3129f7f2fec7bd78a313e1bf4becbf1cc1cc9998d141dc", 1024 * 1024)
    extract_files(archive_reader, assets, {"package/esm/browser.js": "fflate.js", "package/LICENSE": "LICENSE.fflate.txt"})
    resources = [
        ("soundfont-lite-0.8.0.sf3", "https://cdn.jsdelivr.net/npm/@librescore/sf3@0.8.0/MuseScore_General_Lite.sf3.wasm",
         "916aaca6b0eb9f9083eb42399614acb2ff4ec72ce28dffff1814592a9696b479", 50 * 1024 * 1024, "standalone/sounds.sf3"),
        ("soundfont-lite-0.8.0.copyright", "https://cdn.jsdelivr.net/npm/@librescore/sf3@0.8.0/MuseScore_General_Lite.copyright",
         "c9d4a8386636ce785be23f1d44e37f21f91ef365bcb9f359844925eb4a3ee220", 100000, "LICENSE.soundfont.txt"),
        ("webmscore-LICENSE.GPL", "https://raw.githubusercontent.com/LibreScore/webmscore/fd19dd923873148bf41dd2af60ccbc66de56e575/LICENSE.GPL",
         "bc24d166988a43a15193672ebaffe9f526785c21b60ff9061b674932b2d83817", 100000, "webmscore/LICENSE.GPL"),
    ]
    for name, url, digest, limit, destination in resources:
        target = assets / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(download(name, url, digest, limit))
    print("Pupitro : moteur, sons et notices installés pour la version autonome ; aucune partition ajoutée.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--standalone", action="store_true")
    if parser.parse_args().standalone:
        install_standalone()
    else:
        install_native()


if __name__ == "__main__":
    main()
