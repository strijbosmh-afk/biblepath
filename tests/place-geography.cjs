'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const { candidates, resolve, point } = require('../scripts/build-place-geography.cjs');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const data = read('dist/place-geography.json');
const overrides = read('scripts/place-geography-overrides.json');
const collections = { christianity: read('dist/places-data.json'), judaism: read('dist/tradition-atlas-judaism.json'), islam: read('dist/tradition-atlas-islam.json') };
const supported = new Set(['identified', 'approximate', 'traditional', 'uncertain', 'unmapped']);
const byId = new Map(data.places.map(place => [place.id, place]));
assert.equal(byId.size, data.places.length, 'No duplicate geographical identities');
assert.equal(data.places.length, 639, 'Every existing profile must be represented, including unmapped profiles');
const localized = value => ['nl', 'en', 'fr'].every(language => typeof value?.[language] === 'string' && value[language].trim());
const validPoint = p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
for (const [tradition, collection] of Object.entries(collections)) {
  for (const place of collection.places) {
    const geo = byId.get(place.id);
    assert(geo, `Missing geography record: ${place.id}`);
    assert.equal(geo.tradition, tradition, 'A geographical join must not change religious identity');
    assert(supported.has(geo.status));
    assert(localized(geo.note));
    assert(geo.sources.length, `Missing geographical evidence for ${geo.id}`);
    for (const source of geo.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:'); assert(!url.username && !url.password); assert(source.label.trim());
    }
    if (geo.status === 'unmapped') assert(geo.lat === null && geo.lon === null, 'Unknown places must not receive fabricated coordinates');
    else assert(validPoint(geo), `Invalid geographic location: ${geo.id}`);
    if (geo.coordinateType && geo.coordinateType !== 'point') assert.equal(geo.status, 'approximate', 'Area representatives must not be shown as precise locations');
    const points = new Set([`${geo.lat},${geo.lon}`]);
    for (const other of geo.alternatives || []) {
      assert(validPoint(other)); assert(other.label.trim());
      const key = `${other.lat},${other.lon}`;
      assert(!points.has(key), 'An alternative should not duplicate the primary location'); points.add(key);
    }
    if (geo.alternatives?.length) assert.notEqual(geo.status, 'identified', 'Multiple candidate locations must remain visibly uncertain');
  }
  const subset = data.places.filter(p => p.tradition === tradition);
  assert.equal(subset.length, collection.places.length);
  assert.deepEqual(data.meta.counts[tradition], { total: subset.length, mapped: subset.filter(p => p.status !== 'unmapped').length });
}
for (const [file, expectedHash] of Object.entries(data.meta.inputHashes)) {
  const value = read(file === 'place-geography-overrides.json' ? `scripts/${file}` : `dist/${file}`);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'), expectedHash, `Outdated input join: ${file}`);
}
assert(Object.keys(overrides.places).every(id => byId.has(id)));
// Classification aliases alone can hide another ancient identity. Additional
// reviewed identities must match both an indexed name and its actual passage,
// rather than combining unrelated homonyms at a plausible-looking coordinate.
const normalizeName = name => String(name).toLowerCase().replace(/[-_\s]+/g, ' ').replace(/\d+$/, '').trim();
for (const place of collections.christianity.places) {
  const override = overrides.places[place.id];
  if (!override?.review) continue;
  const names = new Set([place.name, ...(place.aliases || [])].map(normalizeName));
  const passages = new Set(place.refs.map(ref => `${ref.book.toUpperCase()} ${ref.chapter}:${ref.verse}`));
  for (const joined of override.review) {
    assert(override.openBibleIds.includes(joined.openBibleId));
    assert(names.has(normalizeName(joined.sourceName)), `Unrelated source name joined to ${place.id}`);
    assert(joined.matchingPassages.length && joined.matchingPassages.every(ref => passages.has(ref)), `No exact passage supports ${place.id}'s extra identity`);
  }
  assert.notEqual(byId.get(place.id).status, 'identified', 'A combined profile must retain its qualification');
}
const sepharad = byId.get('place-H5614');
assert.equal(sepharad.status, 'uncertain');
assert(overrides.places[sepharad.id].openBibleIds.includes('a0a98de'));
assert(sepharad.alternatives.some(p => p.label === 'Sparta'), 'Sepharad cannot silently become Sardis alone');
const rakkath = byId.get('place-H7557');
assert.equal(rakkath.status, 'uncertain');
assert(rakkath.alternatives.some(p => p.lat === 32.806389 && p.lon === 35.525833), 'Rakkath must retain Tel Raqqat alongside Tiberias');
assert(byId.get('place-H5910').alternatives.some(p => p.label === 'Acre'), 'Acco and Ptolemais retain their distinct source coordinates');
assert.equal(byId.get('place-H7906').status, 'approximate', 'Between Gibeah and Ramah is a search area, not an exact Secu location');
assert.equal(byId.get('place-H7906').coordinateType, 'representative point');
assert.equal(byId.get('place-H2051').status, 'unmapped', 'The textual uncertainty around Vedan must not become a fixed Tel Dan pin');
assert.equal(byId.get('place-H2051').lat, null);
assert.equal(byId.get('place-H6946G').sourceRecord, 'ac2cef0', 'Kadesh-barnea is not Kadesh2 in 2 Samuel 24:6');
assert(!(overrides.places['place-H6946G']?.openBibleIds || []).includes('adc9b5a'));
assert.equal(byId.get('judaism:place-bethlehem').lat, 31.704306, 'Ruth’s Bethlehem is not the same-name northern settlement');
assert.equal(byId.get('judaism:place-on').candidateLabel, 'Ain Shams', 'On follows Heliopolis, not another similarly named city');
assert.equal(byId.get('islam:mecca').lat, 21.4225);
assert.equal(byId.get('islam:medina').lat, 24.47);
assert.equal(byId.get('judaism:place-sinai').status, 'traditional');
assert.equal(byId.get('islam:sinai').status, 'traditional');
assert.equal(byId.get('islam:egypt').status, 'approximate');
assert.equal(byId.get('islam:sheba').status, 'approximate');
assert.equal(byId.get('islam:ahqaf').status, 'unmapped');
assert.equal(byId.get('islam:judi').status, 'unmapped');
const shared = ['place-H3389', 'judaism:place-jerusalem', 'islam:jerusalem'].map(id => byId.get(id));
assert.equal(new Set(shared.map(p => p.id)).size, 3);
assert(shared.every(p => p.lat === 31.776667 && p.lon === 35.234167), 'Shared physical points retain separate tradition profiles');
assert.match(byId.get('islam:jerusalem').note.nl, /interpretatie/);

// Source-coordinate parsing and ranking guard against invented points, longitude
// reversal, rejected identifications and loss of competing place identities.
assert.deepEqual(point('35.234167,31.776667'), { lon: 35.234167, lat: 31.776667 });
for (const invalid of ['', 'NaN,40', '0,91', '181,0', null, ',']) assert.equal(point(invalid), null);
const record = (id, lonlat, score = 1000, type = 'point', pathScore = 500) => ({ id, identifications: [{ score: { time_total: score }, resolutions: [{ lonlat, description: '<modern>Example</modern>', lonlat_type: type, best_path_score: pathScore }] }] });
assert.deepEqual(candidates(record('rejected', '35,32', 0)), []);
assert.deepEqual(candidates(record('rejected-path', '35,32', 1000, 'point', -1)), []);
assert.equal(resolve([record('symbolic', null)]).status, 'unmapped');
assert.equal(resolve([record('region', '35,32', 1000, 'representative point')]).status, 'approximate');
assert.equal(resolve([record('weak', '35,32', 100)]).status, 'uncertain');
assert.equal(resolve([record('moderate', '35,32', 500)]).status, 'uncertain', 'A middling time score must not be confused with a high-confidence path score');
assert.equal(resolve([record('qualified', '35,32', 999)]).status, 'uncertain');
assert.equal(resolve([record('strong', '35,32')]).status, 'identified');
const options = resolve([record('weak', '34,31', 100), record('strong', '35,32'), record('duplicate-weak', '35,32', 10)]);
assert.equal(options.lat, 32); assert.equal(options.lon, 35); assert.equal(options.sourceRecord, 'strong');
assert.equal(options.alternatives.length, 1); assert.equal(options.status, 'uncertain');
assert.equal(resolve([record('a', '35,32'), record('b', '35,32')]).status, 'uncertain', 'Combined source identities are not collapsed into a certainty claim');
assert(!JSON.stringify(data).includes('<modern'), 'Source XML must not leak into profile copy');
assert(!JSON.stringify(data).includes('{candidate}'), 'Authoring placeholders must be resolved before publishing');
assert(!/studyQuestions|studievragen/.test(JSON.stringify(data)), 'The atlas remains an information resource');
console.log(`Place geography passed: ${data.places.length} separate profiles, ${data.places.filter(p => p.status !== 'unmapped').length} mapped; provenance, alternatives, approximate regions and unknowns verified.`);
