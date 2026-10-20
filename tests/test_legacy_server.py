"""Exercise the optional Mac HTTP boundary with a stub, never MuseScore."""
from contextlib import contextmanager, redirect_stderr
from http.client import HTTPConnection, HTTPResponse
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import importlib
import io
import json
import socket
import sys
import threading
import time
import unittest


class LegacyServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Imports must ignore the caller's argv and must not bind or create tokens.
        with patch.object(sys, "argv", ["unittest", "--not-a-server-option"]), \
                patch("http.server.ThreadingHTTPServer.__init__", side_effect=AssertionError("server bound during import")), \
                patch.object(Path, "write_text", side_effect=AssertionError("file written during import")):
            cls.module = importlib.import_module("serve_reader")

    @contextmanager
    def server(self, *, converter=None, deadline=0.15):
        calls = []

        def prepare(data, filename):
            calls.append((data, filename))
            return "scores/stub/score.json"

        with TemporaryDirectory() as directory:
            output = io.StringIO()
            with redirect_stderr(output):
                server = self.module.LegacyHTTPServer(
                    ("0.0.0.0", 0), directory=directory, prefix="/private-test-token",
                    converter=converter or prepare, upload_timeout=deadline,
                )
                server.daemon_threads = False
                thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
                thread.start()
                try:
                    yield server, calls, output
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=2)
                    self.assertFalse(thread.is_alive())

    def post(self, server, *, body=b"mscz", host=None, origin=None, path=None, length=None):
        port = server.server_port
        host = host or f"127.0.0.1:{port}"
        origin = origin if origin is not None else "http://" + host
        client = HTTPConnection("127.0.0.1", port, timeout=2)
        try:
            headers = {"Host": host, "Content-Length": str(len(body) if length is None else length)}
            if origin:
                headers["Origin"] = origin
            client.request("POST", path or "/private-test-token/api/import?name=score.mscz", body, headers)
            response = client.getresponse()
            return response.status, json.loads(response.read())
        finally:
            client.close()

    def test_wildcard_listener_accepts_local_endpoint_and_loopback_alias(self):
        with self.server() as (server, calls, _):
            self.assertEqual(self.post(server)[0], 200)
            self.assertEqual(self.post(server, host=f"localhost:{server.server_port}")[0], 200)
            self.assertEqual(calls, [(b"mscz", "score.mscz")] * 2)

    def test_rejects_foreign_authorities_and_bad_origins(self):
        with self.server() as (server, calls, _):
            port = server.server_port
            cases = [
                (f"192.0.2.10:{port}", f"http://192.0.2.10:{port}"),
                (f"0.0.0.0:{port}", f"http://0.0.0.0:{port}"),
                (f"evil.example:{port}", f"http://evil.example:{port}"),
                (f"127.0.0.1:{port}", f"http://evil.example:{port}"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port + 1}"),
                (f"127.0.0.1:{port}", f"http://localhost:{port}"),
                (f"127.0.0.1:{port}", f"https://127.0.0.1:{port}"),
                (f"127.0.0.1:{port}", f"http://name@127.0.0.1:{port}"),
                (f"name@127.0.0.1:{port}", f"http://127.0.0.1:{port}"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port}/path"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port}?query"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port}#fragment"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port}?"),
                (f"127.0.0.1:{port}", f"http://127.0.0.1:{port}#"),
                (f"127.0.0.1:{port}?", f"http://127.0.0.1:{port}"),
                (f"127.0.0.1:{port}", "null"),
                (f"127.0.0.1:{port}", ""),
                (f"127.0.0.1:{port}:", f"http://127.0.0.1:{port}"),
            ]
            for host, origin in cases:
                with self.subTest(host=host, origin=origin):
                    self.assertEqual(self.post(server, host=host, origin=origin)[0], 403)
            self.assertEqual(calls, [])

    def test_numeric_and_loopback_authority_normalization(self):
        normalize = self.module.authority_for_endpoint
        self.assertEqual(normalize("LOCALHOST:8765", "127.0.0.1", 8765), ("localhost", 8765))
        self.assertEqual(normalize("[::1]:8765", "::1", 8765), ("::1", 8765))
        self.assertEqual(normalize("127.0.0.1", "127.0.0.1", 80), ("127.0.0.1", 80))
        self.assertIsNone(normalize("localhost:8765", "192.0.2.1", 8765))
        self.assertIsNone(normalize("name.example:8765", "127.0.0.1", 8765))
        self.assertIsNone(normalize("127.0.0.1:", "127.0.0.1", 80))

    def test_missing_or_duplicate_authority_headers_are_rejected(self):
        with self.server() as (server, calls, _):
            authority = f"127.0.0.1:{server.server_port}"
            origin = "http://" + authority
            cases = [
                [("Origin", origin)],
                [("Host", authority), ("Host", authority), ("Origin", origin)],
                [("Host", authority), ("Origin", origin), ("Origin", origin)],
            ]
            for headers in cases:
                with self.subTest(headers=headers):
                    client = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
                    try:
                        client.putrequest("POST", "/private-test-token/api/import?name=score.mscz", skip_host=True)
                        for name, value in headers:
                            client.putheader(name, value)
                        client.putheader("Content-Length", "1")
                        client.endheaders(b"a")
                        response = client.getresponse()
                        self.assertEqual(response.status, 403)
                        response.read()
                    finally:
                        client.close()
            self.assertEqual(calls, [])

    def test_token_is_required_before_import(self):
        with self.server() as (server, calls, _):
            client = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
            try:
                client.request("POST", "/wrong/api/import", body=b"mscz")
                self.assertEqual(client.getresponse().status, 404)
            finally:
                client.close()
            self.assertEqual(calls, [])

    def test_invalid_size_and_busy_converter_preserve_responses(self):
        with self.server() as (server, calls, _):
            self.assertEqual(self.post(server, body=b"", length=0)[0], 413)
            self.assertEqual(self.post(server, body=b"", length=self.module.MAX_UPLOAD + 1)[0], 413)
            server.conversion_lock.acquire()
            try:
                self.assertEqual(self.post(server)[0], 409)
            finally:
                server.conversion_lock.release()
            self.assertEqual(self.post(server)[0], 200)
            self.assertEqual(len(calls), 1)

    def test_partial_and_trickled_upload_deadlines_release_lock(self):
        for trickle in (False, True):
            with self.subTest(trickle=trickle), self.server(deadline=0.10) as (server, calls, _):
                stream = socket.create_connection(("127.0.0.1", server.server_port), timeout=2)
                authority = f"127.0.0.1:{server.server_port}"
                stream.sendall((
                    "POST /private-test-token/api/import?name=score.mscz HTTP/1.1\r\n"
                    f"Host: {authority}\r\nOrigin: http://{authority}\r\nContent-Length: 100\r\n\r\n"
                ).encode() + b"a")
                stop = threading.Event()

                def send_bytes():
                    while not stop.wait(0.02):
                        try:
                            stream.sendall(b"b")
                        except OSError:
                            return

                sender = threading.Thread(target=send_bytes) if trickle else None
                started = time.monotonic()
                if sender:
                    sender.start()
                response = None
                try:
                    response = HTTPResponse(stream)
                    response.begin()
                    self.assertEqual(response.status, 408)
                    self.assertLess(time.monotonic() - started, 1)
                    self.assertTrue(response.will_close)
                    self.assertIn("délai", json.loads(response.read())["error"])
                finally:
                    stop.set()
                    if sender:
                        sender.join(timeout=1)
                    if response:
                        response.close()
                    stream.close()
                self.assertEqual(calls, [])
                self.assertEqual(self.post(server)[0], 200)

    def test_expected_error_remains_422_and_lock_is_released(self):
        def reject(data, filename):
            raise self.module.ConversionError("Partition invalide")

        with self.server(converter=reject) as (server, _, _):
            self.assertEqual(self.post(server), (422, {"error": "Partition invalide"}))
            self.assertTrue(server.conversion_lock.acquire(blocking=False))
            server.conversion_lock.release()

    def test_closed_partial_upload_is_422_and_releases_lock(self):
        with self.server() as (server, calls, _):
            stream = socket.create_connection(("127.0.0.1", server.server_port), timeout=2)
            authority = f"127.0.0.1:{server.server_port}"
            try:
                stream.sendall((
                    "POST /private-test-token/api/import?name=score.mscz HTTP/1.1\r\n"
                    f"Host: {authority}\r\nOrigin: http://{authority}\r\nContent-Length: 2\r\n\r\na"
                ).encode())
                stream.shutdown(socket.SHUT_WR)
                with HTTPResponse(stream) as response:
                    response.begin()
                    self.assertEqual(response.status, 422)
                    response.read()
            finally:
                stream.close()
            self.assertEqual(calls, [])
            self.assertEqual(self.post(server)[0], 200)

    def test_converter_timeout_is_an_internal_error_not_an_upload_timeout(self):
        def fail(data, filename):
            raise TimeoutError("converter-timeout")

        with self.server(converter=fail) as (server, _, output):
            self.assertEqual(self.post(server)[0], 500)
            self.assertIn("converter-timeout", output.getvalue())

    def test_unexpected_error_logs_diagnostic_with_token_redacted(self):
        def fail(data, filename):
            raise RuntimeError("diagnostic-test /private-test-token/private-input jeton=private-test-token")

        with self.server(converter=fail) as (server, _, output):
            status, body = self.post(server)
            self.assertEqual(status, 500)
            self.assertEqual(body, {"error": "La préparation a échoué sur le Mac."})
            self.assertNotIn("diagnostic-test", json.dumps(body))
            self.assertIn("Traceback", output.getvalue())
            self.assertIn("RuntimeError: diagnostic-test /[lien]/private-input", output.getvalue())
            self.assertIn("jeton=[lien]", output.getvalue())
            self.assertNotIn("private-test-token", output.getvalue())
            self.assertTrue(server.conversion_lock.acquire(blocking=False))
            server.conversion_lock.release()


if __name__ == "__main__":
    unittest.main()
