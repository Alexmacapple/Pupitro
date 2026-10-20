"""Prepare user-selected MSCZ files with this Mac's installed MuseScore 2."""
from pathlib import Path
import json
import os
import signal
import subprocess
import sys
import uuid
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).parent
MSCORE = Path("/Applications/MuseScore 2.app/Contents/MacOS/mscore")
MAX_UPLOAD = 50 * 1024 * 1024


class ConversionError(Exception):
    pass


def convert(data: bytes, filename: str) -> str:
    if not filename.lower().endswith(".mscz"):
        raise ConversionError("Choisis un fichier MuseScore au format .mscz.")
    if not MSCORE.is_file():
        raise ConversionError("MuseScore 2 est introuvable sur le Mac.")
    score_id = uuid.uuid4().hex
    work = ROOT / "imports" / score_id
    work.mkdir(parents=True)
    source = work / "reference.mscz"
    source.write_bytes(data)
    try:
        with zipfile.ZipFile(source) as archive:
            if sum(item.file_size for item in archive.infolist()) > 200 * 1024 * 1024:
                raise ConversionError("Le contenu décompressé dépasse la capacité de cet essai (200 Mo).")
            score_xml = next((name for name in archive.namelist() if name.lower().endswith(".mscx")), None)
            if score_xml is None:
                raise ConversionError("Ce fichier ne contient pas de partition MuseScore.")
            document = ET.fromstring(archive.read(score_xml))
            version = document.get("version", "")
            if not version or not version.split(".")[0].isdigit():
                raise ConversionError("La version du fichier MuseScore est inconnue.")
            if int(version.split(".")[0]) > 2:
                raise ConversionError("Ce fichier vient de MuseScore 3 ou 4. Ce lecteur utilise MuseScore 2 et accepte ses fichiers compatibles.")
    except zipfile.BadZipFile as error:
        raise ConversionError("Le fichier .mscz n’est pas une archive MuseScore valide.") from error
    except ET.ParseError as error:
        raise ConversionError("Le contenu de la partition MuseScore est invalide.") from error

    job = work / "export-job.json"
    job.write_text(json.dumps([
        {"in": str(source), "out": str(work / f"reference.{extension}")}
        for extension in ("pdf", "mid", "mpos", "spos")
    ]), encoding="utf-8")
    log_path = work / "conversion.log"
    with log_path.open("wb") as log:
        process = subprocess.Popen(
            [str(MSCORE), "-c", str(work / "config"), "-s", "-r", "160", "-j", str(job)],
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        )
        try:
            result = process.wait(timeout=120)
        except subprocess.TimeoutExpired as error:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            raise ConversionError("La préparation a dépassé deux minutes ; la conversion a été arrêtée.") from error
        if result != 0 or any(not (work / f"reference.{ext}").is_file() for ext in ("pdf", "mid", "mpos", "spos")):
            raise ConversionError("MuseScore 2 n’a pas pu préparer cette partition. Le journal est conservé sur le Mac.")
        public = ROOT / "reader/scores" / score_id
        preparation = subprocess.run(
            [sys.executable, str(ROOT / "prepare_reader.py"),
             "--exports", str(work), "--output", str(public),
             "--asset-url", f"scores/{score_id}/", "--pdf", "reference.pdf",
             "--title", Path(filename).stem],
            stdout=log, stderr=subprocess.STDOUT, timeout=120,
        )
    if preparation.returncode != 0:
        raise ConversionError("La partition a été exportée mais sa préparation pour le lecteur a échoué. Le journal est conservé sur le Mac.")
    return f"scores/{score_id}/score.json"
