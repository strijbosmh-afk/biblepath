#!/usr/bin/env node
'use strict';
// Geographical evidence is a supplement, never a replacement for a tradition's
// place identity or textual evidence. No name-based or scripture-based geocoding.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const COMMIT = '7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f';
const SOURCE_SHA = 'b8187aa4737e8517ccc090f765d2be11da4c548cd2a59d3cdcb62e952cb8c0f2';
const SOURCE_URL = `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/${COMMIT}/data/ancient.jsonl`;
const SOURCE_LINK = `https://github.com/openbibleinfo/Bible-Geocoding-Data/blob/${COMMIT}/data/ancient.jsonl`;
const LOCAL_SOURCE = path.join(ROOT, '.cache', 'OpenBible-ancient.jsonl');
const localized = (nl, en, fr) => ({ nl, en, fr });
const plain = value => String(value || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const point = value => {
  if (typeof value !== 'string' || !/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(value)) return null;
  const [lon, lat] = value.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
};
function sourceIndex(bytes) {
  if (hash(bytes) !== SOURCE_SHA) throw new Error('OpenBible snapshot checksum mismatch; review changed input before updating the pin.');
  return new Map(bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    const record = JSON.parse(line); return [record.id, { ...record, sourceLine: index + 1 }];
  }));
}
function candidates(record) {
  const found = [];
  for (const identification of record.identifications || []) {
    for (const resolution of identification.resolutions || []) {
      const location = point(resolution.lonlat);
      if (!location || resolution.special) continue;
      const rawScore = (identification.score?.time_total || 0) * (resolution.best_time_score == null ? 1 : resolution.best_time_score / 1000);
      // A rejected identification is not revived by a coordinate on a downstream place.
      if (rawScore <= 0 || (resolution.best_path_score ?? 0) <= 0) continue;
      found.push({ ...location, label: plain(resolution.description), sourceRecord: record.id,
        coordinateType: resolution.lonlat_type || 'point', score: Math.round(rawScore * 1000) / 1000,
        pathScore: resolution.best_path_score, radiusMeters: resolution.geometry_radius_meters || null });
    }
  }
  return found;
}
function resolve(records) {
  const ordered = records.flatMap(candidates).sort((a, b) => b.score - a.score || b.pathScore - a.pathScore || a.sourceRecord.localeCompare(b.sourceRecord) || a.lon - b.lon || a.lat - b.lat);
  const seen = new Set();
  const unique = ordered.filter(candidate => {
    const key = `${candidate.lat},${candidate.lon}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (!unique.length) return { lat: null, lon: null, status: 'unmapped', alternatives: [] };
  const first = unique[0];
  // The time-weighted ranking and the path score use different scales. A
  // middling time score is not a secure identification simply because its
  // path score reaches 500. Reserve this label for maximum source confidence.
  const status = first.coordinateType !== 'point' ? 'approximate' : unique.length > 1 || records.length > 1 || first.score < 1000 || first.pathScore < 500 ? 'uncertain' : 'identified';
  return { lat: first.lat, lon: first.lon, status, coordinateType: first.coordinateType,
    sourceRecord: first.sourceRecord, candidateLabel: first.label, sourceScore: first.score,
    ...(first.radiusMeters ? { radiusMeters: first.radiusMeters } : {}),
    alternatives: unique.slice(1).map(({ lat, lon, label, sourceRecord, coordinateType }) => ({ lat, lon, label, sourceRecord, coordinateType })) };
}
function explanation(location) {
  const name = location.candidateLabel;
  if (location.status === 'unmapped') return localized('De geografische bron levert geen bruikbaar punt. Dit profiel blijft beschikbaar zonder kaartmarker.', 'The geographical source supplies no usable point. This profile remains available without a map marker.', 'La source géographique ne fournit aucun point utilisable. Ce profil reste accessible sans repère cartographique.');
  if (location.status === 'approximate') return localized(`Oriëntatiepunt voor een gebied of zoekzone: ${name}. Dit is geen exacte stadsgrens of bewezen plaats van de beschreven gebeurtenissen.`, `Reference point for a region or search area: ${name}. It is not an exact city boundary or a proven setting of the narrated events.`, `Point de repère pour une région ou une zone de recherche : ${name}. Il ne représente ni les limites exactes d’une ville ni un lieu prouvé des événements racontés.`);
  if (location.status === 'uncertain') return localized(`Mogelijke ligging: ${name}. De bron vermeldt alternatieven of onzekerheid; de marker toont één kandidaat, geen vastgestelde locatie van alle vermeldingen.`, `Possible location: ${name}. The source records alternatives or uncertainty; the marker shows one candidate, not an established location for every mention.`, `Localisation possible : ${name}. La source indique des alternatives ou des incertitudes ; le repère montre un candidat, pas un lieu établi pour toutes les mentions.`);
  return localized(`Geografisch punt volgens OpenBible: ${name}. Het bepaalt geen stadsgrenzen en bevestigt geen gebeurtenissen of personen uit de teksten.`, `Geographical point according to OpenBible: ${name}. It defines no city boundaries and does not corroborate narrated events or persons.`, `Point géographique selon OpenBible : ${name}. Il ne définit pas les limites de la ville et ne confirme ni les événements ni les personnes des récits.`);
}
function build(bytes) {
  const index = sourceIndex(bytes);
  const bible = readJson('dist/places-data.json');
  const judaism = readJson('dist/tradition-atlas-judaism.json');
  const islam = readJson('dist/tradition-atlas-islam.json');
  const overrides = readJson('scripts/place-geography-overrides.json');
  const seenOverrides = new Set();
  const places = [];
  for (const [tradition, records] of [['christianity', bible.places], ['judaism', judaism.places], ['islam', islam.places]]) {
    for (const place of records) {
      const override = overrides.places[place.id];
      if (override) seenOverrides.add(place.id);
      if (tradition !== 'christianity' && !override) throw new Error(`Missing reviewed mapping: ${place.id}`);
      const ids = override?.openBibleIds || (tradition === 'christianity' ? place.classification.sources.map(source => source.id) : []);
      const sources = ids.map(id => {
        if (!index.has(id)) throw new Error(`Unknown OpenBible identity: ${id}`);
        return index.get(id);
      });
      if (override?.review) {
        const normalizeName = name => String(name).toLowerCase().replace(/[-_\s]+/g, ' ').replace(/\d+$/, '').trim();
        const names = new Set([place.name, ...(place.aliases || [])].map(normalizeName));
        const passages = new Set(place.refs.map(ref => `${ref.book.toUpperCase()} ${ref.chapter}:${ref.verse}`));
        for (const joined of override.review) {
          const record = sources.find(source => source.id === joined.openBibleId);
          const sourcePassages = new Set((record?.verses || []).map(verse => verse.usx));
          if (!record || record.friendly_id !== joined.sourceName || !names.has(normalizeName(joined.sourceName)) || !joined.matchingPassages?.length || !joined.matchingPassages.every(ref => passages.has(ref) && sourcePassages.has(ref))) {
            throw new Error(`Unverified additional geographical identity: ${place.id} / ${joined.openBibleId}`);
          }
        }
      }
      const location = override && Object.hasOwn(override, 'lat') ? {
        lat: override.lat, lon: override.lon, status: override.status, alternatives: override.alternatives || [],
        ...(override.coordinateType ? { coordinateType: override.coordinateType } : {})
      } : resolve(sources);
      if (override?.status) location.status = override.status;
      if (override?.coordinateType) location.coordinateType = override.coordinateType;
      // A representative regional point remains approximate even when its
      // source profile combines additional names or narrative contexts.
      if (location.status !== 'unmapped' && location.coordinateType && location.coordinateType !== 'point') location.status = 'approximate';
      const citations = sources.map(record => ({ label: `OpenBible.info — ${record.friendly_id} (CC BY 4.0)`, url: `${SOURCE_LINK}#L${record.sourceLine}` }));
      citations.push(...(override?.sources || []));
      if (!citations.length) throw new Error(`Missing geography evidence: ${place.id}`);
      const note = override?.note ? Object.fromEntries(Object.entries(override.note).map(([language, text]) => [language, text.replaceAll('{candidate}', location.candidateLabel || '')])) : explanation(location);
      places.push({ id: place.id, tradition, ...location, note, sources: citations });
    }
  }
  if (Object.keys(overrides.places).some(id => !seenOverrides.has(id))) throw new Error('Geography override targets a missing place.');
  const counts = Object.fromEntries(['christianity', 'judaism', 'islam'].map(tradition => {
    const subset = places.filter(p => p.tradition === tradition);
    return [tradition, { total: subset.length, mapped: subset.filter(p => p.status !== 'unmapped').length }];
  }));
  return { meta: { title: 'ReligieAtlas place geography', version: 1, reviewedAt: '2026-10-22', counts,
    scope: localized('Geografische oriëntatie bij afzonderlijke religieuze plaatsprofielen. Punten zijn geen historische grenzen; betwiste en globale identificaties blijven herkenbaar.', 'Geographical orientation for separate religious place profiles. Points are not historical boundaries; disputed and broad identifications remain explicit.', 'Repères géographiques pour des profils religieux distincts. Les points ne sont pas des frontières historiques ; les identifications discutées ou générales restent explicites.'),
    sourceSnapshot: { commit: COMMIT, sha256: SOURCE_SHA, url: SOURCE_URL, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    inputHashes: Object.fromEntries([['places-data.json', bible], ['tradition-atlas-judaism.json', judaism], ['tradition-atlas-islam.json', islam], ['place-geography-overrides.json', overrides]].map(([file, value]) => [file, hash(JSON.stringify(value))])),
    sources: [{ label: 'OpenBible.info Bible Geocoding Data', url: `https://github.com/openbibleinfo/Bible-Geocoding-Data/tree/${COMMIT}`, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }, { label: 'Wikidata coordinate statements', url: 'https://www.wikidata.org/', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }, { label: 'UNESCO World Heritage Centre', url: 'https://whc.unesco.org/', license: 'Coordinate facts; source links retained' }],
    changes: ['Joined Christian places through existing OpenBible classification IDs plus explicitly reviewed source records for combined name forms and exact passage contexts; coordinates are not inferred from a name alone.', 'Selected the highest positive source-ranked coordinate candidate, retaining alternative coordinates and ambiguity; scores are not presented as probabilities.', 'Preserved representative points and uncertainty centres as approximate locations; retained the reviewed regional exception for Secu and textual uncertainty for Vedan.', 'Mapped Jewish and Islamic records with an explicit reviewed table; no identity merges across religions.', 'Copied coordinate facts and wrote independent explanatory notes; no photos, source prose, polygons or OpenStreetMap geometry imported.'] }, places };
}
async function main() {
  if (!fs.existsSync(LOCAL_SOURCE)) {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`Could not fetch pinned OpenBible snapshot: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    sourceIndex(bytes); fs.mkdirSync(path.dirname(LOCAL_SOURCE), { recursive: true }); fs.writeFileSync(LOCAL_SOURCE, bytes);
  }
  const result = build(fs.readFileSync(LOCAL_SOURCE));
  const target = path.join(ROOT, 'dist', 'place-geography.json');
  const output = JSON.stringify(result, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('place-geography.json is not reproducible.');
  } else fs.writeFileSync(target, output);
  console.log(`Place geography ${process.argv.includes('--check') ? 'verified' : 'built'}: ${JSON.stringify(result.meta.counts)}`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { build, candidates, resolve, point, SOURCE_SHA };
