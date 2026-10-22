"""Verify multilingual source extraction independently of the JS reader."""
import hashlib
import html
import importlib.util
import json
import pathlib
import re
import xml.etree.ElementTree as ET
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("locale_import", root / "scripts" / "import-bible-locales.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fragment = ET.fromstring(f'<verse xmlns="{module.OSIS}">In <w>den</w> beginne<note>Do not insert <reference>commentary</reference>.</note> <transChange>schiep</transChange> God.</verse>')
assert module.english.clean(module.osis_text(fragment)) == "In den beginne schiep God."
assert len(module.NAMES["nl"]) == len(module.NAMES["fr"]) == len(module.BOOKS) == 66
source = root / ".cache" / "statenvertaling-osis.xml"
if source.exists():
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == module.SOURCES["nl"]["sha256"]
    data = json.loads((root / "dist" / "bible-data-nl.json").read_text(encoding="utf8"))
    expected = [v["text"] for b in data["books"] for c in b["chapters"] for v in c["verses"]]
    # Independently strip XML markup from each original verse, omitting complete
    # commentary subtrees. This checks all scripture characters, not samples.
    found = []
    for body in re.findall(r"<verse\s[^>]*>(.*?)</verse>", raw.decode("utf8"), re.S):
        body = re.sub(r"<note(?:\s[^>]*)?>.*?</note>", "", body, flags=re.S)
        body = re.sub(r"<title(?:\s[^>]*)?>.*?</title>", "", body, flags=re.S)
        body = html.unescape(re.sub(r"<[^>]+>", "", body))
        found.append(module.english.clean(body))
    assert found == expected, "Dutch verse text differs from independently stripped source"
    print(f"Dutch: all {len(found)} verse texts match the pinned OSIS source.")
vpl = root / ".cache" / "fraLSG_vpl.zip"
if vpl.exists():
    assert hashlib.sha256(vpl.read_bytes()).hexdigest() == "737114324970f5eaf5c70bf5cac476e26ec2fe24d8d2c080cf7467601e06996c"
    data = json.loads((root / "dist" / "bible-data-fr.json").read_text(encoding="utf8"))
    actual = {b["id"]: "".join("".join(h["text"] for h in c["headings"] if h["beforeVerse"] == v["number"] and h["kind"] == "superscription") + v["text"] for c in b["chapters"] for v in c["verses"]) for b in data["books"]}
    book_codes = dict(zip("EZE MAR JOH PHI JAM 1JO 2JO 3JO JOE NAH SOL".split(), "EZK MRK JHN PHP JAS 1JN 2JN 3JN JOL NAM SNG".split()))
    expected = {book: [] for book in actual}
    with zipfile.ZipFile(vpl) as archive:
        for line in archive.read("fraLSG_vpl.txt").decode("utf-8-sig").splitlines():
            match = re.match(r"^(\S+) (\d+:\d+)\s*(.*)$", line)
            if match:
                key = book_codes.get(match[1], match[1])
                if key in expected:
                    expected[key].append(match[3])
    for book, text in actual.items():
        assert re.sub(r"\s+", "", text) == re.sub(r"\s+", "", "".join(expected[book])), book
    print("French: all 66 books match the official VPL source after presentation whitespace.")
print("Multilingual import tests passed.")
