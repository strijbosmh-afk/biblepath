#!/usr/bin/env python3
"""Build the complete Qur'an reader data from attributed, pinned primary sources.

Python standard library only. Run with --check to compare a deterministic rebuild
with the committed asset. Downloads are cached in .cache/. A changed checksum
requires reviewing the new edition and updating its pin; it is never accepted
silently. QuranEnc requires keeping translations current, so check the edition's
checkUpdatesUrl before publishing a new release.
"""
import argparse
import hashlib
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUTPUT = ROOT / "dist/quran-data.json"
SOURCES = {
    "arabic": {
        "file": "quran-tanzil-uthmani.xml",
        "url": "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&agree=true",
        "sha256": "203f0f1bf3158b1e5be4ab9f8f6870e570aab6d9a626fe6192a70b75d4afe0fd",
    },
    "structure": {
        "file": "quran-metadata.xml",
        "url": "https://tanzil.net/res/text/metadata/quran-data.xml",
        "sha256": "8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a",
    },
    "nl": {
        "file": "quran-dutch-center.xml",
        "url": "https://quranenc.com/en/home/d/xml/dutch_center",
        "sha256": "7b3ed248e58d32ce551ebdd6823a191b27fb254e37256ca66bbc0a568ae39b70",
        "key": "dutch_center", "version": "2.0.10",
        "title": "Dutch Translation — Rowwad Translation Center",
        "credit": "Issued by the Dutch Islamic Center and developed under the supervision of Rowwad Translation Center",
    },
    "en": {
        "file": "quran-english-rwwad.xml",
        "url": "https://quranenc.com/en/home/d/xml/english_rwwad",
        "sha256": "0ad8a91e116f6be9206eff97e2c56931a6b662393be9b6a3f2310327c224b127",
        "key": "english_rwwad", "version": "1.0.20",
        "title": "English Translation — Rowwad Translation Center",
        "credit": "Translated by the team of the Rowwad Translation Center, in cooperation with the Rabwah Dawah Association, the Islamic Content Service Association in Languages, and the IslamHouse.com website.",
    },
    "fr": {
        "file": "quran-french-rashid.xml",
        "url": "https://quranenc.com/en/home/d/xml/french_rashid",
        "sha256": "c300fd0bb5468ac2fc3c665d6a8eff949b60d65ceec8722278b971529cf853c3",
        "key": "french_rashid", "version": "1.0.3",
        "title": "French Translation — Rachid Maach",
        "credit": "Translated by Rachid Maach (Rashid Ma’ash).",
    },
}


def source_bytes(source):
    path = CACHE / source["file"]
    if not path.exists():
        request = urllib.request.Request(source["url"], headers={"User-Agent": "BiblePath data importer"})
        with urllib.request.urlopen(request, timeout=90) as response:
            contents = response.read()
        if hashlib.sha256(contents).hexdigest() != source["sha256"]:
            raise ValueError(f"Source changed: {source['url']}. Review the edition before updating its checksum.")
        CACHE.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
    contents = path.read_bytes()
    if hashlib.sha256(contents).hexdigest() != source["sha256"]:
        raise ValueError(f"Checksum mismatch: {path}")
    return contents


def plain_text(element):
    # These pinned XML exports contain plain-text CDATA. Refuse future markup
    # rather than losing words, executing HTML, or silently changing Scripture.
    text = element.text or ""
    if len(element) or re.search(r"</?[A-Za-z][^>]*>", text):
        raise ValueError("Unexpected markup in a translation or footnote")
    return text


def build():
    blobs = {key: source_bytes(source) for key, source in SOURCES.items()}
    arabic = ET.fromstring(blobs["arabic"])
    structure = ET.fromstring(blobs["structure"])
    notice = re.search(r"<!--(.*?)-->", blobs["arabic"].decode("utf-8"), re.S).group(1).strip()
    editions = {
        "ar": {
            "title": "Tanzil Qur’an — Uthmani", "language": "ar", "version": "1.1",
            "sourceUrl": "https://tanzil.net", "license": "CC BY 3.0; verbatim text",
            "licenseUrl": "https://tanzil.net/docs/Text_License",
            "credit": "Tanzil Project", "copyrightNotice": notice,
            "checkUpdatesUrl": "https://tanzil.net/updates/",
        }
    }
    translations = {}
    for language in ("nl", "en", "fr"):
        source = SOURCES[language]
        document = ET.fromstring(blobs[language])
        transcript = {element.tag: element.text or "" for element in document.find("meta")}
        if transcript["id"] != source["key"] or f"(v{source['version']}-xml.1)" not in transcript["updated_at"]:
            raise ValueError(f"Unexpected {language} edition")
        editions[language] = {
            "title": source["title"], "language": language, "version": source["version"],
            "sourceUrl": transcript["url"], "license": "QuranEnc republication terms",
            "licenseUrl": "https://quranenc.com/en/home/api/", "credit": source["credit"],
            "publisher": "QuranEnc.com", "transcript": transcript,
            "checkUpdatesUrl": transcript["check_updates"],
            "rightsNotice": "Republish unchanged with publisher, source, version and transcript information retained. Report translation issues to QuranEnc, follow its updates, and do not place inappropriate advertising alongside the text. See the source terms.",
        }
        rows = {}
        for sura in document.findall("sura_list/sura"):
            for aya in sura.findall("aya"):
                key = (int(sura.attrib["number"]), int(aya.attrib["number"]))
                if key in rows:
                    raise ValueError(f"Duplicate {language} ayah {key}")
                text = plain_text(aya.find("translation"))
                if not text.strip():
                    raise ValueError(f"Empty {language} ayah {key}")
                rows[key] = (text, plain_text(aya.find("footnotes")))
        translations[language] = rows

    surahs, verse_keys = [], set()
    source_surahs = arabic.findall("sura")
    metadata_surahs = structure.findall("suras/sura")
    if len(source_surahs) != 114 or len(metadata_surahs) != 114:
        raise ValueError("Expected 114 surahs")
    for number, (source_surah, metadata) in enumerate(zip(source_surahs, metadata_surahs), 1):
        if int(source_surah.attrib["index"]) != number or int(metadata.attrib["index"]) != number:
            raise ValueError("Unexpected surah order")
        ayahs = source_surah.findall("aya")
        if len(ayahs) != int(metadata.attrib["ayas"]):
            raise ValueError(f"Unexpected ayah count in surah {number}")
        surah = {"number": number, "name": source_surah.attrib["name"],
                 "transliteration": metadata.attrib["tname"],
                 "translations": {"en": metadata.attrib["ename"]}, "ayahs": []}
        for verse_number, aya in enumerate(ayahs, 1):
            if int(aya.attrib["index"]) != verse_number or not aya.attrib["text"].strip():
                raise ValueError(f"Invalid Arabic ayah {number}:{verse_number}")
            key = (number, verse_number)
            verse_keys.add(key)
            verse = {"number": verse_number, "arabic": aya.attrib["text"],
                     "translations": {language: rows[key][0] for language, rows in translations.items()}}
            notes = {language: rows[key][1] for language, rows in translations.items() if rows[key][1]}
            if notes:
                verse["notes"] = notes
            surah["ayahs"].append(verse)
            if "bismillah" in aya.attrib:
                if verse_number != 1 or number in (1, 9):
                    raise ValueError("Unexpected unnumbered basmala")
                surah["bismillah"] = aya.attrib["bismillah"]
        if ("bismillah" in surah) != (number not in (1, 9)):
            raise ValueError(f"Unexpected basmala in surah {number}")
        surahs.append(surah)
    if len(verse_keys) != 6236 or any(set(rows) != verse_keys for rows in translations.values()):
        raise ValueError("All four editions must contain the same 6,236 ayah identifiers")
    sources = [{"id": key, "url": source["url"], "sha256": source["sha256"]} for key, source in SOURCES.items()]
    return {"meta": {
        "title": "Qur’an", "language": "ar", "defaultTranslation": "nl",
        "surahCount": 114, "ayahCount": 6236, "source": "Tanzil Project; QuranEnc.com",
        "sourceUrl": "https://tanzil.net", "importedOn": "2026-10-22",
        "license": "Arabic: Tanzil CC BY 3.0/verbatim terms. Translations: QuranEnc republication terms.",
        "copyrightNotice": notice,
        "structureCredit": "Surah names, transliterations and counts: Tanzil Quran Metadata 1.0, © 2008–2009 Tanzil.info, CC BY.",
        "sources": sources,
        "editorialNote": "Arabic text, translations, and translator footnotes are preserved separately. Surah-opening basmalas supplied as unnumbered text remain separate from numbered ayahs. No biblical people or genealogy links are inferred.",
    }, "editions": editions, "surahs": surahs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the generated JSON is reproducible without writing it")
    args = parser.parse_args()
    output = (json.dumps(build(), ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_bytes() != output:
            raise SystemExit("Qur'an reader data differs from its pinned sources")
        print("Qur'an import verified: 114 surahs; 6,236 Arabic ayahs; complete Dutch, English and French translations with notes.")
    else:
        OUTPUT.write_bytes(output)
        print(f"Wrote {OUTPUT.name}: {len(output):,} bytes; 114 surahs and 6,236 ayahs in four editions.")


if __name__ == "__main__":
    main()
