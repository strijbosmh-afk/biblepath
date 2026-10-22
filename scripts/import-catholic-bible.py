#!/usr/bin/env python3
"""Import the complete, public-domain Douay-Rheims 1899 Catholic Bible.

The 73-book eBible USFX source is checksum-pinned. Esther and Daniel retain
their complete Vulgate chapter/verse numbering, including the Greek additions;
the Letter of Jeremiah remains Baruch 6. Run --check to verify reproducibility.
Existing WEB, Statenvertaling, Segond and Tanakh assets are never rewritten.
"""
import argparse
import hashlib
import importlib.util
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("bible_import", ROOT / "scripts" / "import-bible.py")
BIBLE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BIBLE)
SOURCE_URL = "https://ebible.org/Scriptures/engDRA_usfx.zip"
SOURCE_SHA256 = "def7a79a4fd11a9489ea7d25579658b70f0727a8dcf7f71c3ca1c9e5cca2d5db"
SOURCE_XML = "engDRA_usfx.xml"
DESTINATION = ROOT / "dist" / "catholic-bible-data.json"

# Modern canonical IDs/names avoid the Douay historical Kings/Paralipomenon
# name collisions. Only navigation order changes; source verse text does not.
GROUPS = {
    "law": "GEN EXO LEV NUM DEU".split(),
    "history": "JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA".split(),
    "wisdom": "JOB PSA PRO ECC SNG WIS SIR".split(),
    "prophets": "ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL".split(),
    "gospels": "MAT MRK LUK JHN".split(),
    "acts": ["ACT"],
    "letters": "ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD".split(),
    "revelation": ["REV"],
}
ORDER = [book_id for ids in GROUPS.values() for book_id in ids]
NAMES = dict(BIBLE.BOOKS) | {"TOB": "Tobit", "JDT": "Judith", "WIS": "Wisdom", "SIR": "Sirach", "BAR": "Baruch", "1MA": "1 Maccabees", "2MA": "2 Maccabees"}
ALIASES = {
    "TOB": ["Tobias", "Tobie"], "JDT": ["Judit"],
    "WIS": ["Wisdom of Solomon", "Wijsheid", "Wijsheid van Salomo", "Sagesse", "Sagesse de Salomon"],
    "SIR": ["Ecclesiasticus", "Ecclésiastique", "Siracide", "Wijsheid van Jezus Sirach", "Jezus Sirach"],
    "BAR": ["Baruch", "Baruk"],
    "1MA": ["1 Makkabeeën", "1 Makkabeeen", "1 Maccabées", "1 Machabees"],
    "2MA": ["2 Makkabeeën", "2 Makkabeeen", "2 Maccabées", "2 Machabees"],
}


def download_source(source):
    if not source.exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "BiblePath Catholic scripture importer"})
        with urllib.request.urlopen(request, timeout=120) as response:
            source.write_bytes(response.read())
    return source


def text_hash(books):
    canonical = "\n".join(f"{book['id']}.{chapter['number']}.{verse['number']}\t{verse['text']}" for book in books for chapter in book["chapters"] for verse in chapter["verses"])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def import_catholic(source):
    raw = source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError(f"Catholic source changed ({digest}); review before updating the pinned checksum.")
    with zipfile.ZipFile(source) as archive:
        xml = archive.read(SOURCE_XML)
    document = ET.fromstring(xml)
    source_ids = [book.get("id") for book in document.findall("book")]
    if len(source_ids) != 73 or set(source_ids) != set(ORDER):
        raise ValueError("The source must contain exactly the complete 73-book Catholic canon.")
    books = []
    for index, book_id in enumerate(ORDER):
        element = document.find(f"book[@id='{book_id}']")
        book = BIBLE.parse_book(element, book_id, NAMES[book_id], "OT" if index < 46 else "NT")
        book["group"] = next(group for group, ids in GROUPS.items() if book_id in ids)
        if book_id in ALIASES:
            book["aliases"] = ALIASES[book_id]
        books.append(book)
    meta = {
        "title": "Douay-Rheims 1899", "abbreviation": "DRA", "editionId": "catholic",
        "edition": "Douay-Rheims American Edition of 1899 — complete Catholic canon",
        "sourceEdition": "engDRA", "canon": "catholic", "canonComplete": True,
        "language": "en", "textDirection": "ltr", "license": "Public domain",
        "licenseUrl": "https://ebible.org/engDRA/copyright.htm",
        "sourcePage": "https://ebible.org/details.php?id=engDRA", "sourceUrl": SOURCE_URL,
        "sourceSha256": digest, "sourceXmlSha256": hashlib.sha256(xml).hexdigest(),
        "downloadedAt": "2026-10-22", "sourceTextDate": "2022-11-03",
        "credit": "Douay-Rheims American Edition of 1899, translated from the Latin Vulgate by the English College, Douai. Public-domain text supplied by eBible.org.",
        "processing": "All 73 source books retained and arranged in Catholic navigation order. Verse wording and punctuation preserved; whitespace normalized. Chapter and verse numbering remain that of this edition. Word-tag metadata, book-title headers and publication front matter are omitted. Source notes and superscriptions are retained when present. The added books are not translations generated by BiblePath.",
        "versificationNote": "Douay-Rheims follows its own Vulgate numbering. Esther includes chapters 10:4–16:24; Daniel includes 3:24–90, Susanna in chapter 13 and Bel and the Dragon in chapter 14. The Letter of Jeremiah is Baruch 6. Equal numbers in WEB, Statenvertaling or Segond are not treated as aligned references.",
        # All legacy atlas locators are conservative until independently aligned.
        # New edition-specific Catholic references are verified against this file.
        "verseIdentityUncertainBooks": [book_id for book_id, _ in BIBLE.BOOKS],
        "bookCount": len(books), "oldTestamentBookCount": 46, "newTestamentBookCount": 27,
        "chapterCount": sum(len(book["chapters"]) for book in books),
        "verseCount": sum(len(chapter["verses"]) for book in books for chapter in book["chapters"]),
        "textSha256": text_hash(books),
        "additions": [
            {"book": "EST", "chapter": 10, "verse": 4, "endChapter": 16, "endVerse": 24, "label": "Greek additions to Esther"},
            {"book": "DAN", "chapter": 3, "verse": 24, "endChapter": 3, "endVerse": 90, "label": "Prayer of Azariah and Song of the Three Young Men"},
            {"book": "DAN", "chapter": 13, "verse": 1, "endChapter": 13, "endVerse": 65, "label": "Susanna"},
            {"book": "DAN", "chapter": 14, "verse": 1, "endChapter": 14, "endVerse": 42, "label": "Bel and the Dragon"},
            {"book": "BAR", "chapter": 6, "verse": 1, "endChapter": 6, "endVerse": 72, "label": "Letter of Jeremiah"},
        ],
    }
    return {"meta": meta, "books": books}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, help="Pinned official engDRA USFX ZIP")
    parser.add_argument("--check", action="store_true", help="Reproduce and compare without modifying the artifact")
    args = parser.parse_args()
    source = download_source(args.source or ROOT / ".cache" / "engDRA_usfx.zip")
    data = import_catholic(source)
    serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if not DESTINATION.exists() or DESTINATION.read_text(encoding="utf-8") != serialized:
            raise SystemExit("Catholic Bible artifact differs from the pinned source; rebuild and review.")
    else:
        DESTINATION.write_text(serialized, encoding="utf-8")
    print(json.dumps({"file": str(DESTINATION), "check": args.check, "books": data["meta"]["bookCount"], "chapters": data["meta"]["chapterCount"], "verses": data["meta"]["verseCount"], "textSha256": data["meta"]["textSha256"]}))


if __name__ == "__main__":
    main()
