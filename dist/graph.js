/* BiblePath graph — local, dependency-free SVG rendering. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let nextGraphId = 0;
  const el = (name, attributes = {}) => {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (value) => [...String(value)].reduce((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, 7);
  const segmentDistance = (point, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
  };
  class MinHeap {
    constructor() { this.items = []; }
    push(item) {
      const a = this.items; a.push(item); let i = a.length - 1;
      while (i > 0) { const parent = (i - 1) >> 1; if (a[parent].f <= item.f) break; a[i] = a[parent]; i = parent; }
      a[i] = item;
    }
    pop() {
      const a = this.items, result = a[0], last = a.pop();
      if (!a.length) return result;
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let child = i * 2 + 1;
        if (child + 1 < a.length && a[child + 1].f < a[child].f) child++;
        if (a[child].f >= last.f) break;
        a[i] = a[child]; i = child;
      }
      a[i] = last; return result;
    }
  }

  class BibleGraph {
    constructor(container, callbacks = {}) {
      if (!container) throw new Error('A graph container is required.');
      this.container = container;
      this.callbacks = callbacks;
      this.people = [];
      this.relationships = [];
      this.positions = new Map();
      this.nodes = new Map();
      this.layout = 'constellation';
      this.focusId = null;
      this.selectedId = null;
      this.radius = 31;
      this.minimumSpacing = 126;
      this.positionCache = new Map();
      this.routeCache = new Map();
      this.routes = [];
      this.transform = {x: 0, y: 0, k: 1};
      this.pointerPositions = new Map();
      this.cleanups = [];
      this.id = `bible-graph-${++nextGraphId}`;
      this.svg = el('svg', {class: 'bible-graph', role: 'group', 'aria-label': 'Interactive biblical family map. Drag to pan, scroll or pinch to zoom. Use arrow keys to pan and plus or minus to zoom.', tabindex: '0', width: '100%', height: '100%'});
      Object.assign(this.svg.style, {display: 'block', width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', cursor: 'grab', overflow: 'hidden'});
      this.svg.innerHTML = `<defs><marker id="${this.id}-arrow" markerWidth="7" markerHeight="7" refX="6.2" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L6 3.5 L1 6" fill="none" stroke="#99aa8c" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
      this.viewport = el('g', {class: 'graph-viewport'});
      this.guides = el('g', {class: 'graph-guides', 'aria-hidden': 'true'});
      this.edgeLayer = el('g', {class: 'graph-edges', 'aria-hidden': 'true'});
      this.nodeLayer = el('g', {class: 'graph-nodes'});
      this.labelLayer = el('g', {class: 'graph-relationship-labels', 'aria-hidden': 'true', 'pointer-events': 'none'});
      this.viewport.append(this.guides, this.edgeLayer, this.labelLayer, this.nodeLayer);
      this.svg.append(this.viewport);
      container.append(this.svg);
      this.measure();
      this.bindEvents();
      this.resizeObserver = new ResizeObserver(() => {
        const oldWidth = this.width, oldHeight = this.height;
        const wasVisible = this.isMeasurable;
        const wasFitted = this.fittedScale != null && Math.abs(this.transform.k - this.fittedScale) < 0.00001;
        this.measure();
        if (this.isMeasurable) {
          if (!wasVisible || wasFitted || !oldWidth || !oldHeight) this.fit('resize');
          else {
            this.transform.x += (this.width - oldWidth) / 2;
            this.transform.y += (this.height - oldHeight) / 2;
            this.applyTransform({reason:'resize'});
          }
        }
      });
      this.resizeObserver.observe(container);
    }

    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      this.cleanups.push(() => target.removeEventListener(type, handler, options));
    }

    measure() {
      const bounds = this.container.getBoundingClientRect();
      this.isMeasurable = bounds.width > 1 && bounds.height > 1;
      this.width = Math.max(1, bounds.width);
      this.height = Math.max(1, bounds.height);
      if (this.isMeasurable) { this.lastVisibleWidth = this.width; this.lastVisibleHeight = this.height; }
      this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    }

    localPoint(event) {
      const bounds = this.svg.getBoundingClientRect();
      return {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    }

    bindEvents() {
      this.listen(this.svg, 'wheel', event => {
        event.preventDefault();
        this.callbacks.onLeave?.();
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.height : 1);
        this.zoomAt(Math.exp(-clamp(delta, -500, 500) * 0.0015), this.localPoint(event), 'wheel');
      }, {passive: false});
      this.listen(this.svg, 'pointerdown', event => {
        if (event.button && event.button !== 0) return;
        this.pointerPositions.set(event.pointerId, this.localPoint(event));
        this.pressedNodeId = this.pointerPositions.size === 1 ? event.target.closest('[data-person-id]')?.dataset.personId : null;
        this.dragOrigin = this.localPoint(event);
        this.dragged = false;
        this.pinch = this.pinchState();
        this.svg.style.cursor = 'grabbing';
        this.svg.setPointerCapture(event.pointerId);
      });
      this.listen(this.svg, 'pointermove', event => {
        if (!this.pointerPositions.has(event.pointerId)) return;
        const previous = this.pointerPositions.get(event.pointerId);
        const current = this.localPoint(event);
        this.pointerPositions.set(event.pointerId, current);
        if (Math.hypot(current.x - this.dragOrigin.x, current.y - this.dragOrigin.y) > 4) this.dragged = true;
        if (this.pointerPositions.size >= 2) {
          const next = this.pinchState();
          if (this.pinch && next && this.pinch.distance > 0) {
            this.zoomAt(next.distance / this.pinch.distance, this.pinch.center, 'pinch');
            this.transform.x += next.center.x - this.pinch.center.x;
            this.transform.y += next.center.y - this.pinch.center.y;
          }
          this.pinch = next;
          this.dragged = true;
        } else {
          this.transform.x += current.x - previous.x;
          this.transform.y += current.y - previous.y;
        }
        if (this.dragged) this.callbacks.onLeave?.();
        this.applyTransform();
      });
      const release = event => {
        const selectedId = event.type === 'pointerup' && !this.dragged && this.pointerPositions.size === 1 ? this.pressedNodeId : null;
        this.pointerPositions.delete(event.pointerId);
        this.pinch = this.pinchState();
        if (!this.pointerPositions.size) this.svg.style.cursor = 'grab';
        if (this.svg.hasPointerCapture(event.pointerId)) this.svg.releasePointerCapture(event.pointerId);
        if (selectedId) this.select(selectedId);
      };
      this.listen(this.svg, 'pointerup', release);
      this.listen(this.svg, 'pointercancel', release);
      this.listen(this.svg, 'keydown', event => {
        const node = event.target.closest('[data-person-id]');
        if (node && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); this.select(node.dataset.personId); return;
        }
        if (event.key === '+' || event.key === '=') { event.preventDefault(); this.zoomBy(1.25, 'keyboard'); }
        else if (event.key === '-') { event.preventDefault(); this.zoomBy(0.8, 'keyboard'); }
        else if (event.key === '0' || event.key === 'Home') { event.preventDefault(); this.fit(); }
        else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          this.transform.x += event.key === 'ArrowLeft' ? 55 : event.key === 'ArrowRight' ? -55 : 0;
          this.transform.y += event.key === 'ArrowUp' ? 55 : event.key === 'ArrowDown' ? -55 : 0;
          this.applyTransform();
        }
      });
    }

    pinchState() {
      const points = [...this.pointerPositions.values()];
      if (points.length < 2) return null;
      return {distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), center: {x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2}};
    }

    setData(people, relationships, options = {}) {
      this.measure();
      const oldPositions = this.positions, oldLayout = this.layout;
      const oldTransform = {...this.transform};
      const preserve = options.preserveView && oldLayout === (options.layout || oldLayout) && oldPositions.size > 0;
      this.preserveLayout = preserve;
      if (!preserve) {this.positionCache.clear();this.routeCache.clear();}
      this.people = people.slice();
      this.peopleById = new Map(people.map(person => [person.id, person]));
      const ids = new Set(people.map(person => person.id));
      const seenEdges = new Set();
      this.relationships = relationships.filter(relation => {
        if (!ids.has(relation.source) || !ids.has(relation.target) || relation.source === relation.target) return false;
        const key = `${relation.type}:${relation.source}:${relation.target}`;
        if (seenEdges.has(key)) return false; seenEdges.add(key); return true;
      });
      this.layout = ['constellation', 'lineage', 'radial'].includes(options.layout) ? options.layout : this.layout;
      this.focusId = ids.has(options.focusId) ? options.focusId : ids.has(this.focusId) ? this.focusId : people[0]?.id;
      this.selectedId = ids.has(options.selectedId) ? options.selectedId : preserve && ids.has(this.selectedId) ? this.selectedId : this.focusId;
      this.adjacency = new Map(people.map(person => [person.id, []]));
      this.relationships.forEach(relation => {
        this.adjacency.get(relation.source).push(relation.target);
        this.adjacency.get(relation.target).push(relation.source);
      });
      const base = this.lineagePositions();
      this.positions = this.layout === 'radial' ? this.radialPositions(base) : this.layout === 'constellation' ? this.constellationPositions(base) : base;
      if (preserve) {
        const anchorId = ids.has(options.anchorId) ? options.anchorId : this.focusId;
        const priorAnchor = oldPositions.get(anchorId) || this.positionCache.get(anchorId);
        const nextAnchor = this.positions.get(anchorId);
        const dx = priorAnchor && nextAnchor ? priorAnchor.x - nextAnchor.x : 0;
        const dy = priorAnchor && nextAnchor ? priorAnchor.y - nextAnchor.y : 0;
        const retained = [], additions = [];
        this.people.forEach(person => {
          const prior = oldPositions.get(person.id) || this.positionCache.get(person.id);
          const point = this.positions.get(person.id);
          if (prior) retained.push({id:person.id, ...prior});
          else additions.push({id:person.id, ...point, x:point.x + dx, y:point.y + dy});
        });
        this.placeAdditions(additions, retained);
        this.positions = new Map([...retained,...additions].map(({id,...point})=>[id,point]));
      }
      this.positions.forEach((point,id)=>this.positionCache.set(id,{...point}));
      this.buildObstacleIndex();
      this.draw();
      if (preserve) {this.transform = oldTransform;this.fittedScale = null;this.applyTransform({reason:'data'});}
      else this.fit('data');
    }

    placeAdditions(additions, retained) {
      const placed = retained.slice();
      for (const node of additions) {
        const free = (x,y) => placed.every(other=>Math.hypot(x-other.x,y-other.y)>=this.minimumSpacing-0.01);
        if (!free(node.x,node.y)) {
          const origin = {x:node.x,y:node.y};
          const phase = hash(node.id) / 0xffffffff * Math.PI * 2;
          let found = false;
          for (let ring=1;ring<80 && !found;ring++) {
            const radius=ring*32, steps=Math.max(12,Math.ceil(Math.PI*radius/24));
            for (let step=0;step<steps;step++) {
              const angle=phase+step/steps*Math.PI*2;
              const x=origin.x+Math.cos(angle)*radius,y=origin.y+Math.sin(angle)*radius;
              if(free(x,y)){node.x=x;node.y=y;found=true;break;}
            }
          }
        }
        placed.push(node);
      }
    }

    lineagePositions() {
      // Spouses share one generation; longest parental path sets the rows.
      const union = new Map(this.people.map(person => [person.id, person.id]));
      const find = id => { while (union.get(id) !== id) id = union.get(id); return id; };
      this.relationships.filter(relation => relation.type === 'spouse').forEach(relation => union.set(find(relation.target), find(relation.source)));
      const groups = [...new Set(this.people.map(person => find(person.id)))];
      const ranks = new Map(groups.map(group => [group, 0]));
      const parentEdges = this.relationships.filter(relation => relation.type === 'parent' && find(relation.source) !== find(relation.target));
      for (let pass = 0; pass < groups.length; pass++) {
        let changed = false;
        parentEdges.forEach(relation => {
          const source = find(relation.source), target = find(relation.target);
          const rank = Math.min(groups.length, ranks.get(source) + 1);
          if (ranks.get(target) < rank) { ranks.set(target, rank); changed = true; }
        });
        if (!changed) break;
      }
      const rows = new Map();
      this.people.forEach(person => {
        const rank = ranks.get(find(person.id));
        if (!rows.has(rank)) rows.set(rank, []);
        rows.get(rank).push(person);
      });
      const orderedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);
      const result = new Map();
      orderedRows.forEach(([rank, row]) => {
        row.sort((a, b) => find(a.id).localeCompare(find(b.id)) || a.id.localeCompare(b.id));
        row.forEach((person, index) => result.set(person.id, {x: (index - (row.length - 1) / 2) * 150, y: rank * 186, rank}));
      });
      // Repeated barycentric ordering keeps children under their own family.
      for (let pass = 0; pass < 5; pass++) {
        const sequence = pass % 2 ? [...orderedRows].reverse() : orderedRows;
        sequence.forEach(([rank, row]) => {
          const score = person => {
            const neighbors = this.adjacency.get(person.id).filter(id => result.get(id).rank !== rank);
            return neighbors.length ? neighbors.reduce((sum, id) => sum + result.get(id).x, 0) / neighbors.length : result.get(person.id).x;
          };
          row.sort((a, b) => score(a) - score(b));
          row.forEach((person, index) => result.set(person.id, {x: (index - (row.length - 1) / 2) * 150, y: rank * 186, rank}));
        });
      }
      return result;
    }

    constellationPositions(base) {
      if (!this.people.length) return base;
      // Family generations travel left to right, making good use of a wide map.
      const horizontal = new Map([...base].map(([id, point]) => [id, {x: point.y, y: point.x, rank: point.rank}]));
      const nodes = this.people.map(person => ({id: person.id, ...horizontal.get(person.id), vx: 0, vy: 0}));
      const nodeById = new Map(nodes.map(node => [node.id, node]));
      nodes.forEach(node => { node.y += ((hash(node.id) % 100) - 50) * 0.4; });
      const meanX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
      for (let iteration = 0; iteration < 150; iteration++) {
        const cooling = 1 - iteration / 185;
        nodes.forEach(node => { node.vx *= 0.55; node.vy *= 0.55; });
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            if (!dx && !dy) dx = 0.1;
            const distanceSquared = Math.max(100, dx * dx + dy * dy);
            const distance = Math.sqrt(distanceSquared);
            let force = 1700 / distanceSquared;
            if (distance < 150) force += (150 - distance) * 0.085;
            a.vx += dx / distance * force; a.vy += dy / distance * force;
            b.vx -= dx / distance * force; b.vy -= dy / distance * force;
          }
        }
        this.relationships.forEach(relation => {
          const a = nodeById.get(relation.source), b = nodeById.get(relation.target);
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const target = relation.type === 'spouse' ? 160 : 195;
          const force = (distance - target) * 0.025;
          a.vx += dx / distance * force; a.vy += dy / distance * force;
          b.vx -= dx / distance * force; b.vy -= dy / distance * force;
        });
        nodes.forEach(node => {
          node.vy -= node.y * 0.0025;
          node.vx += (horizontal.get(node.id).x - node.x) * 0.012;
          node.vx -= (node.x - meanX) * 0.0008;
          node.x += clamp(node.vx, -10, 10) * cooling;
          node.y += clamp(node.vy, -10, 10) * cooling;
        });
      }
      // Compact the initial scene without making the circles themselves smaller.
      // The final collision pass enforces space after this aspect adjustment.
      const xs = nodes.map(node => node.x), ys = nodes.map(node => node.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const aspectWidth = this.isMeasurable ? this.width : this.lastVisibleWidth || 680;
      const aspectHeight = this.isMeasurable ? this.height : this.lastVisibleHeight || 420;
      const aspect = clamp(aspectWidth / Math.max(1, aspectHeight), 1.35, 2.1);
      const targetHeight = Math.max(150, Math.sqrt(nodes.length) * 116);
      const targetWidth = targetHeight * aspect;
      const xScale = Math.min(1.6, targetWidth / Math.max(1, maxX - minX));
      const yScale = Math.min(1.4, targetHeight / Math.max(1, maxY - minY));
      nodes.forEach(node => {
        node.x = (node.x - (minX + maxX) / 2) * xScale;
        node.y = (node.y - (minY + maxY) / 2) * yScale;
      });
      this.resolveCollisions(nodes, this.minimumSpacing);
      return new Map(nodes.map(node => [node.id, {x: node.x, y: node.y, rank: node.rank}]));
    }

    resolveCollisions(nodes, minimumDistance) {
      for (let iteration = 0; iteration < 300; iteration++) {
        let largestOverlap = 0;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
            if (distance >= minimumDistance) continue;
            if (distance < 0.001) {
              const angle = hash(`${a.id}:${b.id}`) % 628 / 100;
              dx = Math.cos(angle); dy = Math.sin(angle); distance = 1;
            }
            const overlap = minimumDistance - distance;
            largestOverlap = Math.max(largestOverlap, overlap);
            const shift = (overlap + 0.08) / 2;
            a.x -= dx / distance * shift; a.y -= dy / distance * shift;
            b.x += dx / distance * shift; b.y += dy / distance * shift;
          }
        }
        if (largestOverlap < 0.05) break;
      }
    }

    radialPositions(base) {
      const distances = new Map();
      if (this.focusId) distances.set(this.focusId, 0);
      const queue = this.focusId ? [this.focusId] : [];
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        this.adjacency.get(id).forEach(neighbor => {
          if (!distances.has(neighbor)) { distances.set(neighbor, distances.get(id) + 1); queue.push(neighbor); }
        });
      }
      const disconnected = this.people.filter(person => !distances.has(person.id));
      const rings = new Map();
      this.people.forEach(person => {
        if (!distances.has(person.id)) return;
        const distance = distances.get(person.id);
        if (!rings.has(distance)) rings.set(distance, []);
        rings.get(distance).push(person);
      });
      const result = new Map();
      let previousRadius = 0;
      this.ringRadii = [];
      this.disconnectedIsland = null;
      [...rings.entries()].sort((a, b) => a[0] - b[0]).forEach(([level, people]) => {
        if (level === 0) { result.set(people[0].id, {x: 0, y: 0, rank: 0}); return; }
        const radius = Math.max(previousRadius + 190, people.length * 146 / (2 * Math.PI));
        previousRadius = radius;
        this.ringRadii.push(radius);
        const angle = person => {
          const parents = this.adjacency.get(person.id).filter(id => result.has(id));
          if (parents.length) {
            const x = parents.reduce((sum, id) => sum + result.get(id).x, 0);
            const y = parents.reduce((sum, id) => sum + result.get(id).y, 0);
            if (x || y) return Math.atan2(y, x);
          }
          return Math.atan2(base.get(person.id).y - (base.get(this.focusId)?.y || 0), base.get(person.id).x || 0.01);
        };
        people.sort((a, b) => angle(a) - angle(b));
        people.forEach((person, index) => {
          const theta = (index / people.length) * Math.PI * 2 - Math.PI / 2 + (level % 2 ? 0 : 0.12);
          result.set(person.id, {x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, rank: level});
        });
      });
      if (disconnected.length) {
        const columns = Math.max(2, Math.ceil(Math.sqrt(disconnected.length)));
        const rows = Math.ceil(disconnected.length / columns);
        const startX = previousRadius + 250;
        const startY = -(rows - 1) * 75;
        disconnected.forEach((person, index) => result.set(person.id, {
          x: startX + index % columns * 150,
          y: startY + Math.floor(index / columns) * 150,
          rank: null,
          disconnected: true
        }));
        this.disconnectedIsland = {x: startX - 54, y: startY - 95, width: Math.max(300, columns * 150), height: rows * 150 + 105};
      }
      return result;
    }

    buildObstacleIndex() {
      this.obstacles = [...this.positions].map(([id,point])=>({id,...point}));
      this.obstacleCells = new Map();
      this.obstacleCellSize = 128;
      this.obstacles.forEach(point=>{
        const key=`${Math.floor(point.x/128)},${Math.floor(point.y/128)}`;
        if(!this.obstacleCells.has(key))this.obstacleCells.set(key,[]);
        this.obstacleCells.get(key).push(point);
      });
    }

    obstaclesNearSegment(a,b,padding) {
      const minX=Math.floor((Math.min(a.x,b.x)-padding)/128),maxX=Math.floor((Math.max(a.x,b.x)+padding)/128);
      const minY=Math.floor((Math.min(a.y,b.y)-padding)/128),maxY=Math.floor((Math.max(a.y,b.y)+padding)/128);
      if((maxX-minX+1)*(maxY-minY+1)>this.obstacles.length*2)return this.obstacles;
      const result=[];
      for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)result.push(...(this.obstacleCells.get(`${x},${y}`)||[]));
      return result;
    }

    clearSegment(a,b,ignore,clearance=this.radius+13) {
      return this.obstaclesNearSegment(a,b,clearance).every(point=>ignore.has(point.id)||segmentDistance(point,a,b)>=clearance-0.001);
    }

    gridRoute(a,b,ignore,margin=200,limit=30000) {
      const step=20;
      const sx=Math.round(a.x/step),sy=Math.round(a.y/step),tx=Math.round(b.x/step),ty=Math.round(b.y/step);
      const minX=Math.min(sx,tx)-Math.ceil(margin/step),maxX=Math.max(sx,tx)+Math.ceil(margin/step);
      const minY=Math.min(sy,ty)-Math.ceil(margin/step),maxY=Math.max(sy,ty)+Math.ceil(margin/step);
      const width=maxX-minX+1;
      const key=(x,y)=>(y-minY)*width+x-minX;
      // A small heuristic weight keeps long, sparsely occupied radial routes fast.
      // Exact shortest paths are not required; obstacle clearance is always checked.
      const heuristic=(x,y)=>{const dx=Math.abs(tx-x),dy=Math.abs(ty-y);return(Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy))*1.06;};
      const frontier=new MinHeap(),cost=new Map(),previous=new Map(),closed=new Set(),free=new Map();
      const startKey=key(sx,sy),targetKey=key(tx,ty);
      frontier.push({x:sx,y:sy,f:heuristic(sx,sy),g:0,d:-1});cost.set(startKey,0);
      const steps=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      let visited=0;
      while(frontier.items.length && visited++<limit){
        const current=frontier.pop(),currentKey=key(current.x,current.y);
        if(closed.has(currentKey))continue;
        if(currentKey===targetKey){
          const points=[{x:tx*step,y:ty*step}];let cursor=currentKey;
          while(cursor!==startKey){const prior=previous.get(cursor);if(!prior)return null;points.push({x:prior.x*step,y:prior.y*step});cursor=prior.key;}
          points.reverse();return[a,...points,b];
        }
        closed.add(currentKey);
        for(let direction=0;direction<steps.length;direction++){
          const[dx,dy]=steps[direction],x=current.x+dx,y=current.y+dy;
          if(x<minX||x>maxX||y<minY||y>maxY)continue;
          const nextKey=key(x,y);if(closed.has(nextKey))continue;
          const point={x:x*step,y:y*step};
          if(!free.has(nextKey))free.set(nextKey,this.clearSegment(point,point,ignore));
          if(!free.get(nextKey)||!this.clearSegment({x:current.x*step,y:current.y*step},point,ignore))continue;
          const nextCost=current.g+(dx&&dy?Math.SQRT2:1)+(current.d>=0&&current.d!==direction?0.08:0);
          if(nextCost>=(cost.get(nextKey)??Infinity))continue;
          cost.set(nextKey,nextCost);previous.set(nextKey,{key:currentKey,x:current.x,y:current.y});
          frontier.push({x,y,g:nextCost,f:nextCost+heuristic(x,y),d:direction});
        }
      }
      return null;
    }

    simplifyRoute(points,ignore) {
      const result=[points[0]];let i=0;
      while(i<points.length-1){
        let next=points.length-1;
        while(next>i+1&&!this.clearSegment(points[i],points[next],ignore))next--;
        result.push(points[next]);i=next;
      }
      return result.filter((point,index)=>!index||Math.hypot(point.x-result[index-1].x,point.y-result[index-1].y)>0.01);
    }

    trimRoute(points,distance) {
      const trimmed=points.map(point=>({...point}));
      const trimStart=()=>{
        const center={...trimmed[0]};
        for(let i=1;i<trimmed.length;i++){
          const b=trimmed[i];
          if(Math.hypot(b.x-center.x,b.y-center.y)<distance)continue;
          const a=trimmed[i-1],dx=b.x-a.x,dy=b.y-a.y,ox=a.x-center.x,oy=a.y-center.y;
          const aa=dx*dx+dy*dy,bb=2*(ox*dx+oy*dy),cc=ox*ox+oy*oy-distance*distance;
          const t=clamp((-bb+Math.sqrt(Math.max(0,bb*bb-4*aa*cc)))/(2*aa||1),0,1);
          trimmed.splice(0,i,{x:a.x+dx*t,y:a.y+dy*t});break;
        }
      };
      trimStart();trimmed.reverse();trimStart();trimmed.reverse();return trimmed;
    }

    routeRelationship(relation) {
      const a=this.positions.get(relation.source),b=this.positions.get(relation.target);
      const ignore=new Set([relation.source,relation.target]);
      const cacheKey=`${relation.type}:${relation.source}:${relation.target}`,cached=this.routeCache.get(cacheKey);
      if(cached&&cached.a.x===a.x&&cached.a.y===a.y&&cached.b.x===b.x&&cached.b.y===b.y&&cached.points.slice(1).every((point,index)=>this.clearSegment(cached.points[index],point,ignore))){return{...relation,points:cached.points.map(point=>({...point})),failed:false};}
      let points=[a,b];
      if(!this.clearSegment(a,b,ignore)){
        const routed=this.gridRoute(a,b,ignore)||this.gridRoute(a,b,ignore,600,90000);
        if(!routed)return{...relation,points:[],failed:true};
        points=this.simplifyRoute(routed,ignore);
      }
      points=this.trimRoute(points,this.radius+8);
      this.routeCache.set(cacheKey,{a:{...a},b:{...b},points:points.map(point=>({...point}))});
      return{...relation,points,failed:false};
    }

    routeMidpoint(points) {
      const lengths=points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.y-points[index].y));
      let halfway=lengths.reduce((a,b)=>a+b,0)/2;
      for(let i=0;i<lengths.length;i++){
        if(halfway<=lengths[i]){const t=halfway/lengths[i];return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}
        halfway-=lengths[i];
      }
      return points[0];
    }

    relationshipLabel(relation) {
      if(relation.type==='spouse')return'Spouse';
      if(/legal parent|legal father|adopt/i.test(relation.note||''))return'Legal parent';
      const gender=this.peopleById.get(relation.source)?.gender;
      return gender==='female'?'Mother':gender==='male'?'Father':'Parent';
    }

    draw() {
      this.guides.replaceChildren(); this.edgeLayer.replaceChildren(); this.nodeLayer.replaceChildren(); this.labelLayer.replaceChildren(); this.nodes.clear();
      if (this.layout === 'radial') (this.ringRadii || []).forEach(radius => this.guides.append(el('circle', {cx: 0, cy: 0, r: radius, fill: 'none', stroke: '#d8ddd1', 'stroke-width': 1, 'stroke-dasharray': '3 9', opacity: '.7'})));
      if (this.layout === 'radial' && this.disconnectedIsland) {
        const island = this.disconnectedIsland;
        this.guides.append(el('rect', {x: island.x, y: island.y, width: island.width, height: island.height, rx: 20, fill: '#f5f5ed', 'fill-opacity': '.7', stroke: '#d7ddcf', 'stroke-dasharray': '5 7'}));
        const title = el('text', {x: island.x + 20, y: island.y + 29, fill: '#627454', 'font-family': 'inherit', 'font-size': 11, 'font-weight': 600});
        title.textContent = 'OTHER FAMILY GROUPS';
        const note = el('text', {x: island.x + 20, y: island.y + 47, fill: '#87927e', 'font-family': 'inherit', 'font-size': 9});
        note.textContent = 'No mapped path to the center person';
        this.guides.append(title, note);
      }
      this.routes=this.relationships.map(relation=>this.routeRelationship(relation));
      this.routes.forEach(relation => {
        if(relation.failed||relation.points.length<2)return;
        const path=relation.points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
        const element = el('path', {d:path, class: `graph-edge ${relation.type}`, fill: 'none', stroke: '#ccd5c5', 'stroke-width': 1.2, 'stroke-linecap':'round','stroke-linejoin':'round', 'data-source': relation.source, 'data-target': relation.target});
        const title=el('title');
        title.textContent=`${this.peopleById.get(relation.source).name} ${relation.type==='spouse'?'—':'→'} ${this.peopleById.get(relation.target).name}: ${relation.ref?.label||''}${relation.note?' — '+relation.note:''}`;
        element.append(title);
        if (relation.type === 'spouse') element.setAttribute('stroke-dasharray', '4 5');
        else element.setAttribute('marker-end', `url(#${this.id}-arrow)`);
        this.edgeLayer.append(element);
        const midpoint=this.routeMidpoint(relation.points),labelText=this.relationshipLabel(relation);
        const group=el('g',{class:'graph-relationship-label',transform:`translate(${midpoint.x} ${midpoint.y})`,'data-source':relation.source,'data-target':relation.target,visibility:'hidden'});
        const width=labelText.length*5.6+14;
        const background=el('rect',{x:-width/2,y:-9,width,height:18,rx:5,fill:'#fafcf5',stroke:'#e2e9d9','stroke-width':0.7});
        const label=el('text',{'text-anchor':'middle',y:3.5,fill:'#627651',stroke:'none','font-size':9,'font-family':'inherit'});label.textContent=labelText;
        group.append(background,label);this.labelLayer.append(group);
      });
      this.people.forEach(person => {
        const point = this.positions.get(person.id);
        const group = el('g', {transform: `translate(${point.x} ${point.y})`, class: `graph-node ${person.gender || ''} ${person.testament?.toLowerCase() || ''}`, 'data-person-id': person.id, role: 'button', tabindex: '0', 'aria-label': `${person.name}. ${person.description || ''} Select to view family and Bible references.`});
        group.style.cursor = 'pointer';
        const outer = el('circle', {class: 'node-halo', r: this.radius + 7, fill: 'none', stroke: '#88987c', 'stroke-width': 1, opacity: 0});
        const circle = el('circle', {class: 'node-circle', r: this.radius, fill: person.gender === 'female' ? '#edd8c8' : '#dce5d0', stroke: person.gender === 'female' ? '#cda88d' : '#b2c39e', 'stroke-width': 1.3});
        const label = el('text', {class: 'node-label', 'text-anchor': 'middle', fill: '#31422c', 'font-family': 'inherit', 'font-size': '10.5', 'font-weight': '550', 'pointer-events': 'none'});
        const words = person.name.split(/\s+/), lines = [];
        let line = '';
        words.forEach(word => {
          if ((line + ' ' + word).trim().length > 11 && line) { lines.push(line); line = word; }
          else line = (line + ' ' + word).trim();
        });
        if (line) lines.push(line);
        const fontSize = Math.min(10.5, Math.max(7.5, 57 / Math.max(...lines.map(item => item.length)) * 1.8));
        label.setAttribute('font-size', fontSize);
        label.style.fontSize=`${fontSize}px`;
        lines.forEach((text, index) => {
          const span = el('tspan', {x: 0, y: (index - (lines.length - 1) / 2) * 12 + 3.5});
          span.textContent = text; label.append(span);
        });
        group.append(outer, circle, label);
        group.addEventListener('pointerenter', event => {
          if (this.pointerPositions.size) return;
          this.highlight(person.id);
          this.callbacks.onHover?.(person, {x: event.clientX, y: event.clientY});
        });
        group.addEventListener('pointerleave', () => { this.highlight(null); this.callbacks.onLeave?.(); });
        group.addEventListener('focus', () => {
          this.highlight(person.id);
          const bounds = group.getBoundingClientRect();
          this.callbacks.onHover?.(person, {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height});
        });
        group.addEventListener('blur', () => { this.highlight(null); this.callbacks.onLeave?.(); });
        this.nodes.set(person.id, group);
        this.nodeLayer.append(group);
      });
      this.highlight(null);
    }

    highlight(hoverId) {
      this.hoverId=hoverId;
      this.nodes.forEach((group, id) => {
        const selected = id === this.selectedId;
        group.classList.toggle('is-selected', selected);
        group.classList.toggle('is-hovered', id === hoverId);
        group.querySelector('.node-halo').setAttribute('opacity', selected || id === hoverId ? '0.7' : '0');
        const person = this.peopleById.get(id);
        group.querySelector('.node-circle').setAttribute('fill', selected ? '#536d43' : person.gender === 'female' ? '#edd8c8' : '#dce5d0');
        group.querySelector('.node-circle').setAttribute('stroke', selected ? '#455b38' : person.gender === 'female' ? '#cda88d' : '#b2c39e');
        group.querySelector('.node-label').setAttribute('fill', selected ? '#fffdf5' : '#31422c');
        group.setAttribute('aria-pressed', String(selected));
      });
      [...this.edgeLayer.children].forEach(edge => {
        const activeId=hoverId||this.selectedId;
        const connected = activeId && (edge.dataset.source === activeId || edge.dataset.target === activeId);
        edge.classList.toggle('is-highlighted', !!connected);
        edge.setAttribute('stroke', connected ? '#8c9f7b' : '#cbd6c2');
        edge.setAttribute('stroke-width', connected ? '1.7' : '1.05');
        edge.style.opacity=connected?'1':'0.55';
      });
      this.updateRelationshipLabels();
    }

    updateRelationshipLabels() {
      const activeId=this.hoverId||this.selectedId,rectangles=[];
      [...this.labelLayer.children].forEach(label=>{
        const connected=activeId&&(label.dataset.source===activeId||label.dataset.target===activeId);
        let visible=this.transform.k>=1.1&&connected&&rectangles.length<12;
        if(visible){
          const route=this.routes.find(item=>item.source===label.dataset.source&&item.target===label.dataset.target);
          const point=this.routeMidpoint(route.points),width=this.relationshipLabel(route).length*5.6+14;
          const box={x:point.x-width/2-3,y:point.y-12,width:width+6,height:24};
          visible=!rectangles.some(other=>box.x<other.x+other.width&&box.x+box.width>other.x&&box.y<other.y+other.height&&box.y+box.height>other.y);
          if(visible)visible=this.obstacles.every(obstacle=>Math.hypot(obstacle.x-clamp(obstacle.x,box.x,box.x+box.width),obstacle.y-clamp(obstacle.y,box.y,box.y+box.height))>=this.radius+4);
          if(visible)rectangles.push(box);
        }
        label.setAttribute('visibility',visible?'visible':'hidden');
      });
    }

    select(id) {
      const person = this.people.find(item => item.id === id);
      if (!person) return;
      this.selectedId = id;
      this.highlight(null);
      this.callbacks.onLeave?.();
      this.callbacks.onSelect?.(person);
    }

    zoomAt(factor, point, reason='button') {
      const oldScale = this.transform.k;
      const nextScale = clamp(oldScale * factor, 0.01, 5);
      this.transform.x = point.x - (point.x - this.transform.x) * nextScale / oldScale;
      this.transform.y = point.y - (point.y - this.transform.y) * nextScale / oldScale;
      this.transform.k = nextScale;
      this.fittedScale=null;
      const anchor=this.nearestPersonToPoint(point);
      this.applyTransform({userInitiated:true,reason,direction:nextScale>oldScale?'in':nextScale<oldScale?'out':'none',previousScale:oldScale,anchorId:anchor?.id??null,anchorDistance:anchor?.distance??Infinity});
    }

    zoomBy(factor,reason='button') { this.zoomAt(factor, {x: this.width / 2, y: this.height / 2},reason); }

    fit(reason='fit') {
      if (!this.isMeasurable) return;
      if (!this.positions.size) { this.transform = {x: this.width / 2, y: this.height / 2, k: 1}; this.fittedScale = 1; this.applyTransform({reason}); return; }
      const points = [...this.positions.values()];
      const padding = this.radius + 28;
      const island = this.layout === 'radial' ? this.disconnectedIsland : null;
      const ringRadius = this.layout === 'radial' && this.ringRadii?.length ? this.ringRadii[this.ringRadii.length - 1] : null;
      const minX = Math.min(...points.map(point => point.x), island?.x ?? Infinity, ringRadius == null ? Infinity : -ringRadius) - padding;
      const maxX = Math.max(...points.map(point => point.x), island ? island.x + island.width : -Infinity, ringRadius ?? -Infinity) + padding;
      const minY = Math.min(...points.map(point => point.y), island?.y ?? Infinity, ringRadius == null ? Infinity : -ringRadius) - padding;
      const maxY = Math.max(...points.map(point => point.y), island ? island.y + island.height : -Infinity, ringRadius ?? -Infinity) + padding;
      const scale = clamp(Math.min((this.width - 36) / (maxX - minX), (this.height - 70) / (maxY - minY)), 0.01, 1.3);
      this.fittedScale = scale;
      this.transform = {x: this.width / 2 - (minX + maxX) / 2 * scale, y: this.height / 2 - (minY + maxY) / 2 * scale, k: scale};
      this.applyTransform({reason});
    }

    centerOn(id) {
      const point = this.positions.get(id);
      if (!point) return false;
      this.selectedId = id;
      this.transform.x = this.width / 2 - point.x * this.transform.k;
      this.transform.y = this.height / 2 - point.y * this.transform.k;
      this.highlight(null);
      this.fittedScale=null;
      this.applyTransform({reason:'center'});
      return true;
    }

    reset() { this.fit(); }

    applyTransform(metadata={reason:'pan'}) {
      const {x, y, k} = this.transform;
      this.viewport.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
      this.updateRelationshipLabels();
      this.callbacks.onZoom?.(k,{userInitiated:false,...metadata});
    }

    nearestPersonToPoint(point) {
      if(!this.positions.size)return null;
      const x=(point.x-this.transform.x)/this.transform.k,y=(point.y-this.transform.y)/this.transform.k;
      let closest=null,distance=Infinity;
      this.positions.forEach((point,id)=>{const d=Math.hypot(point.x-x,point.y-y);if(d<distance){closest=id;distance=d;}});
      return{id:closest,distance:distance*this.transform.k};
    }

    nearestPersonToCenter() {
      return this.nearestPersonToPoint({x:this.width/2,y:this.height/2})?.id??null;
    }

    getState() {
      return {layout: this.layout, focusId: this.focusId, selectedId:this.selectedId,centerPersonId:this.nearestPersonToCenter(),transform: {...this.transform}, peopleCount: this.people.length, relationshipCount: this.relationships.length, width: this.width, height: this.height,radius:this.radius,minimumSpacing:this.minimumSpacing,positions: Object.fromEntries([...this.positions.entries()].map(([id, point]) => [id, {...point}])),routes:this.routes.map(route=>({source:route.source,target:route.target,type:route.type,failed:route.failed,points:route.points.map(point=>({...point}))}))};
    }

    destroy() { this.resizeObserver.disconnect(); this.cleanups.forEach(cleanup => cleanup()); this.svg.remove(); }
  }
  window.BibleGraph = BibleGraph;
})();
