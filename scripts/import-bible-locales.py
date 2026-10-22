#!/usr/bin/env python3
"""Reproduce the Dutch Statenvertaling and French Louis Segond 1910 payloads.

Python standard library only. Cached downloads are checksum-pinned; modern
introductions, translator commentaries, lexical tags and cross-references are
excluded. Scripture spelling, punctuation and native verse numbers are retained.
"""
import argparse
import hashlib
import importlib.util
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("english_import", ROOT / "scripts" / "import-bible.py")
english = importlib.util.module_from_spec(spec)
spec.loader.exec_module(english)
BOOKS = english.BOOKS
NAMES = {
    "nl": "Genesis|Exodus|Leviticus|Numeri|Deuteronomium|Jozua|Richteren|Ruth|1 Samuel|2 Samuel|1 Koningen|2 Koningen|1 Kronieken|2 Kronieken|Ezra|Nehemia|Esther|Job|Psalmen|Spreuken|Prediker|Hooglied|Jesaja|Jeremia|Klaagliederen|Ezechiël|Daniël|Hosea|Joël|Amos|Obadja|Jona|Micha|Nahum|Habakuk|Zefanja|Haggaï|Zacharia|Maleachi|Mattheüs|Markus|Lukas|Johannes|Handelingen|Romeinen|1 Korinthe|2 Korinthe|Galaten|Efeze|Filippenzen|Kolossenzen|1 Thessalonicenzen|2 Thessalonicenzen|1 Timotheüs|2 Timotheüs|Titus|Filemon|Hebreeën|Jakobus|1 Petrus|2 Petrus|1 Johannes|2 Johannes|3 Johannes|Judas|Openbaring".split("|"),
    "fr": "Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|1 Samuel|2 Samuel|1 Rois|2 Rois|1 Chroniques|2 Chroniques|Esdras|Néhémie|Esther|Job|Psaumes|Proverbes|Ecclésiaste|Cantique des cantiques|Ésaïe|Jérémie|Lamentations|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Matthieu|Marc|Luc|Jean|Actes|Romains|1 Corinthiens|2 Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|1 Thessaloniciens|2 Thessaloniciens|1 Timothée|2 Timothée|Tite|Philémon|Hébreux|Jacques|1 Pierre|2 Pierre|1 Jean|2 Jean|3 Jean|Jude|Apocalypse".split("|")
}
EXTRA_ALIASES = {"NUM": ["Numberi"], "JDG": ["Rechters"], "NEH": ["Nehemias"], "PSA": ["Psaume", "Psalm"], "SNG": ["Cantique", "Hooglied van Salomo", "Song of Songs"], "MAT": ["Matteüs", "Mattheus"], "MRK": ["Marcus"], "LUK": ["Lucas"], "1CO": ["1 Korintiërs"], "2CO": ["2 Korintiërs"], "EPH": ["Efeziërs"], "PHP": ["Filippen"], "COL": ["Colosse"], "1TH": ["1 Tessalonicenzen"], "2TH": ["2 Tessalonicenzen"]}
NL_COMMIT = "d39d8ee01ca51f27e3e9c50291a96fc32f49b4d2"
SOURCES = {
    "nl": {"file": "statenvertaling-osis.xml", "url": f"https://raw.githubusercontent.com/Isidore-Guild/statenvertaling/{NL_COMMIT}/STV.xml", "sha256": "4879d8cfa83c20c62c8a85a1a469c1e298e5c6eb40921563fba8ec105f3c03c1"},
    "fr": {"file": "fraLSG_usfx.zip", "url": "https://ebible.org/Scriptures/fraLSG_usfx.zip", "sha256": "30faf718211eb3c3293a36a18398f682c168176caa967aa885a7940ad1148349"}
}
OSIS = "http://www.bibletechnologies.net/2003/OSIS/namespace"
NS = {"o": OSIS}


def source_bytes(locale):
    source = SOURCES[locale]
    target = ROOT / ".cache" / source["file"]
    if not target.exists():
        target.parent.mkdir(exist_ok=True)
        request = urllib.request.Request(source["url"], headers={"User-Agent": "Mozilla/5.0 BiblePath source importer"})
        with urllib.request.urlopen(request, timeout=120) as response:
            target.write_bytes(response.read())
    raw = target.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != source["sha256"]:
        raise ValueError(f"{locale}: source checksum changed ({digest}); review before changing the pinned source.")
    return raw, target


def osis_text(element):
    if element.tag.rsplit("}", 1)[-1] in {"note", "title"}:
        return ""
    return (element.text or "") + "".join(osis_text(child) + (child.tail or "") for child in element)


def parse_dutch(raw):
    document = ET.fromstring(raw)
    source_books = document.findall(".//o:div[@type='book']", NS)
    if len(source_books) != 66:
        raise ValueError("Expected exactly 66 canonical Statenvertaling books")
    books = []
    for index, source_book in enumerate(source_books):
        book_id, _ = BOOKS[index]
        chapters = []
        for source_chapter in source_book.findall("o:chapter", NS):
            number = int(source_chapter.get("osisID").split(".")[-1])
            verses, headings = [], []
            for node in source_chapter:
                tag = node.tag.rsplit("}", 1)[-1]
                if tag == "verse":
                    verse_number = int(node.get("osisID").split(".")[-1])
                    text = english.clean(osis_text(node))
                    if not text:
                        raise ValueError(f"Empty Dutch verse {book_id} {number}:{verse_number}")
                    verses.append({"number": verse_number, "text": text})
                elif tag == "title" and node.get("canonical") == "true":
                    headings.append({"text": english.clean("".join(node.itertext())), "beforeVerse": verses[-1]["number"] + 1 if verses else 1, "kind": "superscription"})
            chapters.append({"number": number, "headings": headings, "verses": verses})
        books.append({"id": book_id, "name": NAMES["nl"][index], "testament": "OT" if index < 39 else "NT", "chapters": chapters})
    return books


def parse_french(source):
    with zipfile.ZipFile(source) as archive:
        xml = archive.read("fraLSG_usfx.xml")
    document = ET.fromstring(xml)
    # Section titles and reference paragraphs are editorial apparatus; they are
    # not part of Segond's verse text. They must not enter an active verse.
    for parent in document.iter():
        for child in list(parent):
            if child.tag == "s" or (child.tag == "p" and child.get("sfm") == "r"):
                child.text = ""
                for descendant in list(child):
                    child.remove(descendant)
    books = []
    for index, (book_id, _) in enumerate(BOOKS):
        source_book = document.find(f"book[@id='{book_id}']")
        if source_book is None:
            raise ValueError(f"Missing French book {book_id}")
        books.append(english.parse_book(source_book, book_id, NAMES["fr"][index], "OT" if index < 39 else "NT"))
    return books, hashlib.sha256(xml).hexdigest()


def build(locale):
    raw, path = source_bytes(locale)
    if locale == "nl":
        books = parse_dutch(raw)
        meta = {"title": "Statenvertaling", "abbreviation": "SV", "edition": "Statenvertaling — tekst van de editie 1888, Isidore-Guild-transcriptie", "license": "Publiek domein; CC0 1.0-transcriptie", "licenseUrl": f"https://github.com/Isidore-Guild/statenvertaling/blob/{NL_COMMIT}/LICENSE", "sourcePage": "https://github.com/Isidore-Guild/statenvertaling", "sourceCommit": NL_COMMIT, "credit": "Statenvertaling, publiek domein. Transcriptie van de editie 1888 door Isidore-Guild, vrijgegeven onder CC0 1.0.", "processing": "De 66 canonieke boeken; oorspronkelijke tekstspelling en leestekens behouden. Witruimte genormaliseerd. Lexicale markeringen, hoofdstukoverzichten en kanttekeningen weggelaten. De bron gebruikt KJV-versnummering en behoudt oorspronkelijke versnummers waar deze in de tekst staan."}
    else:
        books, xml_sha = parse_french(path)
        meta = {"title": "Louis Segond 1910", "abbreviation": "LSG", "edition": "Louis Segond 1910 — texte français d’eBible.org", "license": "Public domain", "licenseUrl": "https://ebible.org/fraLSG/copyright.htm", "sourcePage": "https://ebible.org/find/details.php?id=fraLSG", "sourceXmlSha256": xml_sha, "credit": "La Bible Louis Segond 1910, domaine public. Texte fourni par eBible.org.", "processing": "Les 66 livres canoniques, texte et numérotation des versets conservés. Espaces normalisés. Introductions, titres éditoriaux, renvois et balises lexicales omis. Les titres des psaumes numérotés restent dans les versets du texte source."}
    english_data = json.loads((ROOT / "dist" / "bible-data.json").read_text(encoding="utf-8"))
    uncertain_books = []
    for index, book in enumerate(books):
        book["aliases"] = list(dict.fromkeys([BOOKS[index][1], NAMES["nl"][index], NAMES["fr"][index], *EXTRA_ALIASES.get(book["id"], [])]))
        assert [c["number"] for c in book["chapters"]] == list(range(1, len(book["chapters"]) + 1)), book["id"]
        for chapter in book["chapters"]:
            nums = [v["number"] for v in chapter["verses"]]
            assert len(nums) == len(set(nums)) and nums == sorted(nums), (book["id"], chapter["number"])
        if locale == "fr":
            baseline = english_data["books"][index]
            if [[v["number"] for v in ch["verses"]] for ch in book["chapters"]] != [[v["number"] for v in ch["verses"]] for ch in baseline["chapters"]]:
                uncertain_books.append(book["id"])
    canonical = "\n".join(f"{b['id']}.{c['number']}.{v['number']}\t{v['text']}" for b in books for c in b["chapters"] for v in c["verses"])
    meta.update({"language": locale, "sourceUrl": SOURCES[locale]["url"], "sourceSha256": SOURCES[locale]["sha256"], "downloadedAt": "2026-10-22", "bookCount": len(books), "chapterCount": sum(len(b["chapters"]) for b in books), "verseCount": sum(len(c["verses"]) for b in books for c in b["chapters"]), "textSha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(), "verseIdentityUncertainBooks": uncertain_books})
    if uncertain_books:
        meta["versificationNote"] = "La numérotation de certains livres diffère des références anglaises de l’atlas. Dans ces livres, les liens de noms sont des correspondances possibles, et non des identifications confirmées par le même numéro de verset."
    return {"meta": meta, "books": books}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", choices=["nl", "fr", "all"], default="all")
    args = parser.parse_args()
    for locale in ["nl", "fr"] if args.language == "all" else [args.language]:
        data = build(locale)
        target = ROOT / "dist" / f"bible-data-{locale}.json"
        target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(json.dumps({"language": locale, "books": data["meta"]["bookCount"], "chapters": data["meta"]["chapterCount"], "verses": data["meta"]["verseCount"], "bytes": target.stat().st_size, "uncertainBooks": data["meta"]["verseIdentityUncertainBooks"]}))


if __name__ == "__main__":
    main()
