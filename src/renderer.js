/**
 * renderer.js — SVG rendering for all data structure types.
 *
 * Each render function clears the SVG and draws the structure
 * with staggered pop-in animations.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    e.setAttribute(k, v);
  }
  return e;
}

function clearSVG(svg) {
  svg.innerHTML = '';
}

function addDefs(svg) {
  const defs = el('defs');

  // Arrowhead marker
  const marker = el('marker', {
    id: 'arrowhead',
    markerWidth: '10',
    markerHeight: '7',
    refX: '10',
    refY: '3.5',
    orient: 'auto',
    markerUnits: 'strokeWidth',
  });
  const poly = el('polygon', {
    points: '0 0, 10 3.5, 0 7',
    class: 'arrow-marker',
    fill: '#4a4a66',
  });
  marker.appendChild(poly);
  defs.appendChild(marker);

  // Glow filter
  const filter = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const blur = el('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' });
  const merge = el('feMerge');
  const mn1 = el('feMergeNode', { in: 'coloredBlur' });
  const mn2 = el('feMergeNode', { in: 'SourceGraphic' });
  merge.appendChild(mn1);
  merge.appendChild(mn2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);

  // Node gradient
  const grad = el('linearGradient', { id: 'nodeGrad', x1: '0', y1: '0', x2: '1', y2: '1' });
  const s1 = el('stop', { offset: '0%', 'stop-color': '#6366f1', 'stop-opacity': '0.15' });
  const s2 = el('stop', { offset: '100%', 'stop-color': '#a855f7', 'stop-opacity': '0.08' });
  grad.appendChild(s1);
  grad.appendChild(s2);
  defs.appendChild(grad);

  svg.appendChild(defs);
}

/* ============ TREE ============ */

export function renderTree(svg, data) {
  clearSVG(svg);
  addDefs(svg);

  const { nodes, edges, width, height } = data;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const nodesMap = {};
  nodes.forEach(n => (nodesMap[n.id] = n));

  // Edges first (behind nodes)
  edges.forEach((edge, i) => {
    const from = nodesMap[edge.from];
    const to = nodesMap[edge.to];
    const line = el('line', {
      class: 'edge-line',
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      style: `--delay: ${i * 40}ms`,
    });
    svg.appendChild(line);
  });

  // Nodes
  nodes.forEach((node, i) => {
    const g = el('g', {
      class: 'node-group',
      style: `--delay: ${i * 60}ms`,
      'data-id': node.id,
      'data-val': node.val,
    });

    // Shadow circle (subtle)
    const shadow = el('circle', {
      cx: node.x,
      cy: node.y + 2,
      r: 22,
      fill: 'rgba(0,0,0,0.3)',
      filter: 'url(#glow)',
    });

    const circle = el('circle', {
      class: 'node-circle',
      cx: node.x,
      cy: node.y,
      r: 22,
    });

    const text = el('text', {
      class: 'node-text',
      x: node.x,
      y: node.y,
    });
    text.textContent = node.val;

    // Index label below
    const idx = el('text', {
      class: 'node-index',
      x: node.x,
      y: node.y + 34,
    });
    idx.textContent = `i=${node.id}`;

    g.appendChild(shadow);
    g.appendChild(circle);
    g.appendChild(text);
    g.appendChild(idx);
    svg.appendChild(g);
  });
}

/* ============ GRAPH ============ */

export function renderGraph(svg, data) {
  clearSVG(svg);
  addDefs(svg);

  const { nodes, edges, nodesMap, width, height } = data;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Edges
  edges.forEach((edge, i) => {
    const from = nodesMap[edge.from];
    const to = nodesMap[edge.to];
    if (!from || !to) return;

    const line = el('line', {
      class: 'edge-line',
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      style: `--delay: ${i * 30}ms`,
    });
    svg.appendChild(line);

    // Edge weight label
    if (edge.weight !== undefined) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const wt = el('text', {
        class: 'edge-weight',
        x: mx,
        y: my - 8,
      });
      wt.textContent = edge.weight;
      svg.appendChild(wt);
    }
  });

  // Nodes
  nodes.forEach((node, i) => {
    const g = el('g', {
      class: 'node-group',
      style: `--delay: ${i * 50}ms`,
      'data-id': node.id,
      'data-val': node.val,
    });

    const shadow = el('circle', {
      cx: node.x,
      cy: node.y + 2,
      r: 22,
      fill: 'rgba(0,0,0,0.25)',
    });

    const circle = el('circle', {
      class: 'node-circle',
      cx: node.x,
      cy: node.y,
      r: 22,
    });

    const text = el('text', {
      class: 'node-text',
      x: node.x,
      y: node.y,
    });
    text.textContent = node.val;

    g.appendChild(shadow);
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  });
}

/* ============ LINKED LIST ============ */

export function renderLinkedList(svg, data) {
  clearSVG(svg);
  addDefs(svg);

  const { nodes, edges, width, height } = data;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const nodesMap = {};
  nodes.forEach(n => (nodesMap[n.id] = n));

  const boxW = 64;
  const boxH = 42;

  // Arrows between nodes
  edges.forEach((edge, i) => {
    const from = nodesMap[edge.from];
    const to = nodesMap[edge.to];
    const line = el('line', {
      class: 'edge-line ll-arrow',
      x1: from.x + boxW / 2 + 4,
      y1: from.y,
      x2: to.x - boxW / 2 - 4,
      y2: to.y,
      style: `--delay: ${i * 60}ms`,
    });
    svg.appendChild(line);
  });

  // Nodes
  nodes.forEach((node, i) => {
    const g = el('g', {
      class: 'node-group',
      style: `--delay: ${i * 80}ms`,
      'data-id': node.id,
      'data-val': node.val,
    });

    const rect = el('rect', {
      class: 'll-rect',
      x: node.x - boxW / 2,
      y: node.y - boxH / 2,
      width: boxW,
      height: boxH,
    });

    const text = el('text', {
      class: 'node-text',
      x: node.x,
      y: node.y,
    });
    text.textContent = node.val;

    // Index
    const idx = el('text', {
      class: 'node-index',
      x: node.x,
      y: node.y - boxH / 2 - 10,
    });
    idx.textContent = i;

    g.appendChild(rect);
    g.appendChild(text);
    g.appendChild(idx);
    svg.appendChild(g);
  });

  // NULL terminator
  const last = nodes[nodes.length - 1];
  const nullG = el('g', {
    class: 'node-group',
    style: `--delay: ${nodes.length * 80}ms`,
  });
  const nullText = el('text', {
    class: 'll-null',
    x: last.x + 100,
    y: last.y,
  });
  nullText.textContent = 'null';

  // Arrow to null
  const nullArrow = el('line', {
    class: 'edge-line ll-arrow',
    x1: last.x + boxW / 2 + 4,
    y1: last.y,
    x2: last.x + 85,
    y2: last.y,
    style: `--delay: ${nodes.length * 60}ms`,
  });

  nullG.appendChild(nullText);
  svg.appendChild(nullArrow);
  svg.appendChild(nullG);
}

/* ============ MATRIX ============ */

export function renderMatrix(svg, data) {
  clearSVG(svg);
  addDefs(svg);

  const { cells, rows, cols, cellSize, width, height } = data;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const padding = 60;
  const gap = 4;

  // Row / column headers
  for (let c = 0; c < cols; c++) {
    const t = el('text', {
      class: 'matrix-index',
      x: padding + c * (cellSize + gap) + cellSize / 2,
      y: padding - 14,
    });
    t.textContent = c;
    svg.appendChild(t);
  }

  for (let r = 0; r < rows; r++) {
    const t = el('text', {
      class: 'matrix-index',
      x: padding - 20,
      y: padding + r * (cellSize + gap) + cellSize / 2,
    });
    t.textContent = r;
    svg.appendChild(t);
  }

  // Determine if matrix is binary (only 0s and 1s) — only then use color highlighting
  const isBinary = cells.every(c => c.val === 0 || c.val === 1 || c.val === true || c.val === false);

  // Cells
  cells.forEach((cell, i) => {
    const g = el('g', {
      class: 'node-group',
      style: `--delay: ${i * 20}ms`,
      'data-row': cell.row,
      'data-col': cell.col,
      'data-val': cell.val,
    });

    const shouldHighlight = isBinary && (cell.val === 1 || cell.val === true);

    const rect = el('rect', {
      class: `matrix-cell${shouldHighlight ? ' cell-highlight' : ''}`,
      x: cell.x,
      y: cell.y,
      width: cellSize,
      height: cellSize,
    });

    const text = el('text', {
      class: 'matrix-text',
      x: cell.x + cellSize / 2,
      y: cell.y + cellSize / 2,
    });
    text.textContent = cell.val;

    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);
  });
}
