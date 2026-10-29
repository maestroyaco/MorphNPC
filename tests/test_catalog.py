"""Run with: python -m unittest discover -s tests -v"""
import hashlib
import json
from pathlib import Path
import struct
import unittest
import zlib

ROOT = Path(__file__).resolve().parents[1]

def tags(path):
    data = path.read_bytes()
    assert data[:3] in (b'FWS', b'CWS'), path
    body = zlib.decompress(data[8:]) if data[:3] == b'CWS' else data[8:]
    assert len(body) + 8 == struct.unpack_from('<I', data, 4)[0], path
    offset = (5 + 4 * (body[0] >> 3) + 7) // 8 + 4
    result = []
    while offset < len(body):
        value = struct.unpack_from('<H', body, offset)[0]
        offset += 2
        code, size = value >> 6, value & 63
        if size == 63:
            size = struct.unpack_from('<I', body, offset)[0]
            offset += 4
        result.append((code, body[offset:offset + size]))
        offset += size
    return result

def exports(swf_tags):
    result = {}
    for code, payload in swf_tags:
        if code != 56:
            continue
        offset = 2
        for _ in range(struct.unpack_from('<H', payload)[0]):
            cid = struct.unpack_from('<H', payload, offset)[0]
            offset += 2
            end = payload.index(0, offset)
            result[payload[offset:end].decode()] = cid
            offset = end + 1
    return result

class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8'))
        cls.sources = {m['id']: m for m in json.loads((ROOT / 'catalog-sources.json').read_text(encoding='utf-8'))['items']}

    def test_unique_ids_preserve_existing_npc_cart(self):
        old = json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))
        ids = [m['id'] for m in old + self.items]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(self.sources), {m['id'] for m in self.items})

    def test_previews_and_swf_integrity(self):
        for item in self.items:
            with self.subTest(id=item['id']):
                source = self.sources[item['id']]
                for field, digest in [('png_url', 'preview_sha256'), ('swf_url', 'swf_sha256')]:
                    path = ROOT / item[field]
                    self.assertTrue(path.resolve().is_relative_to(ROOT))
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), source[digest])
                png = (ROOT / item['png_url']).read_bytes()
                self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
                self.assertTrue(all(struct.unpack_from('>II', png, 16)))
                self.assertEqual(tags(ROOT / item['swf_url'])[-1][0], 0)

    def test_mounts_keep_original_animation_symbols(self):
        mounts = [m for m in self.items if m['category'] == 'mounts']
        self.assertEqual(len(mounts), 177)
        for item in mounts:
            with self.subTest(id=item['id']):
                source = self.sources[item['id']]
                self.assertEqual(source['swf_sha256'], source['source_sha256'])
                symbols = exports(tags(ROOT / item['swf_url']))
                audited = source['animation_max_frames']
                for action in ['walk', 'run']:
                    names = {n for n in symbols if n.lower().startswith(action)}
                    self.assertTrue(names)
                    self.assertTrue(names <= audited.keys())
                    self.assertTrue(all(audited[n] > 1 for n in names))
        self.assertNotIn('mounts-7000', self.sources)
        self.assertNotIn('mounts-9097', self.sources)

    def test_individual_ornament_linkage_and_dependencies(self):
        definitions = {2, 6, 7, 10, 11, 14, 20, 21, 22, 32, 33, 34, 35, 36, 37, 39, 46, 48, 60, 75, 83, 84, 87, 90, 91}
        for item in self.items:
            if item['category'] != 'ornaments':
                continue
            with self.subTest(id=item['id']):
                source = self.sources[item['id']]
                swf_tags = tags(ROOT / item['swf_url'])
                self.assertEqual(exports(swf_tags), {source['symbol']: source['character_id']})
                ids = [struct.unpack_from('<H', p)[0] for code, p in swf_tags if code in definitions]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertIn(source['character_id'], ids)
                self.assertTrue(set(source['required_character_ids']) <= set(ids))

if __name__ == '__main__':
    unittest.main()
