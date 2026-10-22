/* Reviewed person-reference navigation. Source citations remain immutable. */
(function (root) {
  'use strict';
  const books = new Set('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA JOB PSA PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' '));
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').replace(/[–−]/g, '-');
  const validNumber = value => Number.isSafeInteger(value) && value > 0;
  const sourceEditions = new Set(['atlas', 'atlas-KJV', 'atlas-ESV', 'catholic']);
  const copyNote = value => value && typeof value === 'object' ? {...value} : value;

  class PersonPassageMap {
    constructor(data) {
      if (data?.meta?.targetEdition !== 'catholic-nl' || !data.references || Array.isArray(data.references)) throw new Error('Invalid person passage map');
      this.meta = {...data.meta};
      this.references = new Map();
      for (const [key, record] of Object.entries(data.references)) {
        const divider = key.indexOf('|'), edition = key.slice(0, divider), label = normalize(key.slice(divider + 1));
        if (!sourceEditions.has(edition) || !label || !['mapped', 'partial', 'unavailable'].includes(record.status) || !Array.isArray(record.targets)) throw new Error('Invalid source passage entry');
        if ((record.status === 'unavailable') !== (record.targets.length === 0)) throw new Error('Inconsistent person passage status');
        const normalizedKey = `${edition}|${label}`;
        if (this.references.has(normalizedKey)) throw new Error('Duplicate person passage mapping');
        const targets = record.targets.map(target => {
          const endVerse = target.endVerse ?? target.verse;
          if (target.edition !== 'catholic-nl' || !books.has(target.book) || ![target.chapter, target.verse, endVerse].every(validNumber) || endVerse < target.verse) throw new Error('Invalid Dutch passage target');
          return {book:target.book, chapter:target.chapter, verse:target.verse, endVerse, edition:'catholic-nl'};
        });
        this.references.set(normalizedKey, {status:record.status, targets, ...(record.note ? {note:copyNote(record.note)} : {})});
      }
    }

    resolve(reference) {
      const ref = typeof reference === 'string' ? {label:reference} : reference || {};
      const sourceLabel = String(ref.label ?? ''), sourceUrl = String(ref.url ?? '');
      // An explicit edition belongs to the citation. Unknown editions and
      // unreviewed labels must never inherit the atlas's identical numbers.
      const edition = ref.edition || (ref.translation ? `atlas-${ref.translation}` : 'atlas');
      const record = sourceEditions.has(edition) ? this.references.get(`${edition}|${normalize(sourceLabel)}`) : null;
      return record ? {status:record.status, targets:record.targets.map(target => ({...target})), sourceLabel, sourceUrl, ...(record.note ? {note:copyNote(record.note)} : {})} : {status:'unavailable', targets:[], sourceLabel, sourceUrl};
    }
  }
  root.PersonPassageMap = PersonPassageMap;
  if (typeof module !== 'undefined') module.exports = {PersonPassageMap};
})(typeof window !== 'undefined' ? window : globalThis);
