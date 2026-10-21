/* Indexed graph traversal shared by adaptive zoom and the people explorer. */
(function () {
  'use strict';
  class BibleDiscovery {
    constructor(data) {
      this.people = data.people;
      this.relationships = data.relationships;
      this.byId = new Map(data.people.map(p => [p.id,p]));
      this.byPerson = new Map(data.people.map(p => [p.id,[]]));
      for (const edge of data.relationships) {
        if (!this.byPerson.has(edge.source) || !this.byPerson.has(edge.target)) continue;
        this.byPerson.get(edge.source).push(edge);
        this.byPerson.get(edge.target).push(edge);
      }
      for (const [id,edges] of this.byPerson) edges.sort((a,b) => {
        const other = edge => this.byId.get(edge.source === id ? edge.target : edge.source);
        // Keep the individually sourced starter families ahead of imported extensions.
        const evidence = edge => edge.evidence?.kind === 'index' ? 1 : 0;
        return evidence(a)-evidence(b) || other(a).name.localeCompare(other(b).name) || other(a).id.localeCompare(other(b).id);
      });
    }
    allows(person,testament) {return testament === 'all' || person.testament === testament || person.testaments?.includes(testament);}
    neighborhood({focusId,depth=1,testament='all',spouses=true,limit=180,localRoots=[]}) {
      const origin = this.byId.get(focusId);
      if (!origin || !this.allows(origin,testament)) return {people:[],relationships:[],reachable:0,omitted:0,distances:new Map()};
      const distances = new Map([[focusId,0]]), queue = [focusId];
      for (let i=0;i<queue.length;i++) {
        const id = queue[i], distance = distances.get(id);
        if (distance >= depth) continue;
        for (const edge of this.byPerson.get(id)) {
          if (edge.type === 'spouse' && !spouses) continue;
          const next = edge.source === id ? edge.target : edge.source;
          if (distances.has(next) || !this.allows(this.byId.get(next),testament)) continue;
          distances.set(next,distance+1);queue.push(next);
        }
      }
      // Close zoom can disclose the immediate family of a visible peripheral person.
      // Keep these discoveries when zooming back out, without inventing a path.
      for (const id of localRoots) {
        if (!distances.has(id)) continue;
        for (const edge of this.byPerson.get(id)) {
          if (edge.type === 'spouse' && !spouses) continue;
          const next = edge.source === id ? edge.target : edge.source;
          if (distances.has(next) || !this.allows(this.byId.get(next),testament)) continue;
          distances.set(next,distances.get(id)+1);queue.push(next);
        }
      }
      const selected = queue.slice(0,limit), ids = new Set(selected);
      const selectedPeople = selected.map(id=>this.byId.get(id));
      const selectedEdges = this.relationships.filter(edge=>ids.has(edge.source) && ids.has(edge.target) && (spouses || edge.type !== 'spouse'));
      return {people:selectedPeople,relationships:selectedEdges,reachable:queue.length,omitted:Math.max(0,queue.length-limit),distances};
    }
    static depthForZoom(scale,baseScale) {
      if (!(scale>0) || !(baseScale>0)) return 1;
      return Math.min(8,Math.max(1,1+Math.floor(Math.log(baseScale/scale)/Math.log(1.5)+0.00001)));
    }
  }
  window.BibleDiscovery = BibleDiscovery;
})();
