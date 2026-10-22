"""Independently reconstruct every Dutch Catholic verse from its named source.

The reconstruction uses milestone/verse segments rather than the importer's
tree walker. This catches dropped inline text, omitted verses, accidental
retranslations, duplicate Daniel chapter boundaries and uncredited supplements.
"""
import hashlib
import html
import importlib.util
import json
import pathlib
import re
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("dutch_import", ROOT / "scripts" / "import-catholic-dutch.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
base = ROOT / ".cache" / "nld1939_usfx.zip"
osis = ROOT / ".cache" / "Canisius-7083841.xml"
saved = json.loads((ROOT / "dist" / "catholic-bible-data-nl.json").read_text(encoding="utf-8"))
supplement = json.loads(module.SUPPLEMENT.read_text(encoding="utf-8"))


def plain(segment):
    # Notes are an annotation channel, not part of the Bible's verse wording.
    segment = re.sub(r"<note\b[^>]*>.*?</note>", "", segment, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", "", segment))).strip()


assert hashlib.sha256(base.read_bytes()).hexdigest() == module.BASE_SHA256
assert hashlib.sha256(osis.read_bytes()).hexdigest() == module.OSIS_SHA256
with zipfile.ZipFile(base) as archive:
    usfx = archive.read("nld1939_usfx.xml").decode("utf-8")
assert not re.search(r"<(?:f|x)(?:\s|>)", usfx)
expected = {}
base_daniel = {}
for book, chapter, verse, segment in re.findall(r'<v\b[^>]*bcv="([A-Z0-9]+)\.(\d+)\.(\d+)"[^>]*/>(.*?)<ve\s*/>', usfx, re.S):
    key = ("DAN" if book == "DAG" else book, int(chapter), int(verse))
    if book == "DAG":
        base_daniel[key] = plain(segment)
    else:
        assert key not in expected
        expected[key] = plain(segment)
assert len(expected) == 35335 - 463
original = osis.read_text(encoding="utf-8")
# Independently verify the sole reviewed USFX title-prefix split against the
# explicit original OSIS title, preserving every prefix word in the heading.
judith_segment = re.search(r'<chapter\b[^>]*osisID="Jdt.1"[^>]*>(.*?)</chapter>', original, re.S).group(1)
judith_title = plain(re.search(r'<title\b[^>]*>(.*?)</title>', judith_segment, re.S).group(1))
assert expected[("JDT", 1, 1)].startswith(judith_title + " ")
expected[("JDT", 1, 1)] = expected[("JDT", 1, 1)][len(judith_title):].lstrip()
assert next(b for b in saved["books"] if b["id"] == "JDT")["chapters"][0]["headings"][0]["text"] == judith_title
daniel_segment = re.search(r'<chapter\b[^>]*osisID="Dan.13"[^>]*>(.*?)</chapter>', original, re.S).group(1)
daniel_title = plain(re.search(r'<title\b[^>]*>(.*?)</title>', daniel_segment, re.S).group(1))
assert next(b for b in saved["books"] if b["id"] == "DAN")["chapters"][12]["headings"][0]["text"] == daniel_title
original_selected = {}
for book, chapter, verse, segment in re.findall(r'<verse\b[^>]*osisID="(Dan|Esth)\.(\d+)\.(\d+)"[^>]*>(.*?)</verse>', original, re.S):
    chapter, verse = int(chapter), int(verse)
    if book == "Esth" and (chapter < 10 or chapter == 10 and verse <= 3):
        continue
    key = ("DAN" if book == "Dan" else "EST", chapter, verse)
    assert key not in expected
    expected[key] = original_selected[key] = plain(segment)
assert len(original_selected) == 530 + 84
assert expected[("EST", 15, 1)] == "(–)"
for verse in supplement["verses"]:
    key = (verse["book"], verse["chapter"], verse["number"])
    if key in expected:
        assert key == ("EST", 15, 1)
    expected[key] = verse["text"]
assert len(supplement["verses"]) == 25
actual = {(b["id"], c["number"], v["number"]): v["text"] for b in saved["books"] for c in b["chapters"] for v in c["verses"]}
assert len(expected) == len(actual) == 35510
assert expected == actual, "Every word and every verse must match its attributed primary source"

# Daniel's source numbering differs: the three opening verses of eBible 4
# conclude OSIS 3, and the remaining 34 verses constitute OSIS 4. Compare the
# wording after whitespace normalization to guard against duplicate insertion.
for old, new in [(1, 98), (2, 99), (3, 100)]:
    assert expected[("DAN", 3, new)] == base_daniel[("DAN", 4, old)]
assert expected[("DAN", 4, 1)] == base_daniel[("DAN", 4, 4)]
assert expected[("DAN", 4, 34)] == base_daniel[("DAN", 4, 37)]

assert module.import_dutch(base, osis) == saved, "Regeneration must reproduce all metadata, notes, provenance and scripture"
# Restored variant notes are checked against their exact OSIS verse, without
# assuming equal numbering across sources (notably the Psalms).
for book in saved["books"]:
    for chapter in book["chapters"]:
        for verse in chapter["verses"]:
            source_ref = verse.get("noteSourceReference")
            if source_ref:
                segment = re.search(r'<verse\b[^>]*osisID="' + re.escape(source_ref) + r'"[^>]*>(.*?)</verse>', original, re.S).group(1)
                notes = [plain(n) for n in re.findall(r'<note\b[^>]*>(.*?)</note>', segment, re.S)]
                assert verse["notes"][1:] == notes
with tempfile.TemporaryDirectory() as directory:
    changed = pathlib.Path(directory) / "changed.xml"
    changed.write_bytes(b"Unreviewed upstream text")
    for first, second in [(changed, osis), (base, changed)]:
        try:
            module.import_dutch(first, second)
        except ValueError as error:
            assert "checksum" in str(error)
        else:
            raise AssertionError("An unreviewed changed source was accepted")
    try:
        module.import_dutch(base, osis, changed)
    except ValueError as error:
        assert "checksum" in str(error)
    else:
        raise AssertionError("An unreviewed supplement was accepted")
print("Dutch Catholic importer passed: all 35,510 verses independently reconstructed; source attribution, Daniel numbering, deterministic regeneration and changed-source rejection verified.")
