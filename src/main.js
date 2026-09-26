/**
 * main.js — LeetVis application orchestrator.
 *
 * Wires up UI events, parsing, rendering, pan/zoom,
 * example presets, and PNG download.
 */

import './style.css';
import { parseRaw, parseTree, parseGraph, parseLinkedList, parseMatrix } from './parser.js';
import { renderTree, renderGraph, renderLinkedList, renderMatrix } from './renderer.js';

/* ============ DOM refs ============ */
const inputEl = document.getElementById('data-input');
const hintEl = document.getElementById('input-hint');
const btnVisualize = document.getElementById('btn-visualize');
const btnClear = document.getElementById('btn-clear');
const typeSelector = document.getElementById('type-selector');
const svg = document.getElementById('vis-svg');
const emptyState = document.getElementById('empty-state');
const structureBadge = document.getElementById('structure-badge');
const examplesList = document.getElementById('examples-list');
const canvasContainer = document.getElementById('canvas-container');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnResetView = document.getElementById('btn-reset-view');
const btnDownload = document.getElementById('btn-download');
const btnThemeToggle = document.getElementById('btn-theme-toggle');

/* ============ State ============ */
let currentType = 'tree';
let currentTheme = 'dark';
let viewBox = { x: 0, y: 0, w: 800, h: 600 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panViewBoxStart = { x: 0, y: 0 };

/* ============ Constants ============ */
const HINTS = {
  tree: 'Paste LeetCode array (e.g. [1,2,3,null,null,4,5])',
  graph: 'Paste adjacency list (e.g. [[1,2],[0,2],[0,1]]) or edges (e.g. [[0,1],[1,2]])',
  linkedlist: 'Paste array values (e.g. [1,2,3,4,5])',
  matrix: 'Paste 2D array (e.g. [[1,0,1],[0,1,0],[1,0,1]])',
};

const BADGE_LABELS = {
  tree: 'Binary Tree',
  graph: 'Graph',
  linkedlist: 'Linked List',
  matrix: 'Matrix / Grid',
};

const PLACEHOLDERS = {
  tree: '[1,2,3,null,null,4,5]',
  graph: '[[1,2],[0,2],[0,1]]',
  linkedlist: '[1,2,3,4,5]',
  matrix: '[[1,0,1],[0,1,0],[1,0,1]]',
};

const EXAMPLES = [
  { type: 'tree', label: 'BST', data: '[4,2,6,1,3,5,7]' },
  { type: 'tree', label: 'Tree', data: '[1,2,3,null,null,4,5]' },
  { type: 'tree', label: 'Skew', data: '[1,null,2,null,3,null,4]' },
  { type: 'graph', label: 'Graph', data: '[[1,2],[0,2],[0,1]]' },
  { type: 'graph', label: 'Edges', data: '[[0,1],[0,2],[1,3],[2,3],[3,4]]' },
  { type: 'linkedlist', label: 'List', data: '[1,2,6,3,4,5,6]' },
  { type: 'matrix', label: 'Grid', data: '[[1,1,0],[1,1,0],[0,0,1]]' },
  { type: 'matrix', label: 'Island', data: '[[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]' },
];

/* ============ Toast ============ */
let toastTimeout;
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ============ Type Selector ============ */
function setType(type) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  hintEl.textContent = HINTS[type];
  inputEl.placeholder = PLACEHOLDERS[type];
  structureBadge.textContent = BADGE_LABELS[type];
  renderExamples();
}

typeSelector.addEventListener('click', e => {
  const btn = e.target.closest('.type-btn');
  if (btn && btn.dataset.type) {
    setType(btn.dataset.type);
  }
});

/* ============ Examples ============ */
function renderExamples() {
  examplesList.innerHTML = '';
  const filtered = EXAMPLES.filter(ex => ex.type === currentType);
  filtered.forEach(ex => {
    const item = document.createElement('div');
    item.className = 'example-item';
    item.innerHTML = `
      <span class="example-tag">${ex.label}</span>
      <span class="example-code">${ex.data}</span>
    `;
    item.addEventListener('click', () => {
      inputEl.value = ex.data;
      visualize();
    });
    examplesList.appendChild(item);
  });
}

/* ============ Visualize ============ */
function visualize() {
  const raw = inputEl.value.trim();
  if (!raw) {
    showToast('Please enter some input data.');
    return;
  }

  let parsed;
  try {
    parsed = parseRaw(raw);
  } catch (err) {
    showToast(err.message);
    return;
  }

  try {
    let data;
    switch (currentType) {
      case 'tree':
        data = parseTree(parsed);
        renderTree(svg, data);
        break;
      case 'graph':
        data = parseGraph(parsed);
        renderGraph(svg, data);
        break;
      case 'linkedlist':
        data = parseLinkedList(parsed);
        renderLinkedList(svg, data);
        break;
      case 'matrix':
        data = parseMatrix(parsed);
        renderMatrix(svg, data);
        break;
    }

    // Update viewBox to fit content
    if (data) {
      viewBox = { x: 0, y: 0, w: data.width || 800, h: data.height || 600 };
      svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    }

    emptyState.classList.add('hidden');
    structureBadge.textContent = BADGE_LABELS[currentType];
  } catch (err) {
    showToast(err.message);
  }
}

btnVisualize.addEventListener('click', visualize);
btnClear.addEventListener('click', () => {
  inputEl.value = '';
  svg.innerHTML = '';
  emptyState.classList.remove('hidden');
});

// Ctrl/Cmd + Enter shortcut
inputEl.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    visualize();
  }
});

/* ============ Pan & Zoom ============ */

function zoom(factor) {
  const cx = viewBox.x + viewBox.w / 2;
  const cy = viewBox.y + viewBox.h / 2;
  viewBox.w *= factor;
  viewBox.h *= factor;
  viewBox.x = cx - viewBox.w / 2;
  viewBox.y = cy - viewBox.h / 2;
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

btnZoomIn.addEventListener('click', () => zoom(0.8));
btnZoomOut.addEventListener('click', () => zoom(1.25));
btnResetView.addEventListener('click', () => {
  // Re-parse to get original viewBox
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const [x, y, w, h] = vb.split(' ').map(Number);
    viewBox = { x: 0, y: 0, w, h };
  }
  visualize();
});

// Mouse wheel zoom
canvasContainer.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 1.08 : 0.92;
  zoom(factor);
}, { passive: false });

// Pan with mouse drag
canvasContainer.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  panViewBoxStart = { x: viewBox.x, y: viewBox.y };
  canvasContainer.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  const rect = canvasContainer.getBoundingClientRect();
  const scaleX = viewBox.w / rect.width;
  const scaleY = viewBox.h / rect.height;
  viewBox.x = panViewBoxStart.x - (e.clientX - panStart.x) * scaleX;
  viewBox.y = panViewBoxStart.y - (e.clientY - panStart.y) * scaleY;
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvasContainer.style.cursor = '';
  }
});

/* ============ Download as PNG ============ */

/**
 * Inline all computed styles onto a cloned SVG so it renders
 * identically when detached from the page stylesheet.
 */
function inlineStyles(sourceEl, clonedEl) {
  const computed = getComputedStyle(sourceEl);
  // Key SVG-relevant properties to inline
  const props = [
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight',
    'text-anchor', 'dominant-baseline', 'filter', 'color', 'rx', 'ry',
  ];
  let styleStr = '';
  for (const prop of props) {
    const val = computed.getPropertyValue(prop);
    if (val) {
      styleStr += `${prop}:${val};`;
    }
  }
  // Preserve existing inline styles (like animation delay) and append computed ones
  const existing = clonedEl.getAttribute('style') || '';
  clonedEl.setAttribute('style', existing + styleStr);

  // Recurse into children
  const srcChildren = sourceEl.children;
  const cloneChildren = clonedEl.children;
  for (let i = 0; i < srcChildren.length; i++) {
    if (cloneChildren[i]) {
      inlineStyles(srcChildren[i], cloneChildren[i]);
    }
  }
}

btnDownload.addEventListener('click', () => {
  // Clone the live SVG so we don't mutate the original
  const cloned = svg.cloneNode(true);

  // Inline all computed styles from the live SVG onto the clone
  inlineStyles(svg, cloned);

  // Remove animations so all elements are visible in the export
  cloned.querySelectorAll('*').forEach(el => {
    el.style.animation = 'none';
    el.style.opacity = '1';
  });

  // Read the current viewBox
  const vb = svg.getAttribute('viewBox');
  if (vb) cloned.setAttribute('viewBox', vb);

  // Get dimensions from viewBox for canvas sizing
  const parts = (vb || '0 0 800 600').split(' ').map(Number);
  const svgW = parts[2];
  const svgH = parts[3];
  cloned.setAttribute('width', svgW);
  cloned.setAttribute('height', svgH);

  // Insert a background rect as the first child
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0B1120';
  const NS = 'http://www.w3.org/2000/svg';
  const bgRect = document.createElementNS(NS, 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', bgColor);
  cloned.insertBefore(bgRect, cloned.firstChild);

  // Serialize and export
  const svgData = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = () => {
    const scale = 2; // High DPI
    canvas.width = svgW * scale;
    canvas.height = svgH * scale;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, svgW, svgH);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `leetvis-${currentType}-${Date.now()}.png`;
    a.click();

    URL.revokeObjectURL(url);
  };

  img.src = url;
});

/* ============ Node Tooltip ============ */
let tooltip;

function initTooltip() {
  tooltip = document.createElement('div');
  tooltip.className = 'node-tooltip';
  document.body.appendChild(tooltip);
}

svg.addEventListener('mouseover', e => {
  const group = e.target.closest('.node-group');
  if (!group) return;

  if (!tooltip) initTooltip();

  const val = group.dataset.val;
  const id = group.dataset.id;
  const row = group.dataset.row;
  const col = group.dataset.col;

  let content = '';
  if (currentType === 'matrix') {
    content = `[${row}][${col}] = ${val}`;
  } else {
    content = `node ${id}: ${val}`;
  }

  tooltip.textContent = content;
  tooltip.classList.add('visible');
});

svg.addEventListener('mousemove', e => {
  if (tooltip && tooltip.classList.contains('visible')) {
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top = `${e.clientY - 10}px`;
  }
});

svg.addEventListener('mouseout', e => {
  const group = e.target.closest('.node-group');
  if (!group && tooltip) {
    tooltip.classList.remove('visible');
  }
});

svg.addEventListener('mouseleave', () => {
  if (tooltip) tooltip.classList.remove('visible');
});

/* ============ Theme Toggle ============ */
function getPreferredTheme() {
  const stored = localStorage.getItem('leetvis-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  // Detect OS preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('leetvis-theme', theme);
}

btnThemeToggle.addEventListener('click', () => {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Listen for OS theme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
  if (!localStorage.getItem('leetvis-theme')) {
    setTheme(e.matches ? 'light' : 'dark');
  }
});

/* ============ Init ============ */
setTheme(getPreferredTheme());
setType('tree');
renderExamples();
