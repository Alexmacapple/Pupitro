"""Serve only the prepared reader; default exposure is loopback."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import ipaddress
import secrets
import json
import threading
from urllib.parse import urlsplit, parse_qs
from convert_score import convert, ConversionError, MAX_UPLOAD

parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--port", type=int, default=8765)
args = parser.parse_args()
directory = Path(__file__).parent / "reader"
is_loopback = ipaddress.ip_address(args.host).is_loopback
if is_loopback:
    prefix = ""
else:
    token_path = Path(__file__).parent / ".access-token"
    if not token_path.exists():
        token_path.write_text(secrets.token_urlsafe(24), encoding="ascii")
        token_path.chmod(0o600)
    prefix = "/" + token_path.read_text(encoding="ascii").strip()
conversion_lock = threading.Lock()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.authorized():
            super().do_GET()

    def do_HEAD(self):
        if self.authorized():
            super().do_HEAD()

    def do_POST(self):
        if not self.authorized():
            return
        request = urlsplit(self.path)
        if request.path != prefix + "/api/import":
            self.send_error(404)
            return
        expected_host = f"{args.host}:{server.server_port}"
        if self.headers.get("Host") != expected_host or self.headers.get("Origin") != f"http://{expected_host}":
            self.json_response(403, {"error": "L’import doit être lancé depuis ce lecteur."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_UPLOAD:
            self.close_connection = True
            self.json_response(413, {"error": "Choisis un fichier .mscz de moins de 50 Mo."})
            return
        if not conversion_lock.acquire(blocking=False):
            self.close_connection = True
            self.json_response(409, {"error": "Le Mac prépare déjà une partition. Réessaie après sa préparation."})
            return
        try:
            filename = parse_qs(request.query).get("name", [""])[0]
            body = self.rfile.read(length)
            if len(body) != length:
                raise ConversionError("Le transfert du fichier est incomplet.")
            manifest = convert(body, filename)
            self.json_response(200, {"manifest": manifest})
        except ConversionError as error:
            self.json_response(422, {"error": str(error)})
        except Exception:
            self.json_response(500, {"error": "La préparation a échoué sur le Mac."})
        finally:
            conversion_lock.release()

    def json_response(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        path = urlsplit(self.path).path
        if prefix and not path.startswith(prefix + "/"):
            self.send_error(404)
            return False
        return True

    def translate_path(self, path):
        return super().translate_path(path[len(prefix):] if prefix else path)

    def log_message(self, fmt, *values):
        # Do not print the temporary access link into request logs.
        values = tuple(str(value).replace(prefix, "/[lien]") if prefix else value for value in values)
        super().log_message(fmt, *values)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


server = ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(directory)))
print(f"Lecteur local : http://{args.host}:{server.server_port}{prefix}/", flush=True)
try:
    server.serve_forever()
finally:
    server.server_close()
