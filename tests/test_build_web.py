"""The public builder must preserve files it does not own or can no longer verify."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import posixpath
import re

PROJECT = Path(__file__).resolve().parents[1]


class BuildSafety(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="pupitro-build-test-")
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        spec = importlib.util.spec_from_file_location("build_web_test", PROJECT / "scripts/build_web.py")
        self.builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.builder)
        self.builder.ROOT = self.base / "source"
        self.builder.PUBLIC = self.builder.ROOT / "reader"
        for name in self.builder.FILES:
            target = self.builder.PUBLIC / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b"fixture")
        (self.builder.PUBLIC / "sw.js").write_text('const VERSION="__PUPITRO_BUILD__";')
        self.output = self.base / "output"

    def test_output_inside_sources_is_refused_before_writing(self):
        output = self.builder.PUBLIC / "preview"
        with self.assertRaises(SystemExit):
            self.builder.build(output)
        self.assertFalse(output.exists())

    def test_allowlisted_name_without_a_manifest_does_not_prove_ownership(self):
        self.output.mkdir()
        target = self.output / "app.js"
        target.write_text("personal file")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertEqual(target.read_text(), "personal file")

    def test_modified_owned_resource_is_preserved(self):
        self.builder.build(self.output)
        target = self.output / "app.js"
        target.write_text("local changes")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertEqual(target.read_text(), "local changes")

    def test_modified_generated_worker_is_preserved(self):
        self.builder.build(self.output)
        target = self.output / "sw.js"
        target.write_text("// local worker changes")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertEqual(target.read_text(), "// local worker changes")

    def test_modified_generated_manifest_and_marker_are_preserved(self):
        for name in ["offline-assets.json", ".nojekyll"]:
            with self.subTest(name=name):
                output = self.output / name.replace(".", "_")
                self.builder.build(output)
                target = output / name
                target.write_text("local modification")
                with self.assertRaises(SystemExit):
                    self.builder.build(output)
                self.assertEqual(target.read_text(), "local modification")

    def test_verified_receipt_allows_a_worker_source_update(self):
        self.builder.build(self.output)
        source = self.builder.PUBLIC / "sw.js"
        source.write_text(source.read_text() + "\n// new worker source")
        self.builder.build(self.output)
        self.assertIn("new worker source", (self.output / "sw.js").read_text())

    def test_legacy_output_is_upgraded_only_when_worker_is_verified(self):
        self.builder.build(self.output)
        state = self.output / self.builder.OUTPUT_STATE
        state.unlink()
        self.builder.build(self.output)
        self.assertTrue(state.is_file())
        state.unlink()
        (self.output / "sw.js").write_text("local change")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertEqual((self.output / "sw.js").read_text(), "local change")

    def test_output_symlink_never_overwrites_its_target(self):
        self.builder.build(self.output)
        other = self.base / "other.js"
        other.write_text("preserve")
        target = self.output / "app.js"
        target.unlink()
        target.symlink_to(other)
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertEqual(other.read_text(), "preserve")

    def test_malformed_previous_manifest_has_a_controlled_failure(self):
        self.builder.build(self.output)
        (self.output / "offline-assets.json").write_text("{")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)

    def test_worker_version_placeholder_is_checked_before_writing(self):
        (self.builder.PUBLIC / "sw.js").write_text("// missing version")
        with self.assertRaises(SystemExit):
            self.builder.build(self.output)
        self.assertFalse(self.output.exists())

    def test_unchanged_owned_output_can_be_rebuilt(self):
        self.builder.build(self.output)
        self.builder.build(self.output)
        self.assertEqual((self.output / "app.js").read_bytes(), b"fixture")

    def test_literal_shell_imports_are_in_the_public_allowlist(self):
        allowed = set(self.builder.FILES + ["sw.js", "offline-assets.json"])
        for name in self.builder.SHELL:
            source = (PROJECT / "reader" / name).read_text() if name.endswith((".js", ".html")) else ""
            references = re.findall(r'''(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']''', source)
            if name.endswith(".html"):
                references += re.findall(r'''(?:src|href)=["']([^"'#]+)["']''', source)
            for reference in references:
                if ":" in reference or reference.startswith("/"):
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), reference))
                if reference.endswith("/"):
                    target = posixpath.normpath(posixpath.join(target, "index.html"))
                self.assertIn(target, allowed, f"{name} references unlisted {target}")


if __name__ == "__main__":
    unittest.main()
