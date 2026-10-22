"""Source extraction checks, including tails after notes and verses across blocks."""
import importlib.util
import pathlib
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("bible_import", root / "scripts" / "import-bible.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
xml = '''<book id="GEN"><h>Not scripture</h><c id="1"/>
<d>A Psalm by David.</d><p><v id="1"/><w s="H1">One</w>, <w>two</w><f><fr>1:1</fr><ft>A note with <wh>Hebrew</wh>.</ft></f> three.</p>
<q><wj>Four</wj> <w>five</w>.<ve/></q><p><v id="2"/>Six.<p sfm="sp">Friends</p> Seven.<x><xt>Do not insert this cross-reference.</xt></x> Eight.<ve/></p>
<p><v id="3"/><f><fr>1:3</fr><ft>Some manuscripts include this verse.</ft></f><ve/></p></book>'''
book = module.parse_book(ET.fromstring(xml), "GEN", "Genesis", "OT")
chapter = book["chapters"][0]
assert chapter["headings"] == [{"text": "A Psalm by David.", "beforeVerse": 1, "kind": "superscription"}]
assert chapter["verses"][0] == {"number": 1, "text": "One, two three. Four five.", "notes": ["A note with Hebrew."]}
assert chapter["verses"][1]["text"] == "Six. Friends Seven. Eight."
assert chapter["verses"][2] == {"number": 3, "text": "", "notes": ["Some manuscripts include this verse."]}
assert len(module.BOOKS) == 66
print("Bible import passed: mixed XML text, inline tags, notes and tails, cross-reference exclusion, verse continuation, superscriptions, speaker labels, and empty textual variants.")
