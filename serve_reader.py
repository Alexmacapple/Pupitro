"""Serve only the prepared reader; default exposure is loopback."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import ipaddress
import secrets
import json
import threading
import time
import traceback
from urllib.parse import urlsplit, parse_qs
from convert_score import convert, ConversionError, MAX_UPLOAD


def authority_for_endpoint(authority, local_host, local_port):
    """Accept a numeric local endpoint, or localhost only on loopback; never DNS."""
    if not authority or authority.endswith(":") or any(char.isspace() or char in "/?#@" for char in authority):
        return None
    try:
        parsed = urlsplit("http://" + authority)
        if parsed.username is not None or parsed.password is not None or parsed.path or parsed.query or parsed.fragment:
            return None
        port = parsed.port if parsed.port is not None else 80
        local_ip = ipaddress.ip_address(local_host)
        if parsed.hostname == "localhost" and local_ip.is_loopback:
            host = "localhost"
        else:
            host_ip = ipaddress.ip_address(parsed.hostname)
            if host_ip != local_ip:
                return None
            host = str(host_ip)
        return (host, port) if port == local_port else None
    except (ValueError, TypeError):
        return None


class LegacyHTTPServer(ThreadingHTTPServer):
    def __init__(self, address, *, directory, prefix="", converter=convert, upload_timeout=30):
        if not 0 < upload_timeout < float("inf"):
            raise ValueError("Le délai d’envoi doit être positif et fini.")
        self.prefix = prefix
        self.converter = converter
        self.upload_timeout = upload_timeout
        self.conversion_lock = threading.Lock()
        super().__init__(address, partial(Handler, directory=str(directory)))


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
        if request.path != self.server.prefix + "/api/import":
            self.send_error(404)
            return
        if not self.same_origin():
            self.close_connection = True
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
        if not self.server.conversion_lock.acquire(blocking=False):
            self.close_connection = True
            self.json_response(409, {"error": "Le Mac prépare déjà une partition. Réessaie après sa préparation."})
            return
        try:
            filename = parse_qs(request.query).get("name", [""])[0]
            try:
                body = self.read_upload(length)
            except TimeoutError:
                self.close_connection = True
                self.json_response(408, {"error": "Le délai d’envoi a expiré. Réessaie l’import."})
                return
            manifest = self.server.converter(body, filename)
            self.json_response(200, {"manifest": manifest})
        except ConversionError as error:
            self.json_response(422, {"error": str(error)})
        except Exception:
            self.log_message("Échec de préparation :\n%s", traceback.format_exc())
            self.json_response(500, {"error": "La préparation a échoué sur le Mac."})
        finally:
            self.server.conversion_lock.release()

    def same_origin(self):
        hosts = self.headers.get_all("Host", [])
        origins = self.headers.get_all("Origin", [])
        if len(hosts) != 1 or len(origins) != 1 or any(char.isspace() or char in "?#" for char in origins[0]):
            return False
        local_host, local_port = self.connection.getsockname()[:2]
        host = authority_for_endpoint(hosts[0], local_host, local_port)
        try:
            origin = urlsplit(origins[0])
        except ValueError:
            return False
        if origin.scheme != "http" or origin.path or origin.query or origin.fragment:
            return False
        origin_host = authority_for_endpoint(origin.netloc, local_host, local_port)
        return host is not None and host == origin_host

    def read_upload(self, length):
        deadline = time.monotonic() + self.server.upload_timeout
        previous_timeout = self.connection.gettimeout()
        body = bytearray()
        try:
            while len(body) < length:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("Upload deadline exceeded")
                self.connection.settimeout(remaining)
                chunk = self.rfile.read1(min(64 * 1024, length - len(body)))
                if time.monotonic() >= deadline:
                    raise TimeoutError("Upload deadline exceeded")
                if not chunk:
                    self.close_connection = True
                    raise ConversionError("Le transfert du fichier est incomplet.")
                body.extend(chunk)
            return bytes(body)
        finally:
            self.connection.settimeout(previous_timeout)

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
        prefix = self.server.prefix
        if prefix and not path.startswith(prefix + "/"):
            self.send_error(404)
            return False
        return True

    def translate_path(self, path):
        prefix = self.server.prefix
        return super().translate_path(path[len(prefix):] if prefix else path)

    def log_message(self, fmt, *values):
        # Do not print the temporary access link into request logs.
        token = self.server.prefix.removeprefix("/")
        fmt = fmt.replace(token, "[lien]") if token else fmt
        values = tuple(value.replace(token, "[lien]") if token and isinstance(value, str) else value for value in values)
        super().log_message(fmt, *values)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    directory = Path(__file__).parent / "reader"
    prefix = ""
    if not ipaddress.ip_address(args.host).is_loopback:
        token_path = Path(__file__).parent / ".access-token"
        if not token_path.exists():
            token_path.write_text(secrets.token_urlsafe(24), encoding="ascii")
            token_path.chmod(0o600)
        prefix = "/" + token_path.read_text(encoding="ascii").strip()
    with LegacyHTTPServer((args.host, args.port), directory=directory, prefix=prefix) as server:
        print(f"Lecteur local : http://{args.host}:{server.server_port}{prefix}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
