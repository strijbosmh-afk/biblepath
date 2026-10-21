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
      this.radius = 31;
      this.transform = {x: 0, y: 0, k: 1};
      this.pointerPositions = new Map();
      this.cleanups = [];
      this.id = `bible-graph-${++nextGraphId}`;
      this.svg = el('svg', {class: 'bible-graph', role: 'group', 'aria-label': 'Interactive biblical family map. Drag to pan, scroll or pinch to zoom. Use arrow keys to pan and plus or minus to zoom.', tabindex: '0', width: '100%', height: '100%'});
      Object.assign(this.svg.style, {display: 'block', width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', cursor: 'grab', overflow: 'hidden'});
      this.svg.innerHTML = `<defs><marker id="${this.id}-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#a5ada1" stroke-width=".9"/></marker></defs>`;
      this.viewport = el('g', {class: 'graph-viewport'});
      this.guides = el('g', {class: 'graph-guides', 'aria-hidden': 'true'});
      this.edgeLayer = el('g', {class: 'graph-edges', 'aria-hidden': 'true'});
      this.nodeLayer = el('g', {class: 'graph-nodes'});
      this.viewport.append(this.guides, this.edgeLayer, this.nodeLayer);
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
          if (!wasVisible || wasFitted || !oldWidth || !oldHeight) this.fit();
          else {
            this.transform.x += (this.width - oldWidth) / 2;
            this.transform.y += (this.height - oldHeight) / 2;
            this.applyTransform();
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
        this.zoomAt(Math.exp(-clamp(delta, -500, 500) * 0.0015), this.localPoint(event));
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
            this.zoomAt(next.distance / this.pinch.distance, this.pinch.center);
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
        if (event.key === '+' || event.key === '=') { event.preventDefault(); this.zoomBy(1.25); }
        else if (event.key === '-') { event.preventDefault(); this.zoomBy(0.8); }
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
      this.people = people.slice();
      const ids = new Set(people.map(person => person.id));
      this.relationships = relationships.filter(relation => ids.has(relation.source) && ids.has(relation.target));
      this.layout = ['constellation', 'lineage', 'radial'].includes(options.layout) ? options.layout : this.layout;
      this.focusId = ids.has(options.focusId) ? options.focusId : ids.has(this.focusId) ? this.focusId : people[0]?.id;
      this.adjacency = new Map(people.map(person => [person.id, []]));
      this.relationships.forEach(relation => {
        this.adjacency.get(relation.source).push(relation.target);
        this.adjacency.get(relation.target).push(relation.source);
      });
      const base = this.lineagePositions();
      this.positions = this.layout === 'radial' ? this.radialPositions(base) : this.layout === 'constellation' ? this.constellationPositions(base) : base;
      this.draw();
      this.fit();
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
        row.forEach((person, index) => result.set(person.id, {x: (index - (row.length - 1) / 2) * 107, y: rank * 133, rank}));
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
          row.forEach((person, index) => result.set(person.id, {x: (index - (row.length - 1) / 2) * 107, y: rank * 133, rank}));
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
      for (let iteration = 0; iteration < 230; iteration++) {
        const cooling = 1 - iteration / 260;
        nodes.forEach(node => { node.vx *= 0.55; node.vy *= 0.55; });
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            if (!dx && !dy) dx = 0.1;
            const distanceSquared = Math.max(100, dx * dx + dy * dy);
            const distance = Math.sqrt(distanceSquared);
            let force = 1700 / distanceSquared;
            if (distance < 88) force += (88 - distance) * 0.085;
            a.vx += dx / distance * force; a.vy += dy / distance * force;
            b.vx -= dx / distance * force; b.vy -= dy / distance * force;
          }
        }
        this.relationships.forEach(relation => {
          const a = nodeById.get(relation.source), b = nodeById.get(relation.target);
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const target = relation.type === 'spouse' ? 90 : 115;
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
      const targetHeight = Math.max(90, Math.sqrt(nodes.length) * 65);
      const targetWidth = targetHeight * aspect;
      const xScale = Math.min(1.6, targetWidth / Math.max(1, maxX - minX));
      const yScale = Math.min(1.4, targetHeight / Math.max(1, maxY - minY));
      nodes.forEach(node => {
        node.x = (node.x - (minX + maxX) / 2) * xScale;
        node.y = (node.y - (minY + maxY) / 2) * yScale;
      });
      this.resolveCollisions(nodes, 74);
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
        const radius = Math.max(previousRadius + 128, people.length * 102 / (2 * Math.PI));
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
        const startX = previousRadius + 190;
        const startY = -(rows - 1) * 53;
        disconnected.forEach((person, index) => result.set(person.id, {
          x: startX + index % columns * 106,
          y: startY + Math.floor(index / columns) * 106,
          rank: null,
          disconnected: true
        }));
        this.disconnectedIsland = {x: startX - 54, y: startY - 95, width: Math.max(212, columns * 106), height: rows * 106 + 105};
      }
      return result;
    }

    draw() {
      this.guides.replaceChildren(); this.edgeLayer.replaceChildren(); this.nodeLayer.replaceChildren(); this.nodes.clear();
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
      this.relationships.forEach(relation => {
        const a = this.positions.get(relation.source), b = this.positions.get(relation.target);
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy));
        const offset = this.radius + 4;
        const sx = a.x + dx / distance * offset, sy = a.y + dy / distance * offset;
        const tx = b.x - dx / distance * offset, ty = b.y - dy / distance * offset;
        let path = `M ${sx} ${sy} L ${tx} ${ty}`;
        if (this.layout === 'lineage' && relation.type === 'parent') {
          const middle = (sy + ty) / 2;
          path = `M ${sx} ${sy} C ${sx} ${middle}, ${tx} ${middle}, ${tx} ${ty}`;
        }
        const element = el('path', {d: path, class: `graph-edge ${relation.type}`, fill: 'none', stroke: '#c0c8b9', 'stroke-width': relation.type === 'spouse' ? 1.5 : 1.2, 'data-source': relation.source, 'data-target': relation.target});
        if (relation.type === 'spouse') element.setAttribute('stroke-dasharray', '4 5');
        else element.setAttribute('marker-end', `url(#${this.id}-arrow)`);
        this.edgeLayer.append(element);
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
      this.nodes.forEach((group, id) => {
        const selected = id === this.focusId;
        group.classList.toggle('is-selected', selected);
        group.classList.toggle('is-hovered', id === hoverId);
        group.querySelector('.node-halo').setAttribute('opacity', selected || id === hoverId ? '0.7' : '0');
        const person = this.people.find(item => item.id === id);
        group.querySelector('.node-circle').setAttribute('fill', selected ? '#536d43' : person.gender === 'female' ? '#edd8c8' : '#dce5d0');
        group.querySelector('.node-circle').setAttribute('stroke', selected ? '#455b38' : person.gender === 'female' ? '#cda88d' : '#b2c39e');
        group.querySelector('.node-label').setAttribute('fill', selected ? '#fffdf5' : '#31422c');
        group.setAttribute('aria-pressed', String(selected));
      });
      [...this.edgeLayer.children].forEach(edge => {
        const connected = hoverId && (edge.dataset.source === hoverId || edge.dataset.target === hoverId);
        edge.classList.toggle('is-highlighted', !!connected);
        edge.setAttribute('stroke', connected ? '#7d8e6c' : '#c0c8b9');
        edge.setAttribute('stroke-width', connected ? '2.2' : edge.classList.contains('spouse') ? '1.5' : '1.2');
      });
    }

    select(id) {
      const person = this.people.find(item => item.id === id);
      if (!person) return;
      this.focusId = id;
      this.highlight(null);
      this.callbacks.onLeave?.();
      this.callbacks.onSelect?.(person);
    }

    zoomAt(factor, point) {
      const oldScale = this.transform.k;
      const nextScale = clamp(oldScale * factor, 0.01, 5);
      this.transform.x = point.x - (point.x - this.transform.x) * nextScale / oldScale;
      this.transform.y = point.y - (point.y - this.transform.y) * nextScale / oldScale;
      this.transform.k = nextScale;
      this.applyTransform();
    }

    zoomBy(factor) { this.zoomAt(factor, {x: this.width / 2, y: this.height / 2}); }

    fit() {
      if (!this.isMeasurable) return;
      if (!this.positions.size) { this.transform = {x: this.width / 2, y: this.height / 2, k: 1}; this.fittedScale = 1; this.applyTransform(); return; }
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
      this.applyTransform();
    }

    centerOn(id) {
      const point = this.positions.get(id);
      if (!point) return false;
      this.focusId = id;
      this.transform.x = this.width / 2 - point.x * this.transform.k;
      this.transform.y = this.height / 2 - point.y * this.transform.k;
      this.highlight(null);
      this.applyTransform();
      return true;
    }

    reset() { this.fit(); }

    applyTransform() {
      const {x, y, k} = this.transform;
      this.viewport.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
      this.callbacks.onZoom?.(k);
    }

    getState() {
      return {layout: this.layout, focusId: this.focusId, transform: {...this.transform}, peopleCount: this.people.length, relationshipCount: this.relationships.length, width: this.width, height: this.height, positions: Object.fromEntries([...this.positions.entries()].map(([id, point]) => [id, {...point}]))};
    }

    destroy() { this.resizeObserver.disconnect(); this.cleanups.forEach(cleanup => cleanup()); this.svg.remove(); }
  }
  window.BibleGraph = BibleGraph;
})();
