/* Find sourced family paths across the entire index, independent of map filters. */
(function () {
  'use strict';

  class BiblePaths {
    constructor(data) {
      this.byId = new Map(data.people.map(person => [person.id,person]));
      this.byPerson = new Map(data.people.map(person => [person.id,[]]));
      for (const edge of data.relationships) {
        if (!['parent','spouse'].includes(edge.type) || !this.byId.has(edge.source) || !this.byId.has(edge.target)) continue;
        const verse = BiblePaths.isVerse(edge);
        this.byPerson.get(edge.source).push({toId:edge.target,edge,verse,direction:edge.type === 'parent' ? 'parent-to-child' : 'spouse'});
        this.byPerson.get(edge.target).push({toId:edge.source,edge,verse,direction:edge.type === 'parent' ? 'child-to-parent' : 'spouse'});
      }
      // Stable ordering resolves otherwise equal paths without changing source objects.
      for (const links of this.byPerson.values()) links.sort((a,b) => Number(b.verse)-Number(a.verse) || a.toId.localeCompare(b.toId) || a.direction.localeCompare(b.direction));
    }

    static isVerse(edge) {
      // An explicit index marker wins over contradictory or missing metadata.
      return edge.provenance !== 'indexed' && edge.evidence?.kind !== 'index' && (edge.provenance === 'verse' || edge.evidence?.kind === 'verse');
    }

    find(fromId,toId,{scriptureOnly=false,spouses=true}={}) {
      if (!this.byId.has(fromId) || !this.byId.has(toId)) return this.result('invalid','family',[],[]);
      if (fromId === toId) return this.result('same','same',[fromId],[]);
      // Preserve a genealogy when one exists, even if a marriage creates a shortcut.
      for (const [kind,direction] of [['ancestry','parent-to-child'],['reverse-ancestry','child-to-parent'],['family',null]]) {
        const steps = this.search(fromId,toId,{direction,scriptureOnly,spouses});
        if (steps) return this.result('found',kind,[fromId,...steps.map(step => step.toId)],steps);
      }
      return this.result('unconnected','family',[],[]);
    }

    search(fromId,toId,{direction,scriptureOnly,spouses}) {
      const reached = new Map([[fromId,{distance:0,indexed:0,step:null}]]), queue = [fromId];
      for (let i=0;i<queue.length;i++) {
        const id = queue[i], current = reached.get(id);
        // BFS has now visited every predecessor at the preceding distance, so the
        // fewest-indexed choice among all equal-length routes is final.
        if (id === toId) {
          const steps = [];
          for (let cursor=toId;cursor!==fromId;) {
            const step = reached.get(cursor).step;
            steps.push(step);cursor = step.fromId;
          }
          return steps.reverse();
        }
        for (const link of this.byPerson.get(id)) {
          if ((direction && link.direction !== direction) || (!spouses && link.direction === 'spouse') || (scriptureOnly && !link.verse)) continue;
          const distance = current.distance+1, indexed = current.indexed+Number(!link.verse), previous = reached.get(link.toId);
          if (previous && (previous.distance < distance || (previous.distance === distance && previous.indexed <= indexed))) continue;
          if (!previous) queue.push(link.toId);
          reached.set(link.toId,{distance,indexed,step:{fromId:id,toId:link.toId,edge:link.edge,direction:link.direction}});
        }
      }
      return null;
    }

    result(status,kind,personIds,steps) {
      const relationships = steps.map(step => step.edge);
      const verseCount = relationships.filter(BiblePaths.isVerse).length;
      return {status,personIds,people:personIds.map(id => this.byId.get(id)),relationships,steps,kind,indexedCount:relationships.length-verseCount,verseCount};
    }
  }

  window.BiblePaths = BiblePaths;
})();
