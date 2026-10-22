#!/usr/bin/env python3
"""Import the public-domain WEB from eBible's official USFX archive.

Python standard library only. Run from any directory; --source can point to the
saved ZIP. The pinned checksum prevents silently importing a changed edition.
"""
import argparse
import hashlib
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_URL = "https://ebible.org/Scriptures/engwebp_usfx.zip"
SOURCE_SHA256 = "6b95cc0f7207fe2a1805370d4db6121bbcdf809ec8609a8a3d91f063214a911b"
BOOKS = [
    ("GEN", "Genesis"), ("EXO", "Exodus"), ("LEV", "Leviticus"), ("NUM", "Numbers"), ("DEU", "Deuteronomy"),
    ("JOS", "Joshua"), ("JDG", "Judges"), ("RUT", "Ruth"), ("1SA", "1 Samuel"), ("2SA", "2 Samuel"),
    ("1KI", "1 Kings"), ("2KI", "2 Kings"), ("1CH", "1 Chronicles"), ("2CH", "2 Chronicles"), ("EZR", "Ezra"),
    ("NEH", "Nehemiah"), ("EST", "Esther"), ("JOB", "Job"), ("PSA", "Psalms"), ("PRO", "Proverbs"),
    ("ECC", "Ecclesiastes"), ("SNG", "Song of Solomon"), ("ISA", "Isaiah"), ("JER", "Jeremiah"), ("LAM", "Lamentations"),
    ("EZK", "Ezekiel"), ("DAN", "Daniel"), ("HOS", "Hosea"), ("JOL", "Joel"), ("AMO", "Amos"),
    ("OBA", "Obadiah"), ("JON", "Jonah"), ("MIC", "Micah"), ("NAM", "Nahum"), ("HAB", "Habakkuk"),
    ("ZEP", "Zephaniah"), ("HAG", "Haggai"), ("ZEC", "Zechariah"), ("MAL", "Malachi"),
    ("MAT", "Matthew"), ("MRK", "Mark"), ("LUK", "Luke"), ("JHN", "John"), ("ACT", "Acts"),
    ("ROM", "Romans"), ("1CO", "1 Corinthians"), ("2CO", "2 Corinthians"), ("GAL", "Galatians"), ("EPH", "Ephesians"),
    ("PHP", "Philippians"), ("COL", "Colossians"), ("1TH", "1 Thessalonians"), ("2TH", "2 Thessalonians"),
    ("1TI", "1 Timothy"), ("2TI", "2 Timothy"), ("TIT", "Titus"), ("PHM", "Philemon"), ("HEB", "Hebrews"),
    ("JAS", "James"), ("1PE", "1 Peter"), ("2PE", "2 Peter"), ("1JN", "1 John"), ("2JN", "2 John"),
    ("3JN", "3 John"), ("JUD", "Jude"), ("REV", "Revelation")
]
SKIP = {"f", "x", "id", "h", "toc", "ide", "cl", "cp"}


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def inline_text(element):
    """Read display text without footnotes/crossrefs, retaining skipped tails."""
    if element.tag in SKIP:
        return ""
    result = element.text or ""
    for child in element:
        result += inline_text(child) + (child.tail or "")
    return result


def parse_book(element, book_id, name, testament):
    chapters, chapter, verse, parts, pending, notes = [], None, None, [], [], []

    def finish_verse():
        nonlocal verse, parts, notes
        if verse is not None:
            text = clean("".join(parts))
            if not text and not notes:
                raise ValueError(f"Empty source verse: {book_id} {chapter['number']}:{verse}")
            item = {"number": verse, "text": text}
            if notes:
                item["notes"] = notes
            chapter["verses"].append(item)
        verse, parts, notes = None, [], []

    def visit(node):
        nonlocal chapter, verse, parts, pending, notes
        if node.tag == "f" and verse is not None:
            note = clean("".join(inline_text(child) + (child.tail or "") for child in node if child.tag != "fr"))
            if note:
                notes.append(note)
            return
        if node.tag in SKIP:
            return
        if node.tag == "c":
            finish_verse()
            chapter = {"number": int(node.attrib["id"]), "headings": [], "verses": []}
            chapters.append(chapter)
            pending = []
            return
        if node.tag == "v":
            finish_verse()
            if chapter is None:
                raise ValueError("Verse outside a chapter")
            verse = int(node.attrib["id"])
            for heading in pending:
                heading["beforeVerse"] = verse
            pending = []
            return
        if node.tag == "ve":
            finish_verse()
            return
        if node.tag == "d" or (node.tag == "p" and node.get("sfm") in {"sp", "ms"}):
            if node.tag == "p" and node.get("sfm") == "sp" and verse is not None:
                # Song of Songs sometimes changes speaker inside a numbered verse.
                # Keep the label at that exact reading position.
                parts.append(" " + clean(inline_text(node)) + " ")
                return
            if chapter is not None:
                heading = {"text": clean(inline_text(node)), "beforeVerse": 1, "kind": "superscription" if node.tag == "d" else "heading"}
                chapter["headings"].append(heading)
                pending.append(heading)
            return
        if node.tag == "p" and node.get("sfm", "").startswith(("mt", "is", "ip")):
            return
        if verse is not None:
            parts.append(node.text or "")
        for child in node:
            visit(child)
            if verse is not None:
                parts.append(child.tail or "")

    visit(element)
    finish_verse()
    assert [c["number"] for c in chapters] == list(range(1, len(chapters) + 1)), book_id
    for ch in chapters:
        numbers = [v["number"] for v in ch["verses"]]
        assert len(numbers) == len(set(numbers)) and numbers == sorted(numbers), (book_id, ch["number"])
    return {"id": book_id, "name": name, "testament": testament, "chapters": chapters}


def import_bible(source):
    raw = source.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if checksum != SOURCE_SHA256:
        raise ValueError(f"Source changed: expected {SOURCE_SHA256}, received {checksum}. Review the new source before updating the pinned checksum.")
    with zipfile.ZipFile(source) as archive:
        xml = archive.read("engwebp_usfx.xml")
    document = ET.fromstring(xml)
    books = []
    for index, (book_id, name) in enumerate(BOOKS):
        source_book = document.find(f"book[@id='{book_id}']")
        if source_book is None:
            raise ValueError(f"Missing canonical book {book_id}")
        books.append(parse_book(source_book, book_id, name, "OT" if index < 39 else "NT"))
    canonical = "\n".join(f"{b['id']}.{c['number']}.{v['number']}\t{v['text']}" for b in books for c in b["chapters"] for v in c["verses"])
    return {"meta": {
        "title": "World English Bible", "abbreviation": "WEB", "edition": "engwebp — Protestant canon, American English",
        "language": "en", "license": "Public domain", "licenseUrl": "https://ebible.org/engwebp/copyright.htm",
        "sourceUrl": SOURCE_URL, "sourcePage": "https://ebible.org/details.php?id=engwebp", "sourceSha256": checksum,
        "sourceXmlSha256": hashlib.sha256(xml).hexdigest(), "downloadedAt": "2026-10-22",
        "credit": "World English Bible, public-domain text from eBible.org. World English Bible is a trademark of eBible.org.",
        "processing": "66 canonical books selected from official USFX. Verse wording and punctuation retained; whitespace normalized. Psalm superscriptions, speaker headings and source footnotes preserved separately. Cross-references, prefaces, word-tag metadata, and noncanonical books omitted. Some numbered verses have no main text in this edition; their source footnotes explain the textual variant. Atlas links are editorial annotations, not part of the Bible translation.",
        "bookCount": len(books), "chapterCount": sum(len(b["chapters"]) for b in books),
        "verseCount": sum(len(c["verses"]) for b in books for c in b["chapters"]),
        "textSha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    }, "books": books}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, help="Saved official USFX ZIP")
    args = parser.parse_args()
    source = args.source or ROOT / ".cache" / "engwebp_usfx.zip"
    if not source.exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0 BiblePath source importer"})
        with urllib.request.urlopen(request, timeout=120) as response:
            source.write_bytes(response.read())
    data = import_bible(source)
    destination = ROOT / "dist" / "bible-data.json"
    destination.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"file": str(destination), "books": data["meta"]["bookCount"], "chapters": data["meta"]["chapterCount"], "verses": data["meta"]["verseCount"], "bytes": destination.stat().st_size, "sha256": data["meta"]["textSha256"]}))


if __name__ == "__main__":
    main()
