/**
 * Exact Geometric Crease Pattern & Folding Simulator
 * 
 * KEY INSIGHT:
 * In physical origami:
 * 1. When paper is folded (e.g. into a triangle in Step 1),
 *    the next fold (Step 2) is drawn on the ALREADY-FOLDED 3D shape, NOT the flat sheet!
 * 2. When you unfold that sheet back flat, the crease line actually reflects across
 *    all underlying paper layers!
 * 
 * This module supports dual visual modes:
 * - MODE A: Folded Step Diagram (Shows the fold line on the current folded shape - how origami diagrams work!)
 * - MODE B: Unfolded Flat Crease Pattern (Shows all reflected crease lines on the unfolded sheet).
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

    this.viewMode = 'folded'; // 'folded' (Diagram mode) or 'flat' (Unfolded CP mode)

    this.initEvents();
    this.resize();
  }

  initEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.4, Math.min(5.0, this.zoom * factor));
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

  toggleViewMode() {
    this.viewMode = this.viewMode === 'folded' ? 'flat' : 'folded';
    this.render();
    return this.viewMode;
  }

  render() {
    if (!this.ctx || !this.model) return;

    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    this.drawGrid(w, h);

    ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);

    const scaleFactor = Math.min(w, h) * 0.007;
    ctx.scale(scaleFactor, scaleFactor);

    if (this.viewMode === 'folded') {
      this.renderFoldedDiagram(ctx);
    } else {
      this.renderUnfoldedFlatCP(ctx);
    }

    ctx.restore();
  }

  /**
   * Renders the 2D Origami Instruction Diagram for the CURRENT step:
   * Shows the shape AS IT LOOKS IN 2D after prior folds, with the active fold line dashed across it!
   */
  renderFoldedDiagram(ctx) {
    const s = (this.model.paperSize || 100) / 2;

    if (this.model.id === 'blintz-base') {
      this.renderBlintzDiagram(ctx, s);
    } else if (this.model.id === 'diagonal-halves') {
      this.renderDiagonalDiagram(ctx, s);
    } else {
      this.renderUnfoldedFlatCP(ctx);
    }
  }

  renderBlintzDiagram(ctx, s) {
    // Outer square boundary
    ctx.fillStyle = '#faf8f5';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.strokeRect(-s, -s, s * 2, s * 2);

    // Prior folded corners shown turned over in blue craft color!
    const step = this.currentStepIndex;

    const drawFoldedTriangle = (p1, p2, p3) => {
      ctx.fillStyle = '#38bdf8'; // Sky blue craft underside
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // If step >= 1: Top-Left corner is already folded to center (0,0)
    if (step >= 1) {
      drawFoldedTriangle([-s, 0], [0, -s], [0, 0]);
    }
    // If step >= 2: Top-Right corner folded to (0,0)
    if (step >= 2) {
      drawFoldedTriangle([0, -s], [s, 0], [0, 0]);
    }
    // If step >= 3: Bottom-Right corner folded to (0,0)
    if (step >= 3) {
      drawFoldedTriangle([s, 0], [0, s], [0, 0]);
    }
    // If step >= 4: Bottom-Left corner folded to (0,0)
    if (step >= 4) {
      drawFoldedTriangle([0, s], [-s, 0], [0, 0]);
    }

    // Now draw the ACTIVE crease line for the current step in vibrant glowing amber:
    const activeCreases = [
      null, // step 0 is flat
      { x1: -s, y1: 0, x2: 0, y2: -s }, // step 1
      { x1: 0, y1: -s, x2: s, y2: 0 },  // step 2
      { x1: s, y1: 0, x2: 0, y2: s },   // step 3
      { x1: 0, y1: s, x2: -s, y2: 0 }   // step 4
    ];

    const currentCrease = activeCreases[step];
    if (currentCrease) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(currentCrease.x1, currentCrease.y1);
      ctx.lineTo(currentCrease.x2, currentCrease.y2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.0;
      ctx.setLineDash([5, 4]); // Dashed valley fold notation
      ctx.stroke();
      ctx.restore();

      // Draw fold arrow pointing to center
      this.drawFoldArrow(ctx, currentCrease, [0, 0]);
    }
  }

  renderDiagonalDiagram(ctx, s) {
    const step = this.currentStepIndex;

    if (step === 0) {
      // Flat square with center diagonal fold dashed
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(-s, -s, s * 2, s * 2);

      // Diagonal valley fold
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.0;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.stroke();
    } else {
      // Step 1: Already folded into a triangle!
      ctx.fillStyle = '#38bdf8'; // Blue underside
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, -s);
      ctx.lineTo(s, s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Next fold line down median altitude: from (s, -s) to (0, 0)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.0;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(s, -s);
      ctx.lineTo(0, 0);
      ctx.stroke();
    }
  }

  drawFoldArrow(ctx, crease, targetPoint) {
    const midX = (crease.x1 + crease.x2) / 2;
    const midY = (crease.y1 + crease.y2) / 2;

    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(midX, midY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Mode B: Complete Unfolded Crease Pattern (Standard origami CP)
   */
  renderUnfoldedFlatCP(ctx) {
    const halfSize = (this.model.paperSize || 100) / 2;
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);

    const activeStep = this.model.steps ? this.model.steps[this.currentStepIndex] : null;
    const highlightedIndices = activeStep?.creaseHighlightIndex || [];

    this.model.creases.forEach((crease, idx) => {
      const isHighlighted = highlightedIndices.includes(idx);
      ctx.beginPath();
      ctx.moveTo(crease.x1, crease.y1);
      ctx.lineTo(crease.x2, crease.y2);

      if (isHighlighted) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = crease.type === 'mountain' ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 1.4;
        ctx.setLineDash(crease.type === 'mountain' ? [8, 3, 2, 3] : [5, 4]);
      }
      ctx.stroke();
    });
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

  exportToSVG() {
    if (!this.model) return null;
    const half = (this.model.paperSize || 100) / 2;
    const size = half * 2;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half - 10} ${-half - 10} ${size + 20} ${size + 20}" width="600" height="600">
  <rect fill="#faf8f5" stroke="#1e293b" stroke-width="2" x="${-half}" y="${-half}" width="${size}" height="${size}" />
`;
    this.model.creases.forEach(c => {
      const color = c.type === 'mountain' ? '#ef4444' : (c.type === 'valley' ? '#3b82f6' : '#1e293b');
      const dash = c.type === 'mountain' ? 'stroke-dasharray="8 3 2 3"' : (c.type === 'valley' ? 'stroke-dasharray="5 4"' : '');
      svg += `  <line stroke="${color}" stroke-width="1.5" ${dash} x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" />\n`;
    });
    svg += `</svg>`;
    return svg;
  }
}
