#!/usr/bin/env python3
"""Import complete Tanakh editions without assuming equal verse numbering.

The Hebrew WLC and Jewish JPS 1917 translation are pinned eBible USFX sources.
Dutch Statenvertaling and French Segond are explicitly Christian translation
aids, copied from the app's independently numbered, attributed source editions.
Run with --check to reproduce and compare the committed JSON without writing.
"""
import argparse
import copy
import hashlib
import importlib.util
import io
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("bible_import", ROOT / "scripts" / "import-bible.py")
BIBLE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BIBLE)

SOURCES = {
    "he": {"file": "hboWLC_usfx.zip", "xml": "hboWLC_usfx.xml", "sha256": "ee9a3f713368636ff7417ed23abc1a724706c1e9b84d2d5d8044c8e7f60cf5f0"},
    "en": {"file": "engjps_usfx.zip", "xml": "engjps_usfx.xml", "sha256": "a608ffc7436c2051baad63244e08e993a372f6713f9a39a41d1c14a8ea3a9f6c"},
}
for SOURCE in SOURCES.values():
    SOURCE["url"] = "https://ebible.org/Scriptures/" + SOURCE["file"]

# Retain the 39 familiar navigation components while displaying their 24-book
# Jewish canon identities. Samuel, Kings, The Twelve, Ezra-Nehemiah and Chronicles
# are each single canonical books; navigation components do not change that.
# Navigation follows the cited eBible JPS table of contents, including Ruth after
# Esther. This source order is not a claim of a universal order of the Writings.
# Primary TOC: https://ebible.org/engjps/ (verified 2026-10-22).
ORDER = "GEN EXO LEV NUM DEU JOS JDG 1SA 2SA 1KI 2KI ISA JER EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL PSA PRO JOB SNG LAM ECC EST RUT DAN EZR NEH 1CH 2CH".split()
CANONICAL = {**{i: i for i in ORDER}, **{i: "SAM" for i in ["1SA", "2SA"]}, **{i: "KINGS" for i in ["1KI", "2KI"]}, **{i: "TWELVE" for i in ORDER[14:26]}, **{i: "EZRA-NEHEMIAH" for i in ["EZR", "NEH"]}, **{i: "CHRONICLES" for i in ["1CH", "2CH"]}}
HEBREW_NAMES = "בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל א|שמואל ב|מלכים א|מלכים ב|ישעיהו|ירמיהו|יחזקאל|הושע|יואל|עמוס|עובדיה|יונה|מיכה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|תהילים|משלי|איוב|שיר השירים|איכה|קהלת|אסתר|רות|דניאל|עזרא|נחמיה|דברי הימים א|דברי הימים ב".split("|")


def source_bytes(locale):
    source = SOURCES[locale]
    target = ROOT / ".cache" / source["file"]
    if not target.exists():
        target.parent.mkdir(exist_ok=True)
        request = urllib.request.Request(source["url"], headers={"User-Agent": "BiblePath Tanakh source importer"})
        with urllib.request.urlopen(request, timeout=120) as response:
            target.write_bytes(response.read())
    raw = target.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != source["sha256"]:
        raise ValueError(f"{locale}: source checksum changed ({digest}); review the source before updating the pin.")
    return raw


def text_hash(books):
    text = "\n".join(f"{book['id']}.{chapter['number']}.{verse['number']}\t{verse['text']}" for book in books for chapter in book["chapters"] for verse in chapter["verses"])
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def edition(meta, books):
    meta.update({"bookCount": 39, "canonicalBookCount": 24, "chapterCount": sum(len(b["chapters"]) for b in books), "verseCount": sum(len(c["verses"]) for b in books for c in b["chapters"]), "textSha256": text_hash(books)})
    return {"meta": meta, "books": [{"id": b["id"], "chapters": b["chapters"]} for b in books]}


def import_usfx(locale, names):
    source = SOURCES[locale]
    raw = source_bytes(locale)
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        xml = archive.read(source["xml"])
    document = ET.fromstring(xml)
    books = []
    for book_id in ORDER:
        node = document.find(f"book[@id='{book_id}']")
        if node is None:
            raise ValueError(f"Missing source book: {locale}/{book_id}")
        books.append(BIBLE.parse_book(node, book_id, names[book_id], "OT"))
    original = locale == "he"
    publication = "hboWLC" if original else "engjps"
    meta = {
        "title": "Westminster Leningrad Codex" if original else "JPS Tanakh 1917",
        "abbreviation": "WLC" if original else "JPS 1917",
        "edition": "Hebrew Masoretic text — Westminster Leningrad Codex" if original else "Jewish Publication Society Tanakh, 1917",
        "language": locale, "direction": "rtl" if original else "ltr", "tradition": "judaism",
        "kind": "original" if original else "translation",
        "license": "Public domain", "licenseUrl": f"https://ebible.org/{publication}/copyright.htm",
        "sourceUrl": source["url"], "sourcePage": f"https://ebible.org/{publication}/",
        "sourceSha256": source["sha256"], "sourceXmlSha256": hashlib.sha256(xml).hexdigest(),
        "credit": "Westminster Leningrad Codex, public-domain text. Open Scriptures Hebrew Bible Project; distributed by eBible.org. No lemma or morphology data imported." if original else "Jewish Publication Society, The Holy Scriptures according to the Masoretic Text (1917). Public-domain transcription distributed by eBible.org.",
        "processing": "Complete source text and native chapter/verse numbers retained. Whitespace normalized; no Unicode normalization. Source headings and textual notes retained separately. Morphological metadata, cross-references and front matter omitted. No alignment to other editions inferred.",
        "contextNote": {
            "nl": "Hebreeuwse Masoretische brontekst. De eigen hoofdstuk- en versnummering van deze editie blijft behouden." if original else "Joodse Engelse vertaling van de Jewish Publication Society (1917). De eigen hoofdstuk- en versnummering van deze editie blijft behouden.",
            "en": "Hebrew Masoretic source text. This edition retains its own chapter and verse numbering." if original else "Jewish English translation by the Jewish Publication Society (1917). This edition retains its own chapter and verse numbering.",
            "fr": "Texte source hébreu massorétique. La numérotation des chapitres et des versets propre à cette édition est conservée." if original else "Traduction juive anglaise de la Jewish Publication Society (1917). La numérotation propre à cette édition est conservée."
        }
    }
    return edition(meta, books)


def import_translation_aid(locale, data):
    lookup = {book["id"]: book for book in data["books"]}
    books = [copy.deepcopy(lookup[book_id]) for book_id in ORDER]
    meta = copy.deepcopy(data["meta"])
    meta.update({"language": locale, "direction": "ltr", "tradition": "christian", "kind": "translation-aid", "contextNote": {
        "nl": ("Nederlandse Statenvertaling" if locale == "nl" else "Franse Louis Segond 1910") + ": een christelijke vertaling als leeshulp bij de Tenach, geen joodse vertaling. Kies Hebreeuws voor de brontekst of JPS 1917 voor een joodse Engelse vertaling. Elke editie behoudt haar eigen versnummering.",
        "en": ("Dutch Statenvertaling" if locale == "nl" else "French Louis Segond 1910") + ": a Christian translation offered as a Tanakh reading aid, not a Jewish translation. Choose Hebrew for the source text or JPS 1917 for a Jewish English translation. Each edition retains its own verse numbering.",
        "fr": ("La Statenvertaling néerlandaise" if locale == "nl" else "La Louis Segond 1910 française") + " est une traduction chrétienne proposée comme aide à la lecture du Tanakh, et non une traduction juive. Choisissez l’hébreu pour le texte source ou JPS 1917 pour une traduction juive anglaise. Chaque édition conserve sa propre numérotation."
    }})
    meta["processing"] += " Only the 39 Tanakh navigation components are included here, reordered into Torah, Prophets and Writings (24 canonical books). This is a Christian translation aid; it is not represented as a Jewish translation."
    return edition(meta, books)


def build():
    languages = {locale: json.loads((ROOT / "dist" / f"bible-data-{locale}.json").read_text(encoding="utf-8")) for locale in ("nl", "fr")}
    names = {locale: {b["id"]: b["name"] for b in data["books"]} for locale, data in languages.items()}
    names["en"] = dict(BIBLE.BOOKS)
    catalogue = []
    for index, book_id in enumerate(ORDER):
        catalogue.append({"id": book_id, "name": names["en"][book_id], "names": {**{locale: values[book_id] for locale, values in names.items()}, "he": HEBREW_NAMES[index]}, "group": "torah" if index < 5 else "prophets" if index < 26 else "writings", "canonicalBook": CANONICAL[book_id]})
    assert len(set(CANONICAL.values())) == 24
    editions = {locale: import_translation_aid(locale, data) for locale, data in languages.items()}
    editions.update({locale: import_usfx(locale, names["en"]) for locale in ("he", "en")})
    return {"meta": {"schemaVersion": 1, "title": "Tanakh", "tradition": "judaism", "canonicalBookCount": 24, "navigationBookCount": 39, "catalogueSourceUrl": "https://ebible.org/engjps/", "catalogueOrderNote": "Navigation follows the eBible JPS 1917 table of contents, including Ruth after Esther. This is the cited source's navigation order, not a claim of a universal order of the Writings.", "numberingPolicy": "Independent edition numbering and reading positions. Matching chapter or verse numbers do not establish alignment."}, "books": catalogue, "editions": editions}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare the rebuilt output with the saved dataset")
    args = parser.parse_args()
    data = build()
    destination = ROOT / "dist" / "tanakh-data.json"
    output = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if destination.read_text(encoding="utf-8") != output:
            raise ValueError("Tanakh dataset differs from the reproducible import")
    else:
        destination.write_text(output, encoding="utf-8")
    print(json.dumps({"file": str(destination), "verified": args.check, "canonicalBooks": 24, "navigationBooks": 39, "editions": {locale: {"chapters": ed["meta"]["chapterCount"], "verses": ed["meta"]["verseCount"]} for locale, ed in data["editions"].items()}}, ensure_ascii=True))


if __name__ == "__main__":
    main()
