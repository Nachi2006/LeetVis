/**
 * parser.js — Parse LeetCode-style inputs into structured data.
 *
 * Supports:
 *  - Binary Tree:  [1,2,3,null,null,4,5]
 *  - Graph adj:    [[1,2],[0,2],[0,1]]  or edges: [[0,1],[1,2],[2,0]]
 *  - Linked List:  [1,2,3,4,5]
 *  - Matrix/Grid:  [[1,0,1],[0,1,0],[1,0,1]]
 */

/**
 * Sanitise raw text: strip whitespace, convert "null" / "None" / "Null"
 * to literal null, handle trailing commas, etc.
 */
function sanitise(raw) {
  let s = raw.trim();
  // Replace Python-style None / True / False
  s = s.replace(/\bNone\b/gi, 'null');
  s = s.replace(/\bTrue\b/gi, 'true');
  s = s.replace(/\bFalse\b/gi, 'false');
  // Remove trailing commas before ] (lenient)
  s = s.replace(/,\s*]/g, ']');
  return s;
}

/**
 * Parse the raw string into a JS value (array of primitives or nested arrays).
 * Throws on bad input.
 */
export function parseRaw(raw) {
  const clean = sanitise(raw);
  try {
    const parsed = JSON.parse(clean);
    return parsed;
  } catch {
    throw new Error('Could not parse input. Make sure it is valid JSON array syntax.');
  }
}

/* ============ TREE ============ */

/**
 * Build a binary tree from level-order array.
 * Returns { nodes: [{id, val, left, right, depth, x, y}], edges: [{from, to}] }
 */
export function parseTree(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('Tree input must be a non-empty array.');
  }

  const nodes = [];
  const edges = [];

  // Build node list
  const treeNodes = arr.map((v, i) =>
    v === null ? null : { id: i, val: v }
  );

  // Link children
  let childIdx = 1;
  for (let i = 0; i < treeNodes.length; i++) {
    if (treeNodes[i] === null) continue;
    const node = treeNodes[i];
    node.left = null;
    node.right = null;

    if (childIdx < treeNodes.length) {
      node.left = treeNodes[childIdx] || null;
      if (treeNodes[childIdx]) {
        edges.push({ from: node.id, to: treeNodes[childIdx].id });
      }
      childIdx++;
    }
    if (childIdx < treeNodes.length) {
      node.right = treeNodes[childIdx] || null;
      if (treeNodes[childIdx]) {
        edges.push({ from: node.id, to: treeNodes[childIdx].id });
      }
      childIdx++;
    }
  }

  // Compute positions with BFS
  const root = treeNodes[0];
  if (!root) throw new Error('Root node cannot be null.');

  // Calculate tree depth first
  let maxDepth = 0;
  const queue = [{ node: root, depth: 0, pos: 0 }];
  const positioned = [];

  while (queue.length) {
    const { node, depth, pos } = queue.shift();
    maxDepth = Math.max(maxDepth, depth);
    positioned.push({ node, depth, pos });
    if (node.left) queue.push({ node: node.left, depth: depth + 1, pos: pos * 2 });
    if (node.right) queue.push({ node: node.right, depth: depth + 1, pos: pos * 2 + 1 });
  }

  // Lay out: x based on position within level, y based on depth
  const levelWidth = Math.pow(2, maxDepth);
  const xSpacing = 70;
  const ySpacing = 80;

  for (const { node, depth, pos } of positioned) {
    const levelSize = Math.pow(2, depth);
    const slotWidth = levelWidth / levelSize;
    node.x = (pos * slotWidth + slotWidth / 2) * xSpacing;
    node.y = depth * ySpacing + 60;
    node.depth = depth;
    nodes.push(node);
  }

  // Centre the tree
  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x));
  const offsetX = -minX + 60;
  nodes.forEach(n => (n.x += offsetX));

  return { nodes, edges, width: maxX - minX + 120, height: (maxDepth + 1) * ySpacing + 60 };
}

/* ============ GRAPH ============ */

/**
 * Parse adjacency list or edge list into graph.
 * Adjacency list: [[1,2],[0,2],[0,1]]  — index = node, values = neighbours
 * Edge list: [[0,1],[1,2],[2,0]]  — each sub-array is [from, to] or [from, to, weight]
 *
 * Heuristic: if max sub-array length <= 3 and all sub-arrays same length, treat as edge list.
 * Otherwise adjacency list.
 */
export function parseGraph(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('Graph input must be a non-empty 2D array.');
  }

  let adjList = {};
  let nodeSet = new Set();
  let edgesRaw = [];

  // Detect format
  const isEdgeList = arr.every(
    sub => Array.isArray(sub) && sub.length >= 2 && sub.length <= 3 && sub.every(v => typeof v === 'number')
  ) && arr.length > 0 && !arr.some(sub => sub.length > 3);

  // More careful: adjacency list arrays can also have length 2-3.
  // If all sub-arrays have length 2 and max value > arr.length, probably edge list.
  // If the array's length matches max node index + 1, it's likely adjacency list.
  let useEdgeList = false;
  if (isEdgeList) {
    const allValues = arr.flat();
    const maxVal = Math.max(...allValues);
    // If the number of sub-arrays is close to the number of unique nodes, edge list
    // If arr.length == maxVal + 1, probably adjacency list
    const uniqueNodes = new Set(allValues);
    if (arr.length === maxVal + 1 && arr.some(sub => sub.length > 2)) {
      useEdgeList = false; // adjacency list
    } else if (uniqueNodes.size <= arr.length && arr[0].length <= 3) {
      useEdgeList = true;
    }
  }

  if (useEdgeList) {
    // Edge list
    for (const edge of arr) {
      const [u, v, w] = edge;
      nodeSet.add(u);
      nodeSet.add(v);
      edgesRaw.push({ from: u, to: v, weight: w });
      if (!adjList[u]) adjList[u] = [];
      if (!adjList[v]) adjList[v] = [];
      adjList[u].push(v);
    }
  } else {
    // Adjacency list
    for (let i = 0; i < arr.length; i++) {
      nodeSet.add(i);
      if (!adjList[i]) adjList[i] = [];
      if (!Array.isArray(arr[i])) {
        // Flat value — skip
        continue;
      }
      for (const neighbor of arr[i]) {
        adjList[i].push(neighbor);
        nodeSet.add(neighbor);
        // Avoid duplicate edges for undirected
        if (i < neighbor) {
          edgesRaw.push({ from: i, to: neighbor });
        }
      }
    }
    // If no edges were added because all edges go from higher to lower, add them
    if (edgesRaw.length === 0) {
      const seen = new Set();
      for (let i = 0; i < arr.length; i++) {
        if (!Array.isArray(arr[i])) continue;
        for (const neighbor of arr[i]) {
          const key = Math.min(i, neighbor) + '-' + Math.max(i, neighbor);
          if (!seen.has(key)) {
            seen.add(key);
            edgesRaw.push({ from: i, to: neighbor });
          }
        }
      }
    }
  }

  // Force-directed layout
  const nodeArr = Array.from(nodeSet).sort((a, b) => a - b);
  const nodeCount = nodeArr.length;

  // Initial circular layout
  const cx = 300, cy = 250;
  const radius = Math.min(200, 40 * nodeCount);
  const nodesMap = {};
  const nodes = nodeArr.map((id, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    const n = {
      id,
      val: id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
    nodesMap[id] = n;
    return n;
  });

  // Simple force simulation (run for a few iterations)
  const iterations = 120;
  const repulsion = 3000;
  const attraction = 0.005;
  const damping = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edgesRaw) {
      const a = nodesMap[edge.from];
      const b = nodesMap[edge.to];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Centre gravity
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
    }

    // Apply velocity
    for (const n of nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // Normalise positions
  const padding = 80;
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x));
  const maxY = Math.max(...nodes.map(n => n.y));

  for (const n of nodes) {
    n.x = ((n.x - minX) / (maxX - minX || 1)) * 500 + padding;
    n.y = ((n.y - minY) / (maxY - minY || 1)) * 400 + padding;
  }

  const edges = edgesRaw.map(e => ({
    from: e.from,
    to: e.to,
    weight: e.weight,
  }));

  return {
    nodes,
    edges,
    nodesMap,
    width: 500 + padding * 2,
    height: 400 + padding * 2,
  };
}

/* ============ LINKED LIST ============ */

/**
 * Parse flat array into linked list nodes.
 */
export function parseLinkedList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('Linked list input must be a non-empty array.');
  }

  const spacing = 120;
  const nodes = arr.map((val, i) => ({
    id: i,
    val,
    x: i * spacing + 80,
    y: 200,
  }));

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: i, to: i + 1 });
  }

  return {
    nodes,
    edges,
    width: nodes.length * spacing + 80,
    height: 400,
  };
}

/* ============ MATRIX ============ */

/**
 * Parse 2D array into matrix grid.
 */
export function parseMatrix(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || !Array.isArray(arr[0])) {
    throw new Error('Matrix input must be a non-empty 2D array.');
  }

  const rows = arr.length;
  const cols = Math.max(...arr.map(r => r.length));
  const cellSize = 52;
  const gap = 4;
  const padding = 60;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        row: r,
        col: c,
        val: arr[r]?.[c] ?? '',
        x: padding + c * (cellSize + gap),
        y: padding + r * (cellSize + gap),
      });
    }
  }

  return {
    cells,
    rows,
    cols,
    cellSize,
    width: cols * (cellSize + gap) + padding * 2,
    height: rows * (cellSize + gap) + padding * 2,
  };
}
