"""Independently reconstruct every pinned DRA verse and compare the artifact."""
import hashlib
import html
import importlib.util
import json
import pathlib
import re
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("catholic_import", ROOT / "scripts" / "import-catholic-bible.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = ROOT / ".cache" / "engDRA_usfx.zip"
saved = json.loads((ROOT / "dist" / "catholic-bible-data.json").read_text(encoding="utf-8"))
assert hashlib.sha256(source.read_bytes()).hexdigest() == module.SOURCE_SHA256
with zipfile.ZipFile(source) as archive:
    xml = archive.read("engDRA_usfx.xml").decode("utf-8")
# This particular source has no footnote/cross-reference elements, which makes
# independent milestone-segment extraction possible without sharing the importer.
assert not re.search(r"<(?:f|x)(?:\s|>)", xml)
source_verses = {}
for book, chapter, verse, segment in re.findall(r'<v\b[^>]*bcv="([A-Z0-9]+)\.(\d+)\.(\d+)"[^>]*/>(.*?)<ve\s*/>', xml, re.S):
    key = (book, int(chapter), int(verse))
    assert key not in source_verses
    source_verses[key] = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", "", segment))).strip()
artifact_verses = {(b["id"], c["number"], v["number"]): v["text"] for b in saved["books"] for c in b["chapters"] for v in c["verses"]}
assert len(source_verses) == 35811
assert source_verses == artifact_verses, "Every source word and every source verse must survive, including the additions"
assert module.import_catholic(source) == saved, "Deterministic regeneration includes metadata and all text"
with tempfile.TemporaryDirectory() as directory:
    changed = pathlib.Path(directory) / "changed.zip"
    changed.write_bytes(b"Changed source must never import silently")
    try:
        module.import_catholic(changed)
    except ValueError as error:
        assert "checksum" in str(error)
    else:
        raise AssertionError("Unreviewed changed source was accepted")
assert len(module.ORDER) == len(set(module.ORDER)) == 73
print("Catholic importer passed: all35,811 verses independently reconstructed, additions retained, deterministic metadata/text, changed-source rejection.")
