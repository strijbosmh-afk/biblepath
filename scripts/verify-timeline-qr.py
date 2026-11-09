"""Independently decode generated/downloaded QR artifacts with ZXing-C++."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache' / 'qr-test-tools'))
from PIL import Image, ImageDraw
import zxingcpp

def image_from(path):
    path = Path(path)
    if path.suffix.lower() != '.svg':
        return Image.open(path).convert('L')
    root = ET.parse(path).getroot()
    size = int(root.attrib['viewBox'].split()[2])
    image = Image.new('L', (size * 8, size * 8), 255)
    draw = ImageDraw.Draw(image)
    ns = {'s': 'http://www.w3.org/2000/svg'}
    data = root.find('s:path', ns).attrib['d']
    points = re.findall(r'M(\d+),(\d+)h1v1h-1z', data)
    assert ' '.join(f'M{x},{y}h1v1h-1z' for x, y in points) == data
    assert root.find('s:rect', ns).attrib['fill'] == '#fff'
    for x, y in points:
        x, y = int(x), int(y)
        assert 4 <= x < size - 4 and 4 <= y < size - 4, 'Four-module quiet zone required'
        draw.rectangle((x * 8, y * 8, x * 8 + 7, y * 8 + 7), fill=0)
    return image

def verify(path, expected, preview=False):
    image = image_from(path)
    result = zxingcpp.read_barcode(image)
    assert result is not None and result.text == expected, f'QR payload mismatch: {path}'
    if preview:
        result = zxingcpp.read_barcode(image.resize((256, 256), Image.Resampling.NEAREST))
        assert result is not None and result.text == expected, f'QR preview mismatch: {path}'
    return image.size

if __name__ == '__main__':
    manifest = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    for item in manifest:
        size = verify(item['path'], item['url'], item.get('preview', False))
        print(f"Decoded {Path(item['path']).name}: {size[0]}x{size[1]}, exact comparison URL")
