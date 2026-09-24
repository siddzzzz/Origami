/**
 * CreasePatternViewer
 * Visualizes the 2D Crease Pattern on an HTML5 canvas with:
 * - Mountain folds (Red dashed/solid lines)
 * - Valley folds (Blue dashed lines)
 * - Outer boundary borders
 * - Current active step fold highlighting
 * - Interactive zooming & panning
 * - High-resolution SVG / PNG exporter
 */

import { CreaseType } from '../data/origamiModels.js';

export class CreasePatternViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = null;
    this.currentStepIndex = 0;

    // Viewport transform
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.showLabels = true;
    this.showMountain = true;
    this.showValley = true;

    this.initEvents();
    this.resize();
  }

  initEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.4, Math.min(5.0, this.zoom * zoomFactor));
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    this.render();
  }

  setModel(model, stepIndex = 0) {
    this.model = model;
    this.currentStepIndex = stepIndex;
    this.resetView();
    this.render();
  }

  setStep(stepIndex) {
    this.currentStepIndex = stepIndex;
    this.render();
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  render() {
    if (!this.ctx || !this.model) return;

    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Subtle technical grid pattern
    this.drawGrid(w, h);

    // Transform to center
    ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Scaling from origami coordinates (typically -50..50) to canvas display
    const scaleFactor = Math.min(w, h) * 0.007;
    ctx.scale(scaleFactor, scaleFactor);

    // Draw paper sheet background
    const halfSize = (this.model.paperSize || 100) / 2;
    ctx.fillStyle = '#faf8f5';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
    ctx.shadowColor = 'transparent';

    // Draw paper subtle inner tint
    const grad = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(240, 236, 227, 0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);

    const activeStep = this.model.steps ? this.model.steps[this.currentStepIndex] : null;
    const highlightedIndices = activeStep?.creaseHighlightIndex || [];

    // Render all creases
    this.model.creases.forEach((crease, idx) => {
      const isHighlighted = highlightedIndices.includes(idx);

      if (crease.type === CreaseType.MOUNTAIN && !this.showMountain) return;
      if (crease.type === CreaseType.VALLEY && !this.showValley) return;

      ctx.beginPath();
      ctx.moveTo(crease.x1, crease.y1);
      ctx.lineTo(crease.x2, crease.y2);

      if (isHighlighted) {
        ctx.strokeStyle = '#f59e0b'; // Amber glow for active step
        ctx.lineWidth = 3.5;
        ctx.setLineDash([]);
        ctx.stroke();

        // Pulsing glow effect
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.restore();
      } else {
        switch (crease.type) {
          case CreaseType.BORDER:
            ctx.strokeStyle = '#1e293b'; // Slate 800
            ctx.lineWidth = 2.0;
            ctx.setLineDash([]);
            break;
          case CreaseType.MOUNTAIN:
            ctx.strokeStyle = '#dc2626'; // Pure Red (Industry standard for Mountain)
            ctx.lineWidth = 1.4;
            ctx.setLineDash([8, 3, 2, 3]); // Dash-dot standard
            break;
          case CreaseType.VALLEY:
            ctx.strokeStyle = '#2563eb'; // Pure Blue (Industry standard for Valley)
            ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 4]); // Dashed standard
            break;
          default:
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.0;
            ctx.setLineDash([2, 2]);
        }
        ctx.stroke();
      }
    });

    // Draw fold node vertices
    ctx.fillStyle = '#475569';
    this.model.creases.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x1, c.y1, 1.2, 0, Math.PI * 2);
      ctx.arc(c.x2, c.y2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  drawGrid(w, h) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 24;

    ctx.beginPath();
    for (let x = 0; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  /**
   * Export the currently loaded Crease Pattern to vector SVG format
   */
  exportToSVG() {
    if (!this.model) return null;
    const half = (this.model.paperSize || 100) / 2;
    const size = half * 2;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half - 10} ${-half - 10} ${size + 20} ${size + 20}" width="600" height="600">
  <style>
    .border { stroke: #1e293b; stroke-width: 1.5; fill: none; }
    .mountain { stroke: #dc2626; stroke-width: 1.2; stroke-dasharray: 6 2 2 2; fill: none; }
    .valley { stroke: #2563eb; stroke-width: 1.2; stroke-dasharray: 4 3; fill: none; }
    .paper { fill: #fcfbf9; stroke: #cbd5e1; stroke-width: 1; }
  </style>
  <rect class="paper" x="${-half}" y="${-half}" width="${size}" height="${size}" />
`;

    this.model.creases.forEach(c => {
      let cls = 'border';
      if (c.type === CreaseType.MOUNTAIN) cls = 'mountain';
      if (c.type === CreaseType.VALLEY) cls = 'valley';

      svg += `  <line class="${cls}" x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" />\n`;
    });

    svg += `</svg>`;
    return svg;
  }
}
