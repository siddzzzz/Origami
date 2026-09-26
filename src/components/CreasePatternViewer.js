/**
 * Authentic 2D Origami Crease Pattern Viewer
 * Parses and visualizes the exact mathematical crease patterns directly from origami SVG files:
 * - Mountain folds (Red #ef4444)
 * - Valley folds (Blue #3b82f6)
 * - Boundary / Cut edges (Dark Slate #1e293b / Green #22c55e)
 * - Facet / Triangulation hinges (Yellow/Gray)
 */

export class CreasePatternViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = null;

    // Viewport transform
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Parsed geometry cache
    this.parsedGeometry = null;
    this.cachedUrl = null;

    this.initEvents();
    this.resize();
  }

  initEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoom = Math.max(0.2, Math.min(8.0, this.zoom * factor));
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

  setModel(model) {
    this.model = model;
    this.resetView();

    if (model && model.simUrl) {
      this.loadPatternFromSVG(`/origamisim/assets/${model.simUrl}`);
    } else {
      this.parsedGeometry = null;
      this.render();
    }
  }

  setStep() {
    // Re-render
    this.render();
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  async loadPatternFromSVG(url) {
    if (this.cachedUrl === url && this.parsedGeometry) {
      this.render();
      return;
    }

    try {
      const resp = await fetch(url);
      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');

      const elements = [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      const updateBounds = (x, y) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      };

      // 1. Process <line>
      const lines = doc.querySelectorAll('line');
      lines.forEach(l => {
        const x1 = parseFloat(l.getAttribute('x1') || '0');
        const y1 = parseFloat(l.getAttribute('y1') || '0');
        const x2 = parseFloat(l.getAttribute('x2') || '0');
        const y2 = parseFloat(l.getAttribute('y2') || '0');
        const stroke = (l.getAttribute('stroke') || l.style.stroke || '#000000').toLowerCase();
        const opacity = parseFloat(l.getAttribute('opacity') || l.style.opacity || '1.0');

        updateBounds(x1, y1);
        updateBounds(x2, y2);

        elements.push({
          type: 'line',
          x1, y1, x2, y2,
          stroke: this.classifyStroke(stroke),
          opacity
        });
      });

      // 2. Process <rect>
      const rects = doc.querySelectorAll('rect');
      rects.forEach(r => {
        const x = parseFloat(r.getAttribute('x') || '0');
        const y = parseFloat(r.getAttribute('y') || '0');
        const w = parseFloat(r.getAttribute('width') || '0');
        const h = parseFloat(r.getAttribute('height') || '0');
        const stroke = (r.getAttribute('stroke') || r.style.stroke || '#000000').toLowerCase();

        updateBounds(x, y);
        updateBounds(x + w, y + h);

        elements.push({
          type: 'rect',
          x, y, w, h,
          stroke: this.classifyStroke(stroke),
          opacity: 1.0
        });
      });

      // 3. Process <path>
      const paths = doc.querySelectorAll('path');
      paths.forEach(p => {
        const d = p.getAttribute('d') || '';
        const stroke = (p.getAttribute('stroke') || p.style.stroke || '#000000').toLowerCase();
        const opacity = parseFloat(p.getAttribute('opacity') || p.style.opacity || '1.0');

        const parsedSublines = this.parsePathToLines(d, updateBounds);
        parsedSublines.forEach(sub => {
          elements.push({
            type: 'line',
            x1: sub.x1, y1: sub.y1, x2: sub.x2, y2: sub.y2,
            stroke: this.classifyStroke(stroke),
            opacity
          });
        });
      });

      if (minX === Infinity) {
        minX = 0; minY = 0; maxX = 100; maxY = 100;
      }

      const width = maxX - minX || 100;
      const height = maxY - minY || 100;
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      this.parsedGeometry = {
        elements,
        width,
        height,
        centerX,
        centerY,
        maxDim: Math.max(width, height)
      };
      this.cachedUrl = url;
      this.render();
    } catch (err) {
      console.warn('Failed to parse crease pattern SVG:', err);
    }
  }

  parsePathToLines(d, updateBounds) {
    const lines = [];
    // Basic SVG path segment parser for M/L/H/V/z commands
    const commands = d.match(/([a-df-z]|[\-+]?[0-9]*\.?[0-9]+(?:[eE][\-+]?[0-9]+)?)/gi) || [];
    let curX = 0, curY = 0;
    let startX = 0, startY = 0;
    let i = 0;
    let cmd = 'M';

    while (i < commands.length) {
      const token = commands[i];
      if (/^[a-df-z]$/i.test(token)) {
        cmd = token;
        i++;
      }

      if (cmd === 'M' || cmd === 'm') {
        const x = parseFloat(commands[i++]);
        const y = parseFloat(commands[i++]);
        curX = cmd === 'M' ? x : curX + x;
        curY = cmd === 'M' ? y : curY + y;
        startX = curX;
        startY = curY;
        updateBounds(curX, curY);
      } else if (cmd === 'L' || cmd === 'l') {
        const x = parseFloat(commands[i++]);
        const y = parseFloat(commands[i++]);
        const nextX = cmd === 'L' ? x : curX + x;
        const nextY = cmd === 'L' ? y : curY + y;
        lines.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
        updateBounds(nextX, nextY);
        curX = nextX;
        curY = nextY;
      } else if (cmd === 'H' || cmd === 'h') {
        const x = parseFloat(commands[i++]);
        const nextX = cmd === 'H' ? x : curX + x;
        lines.push({ x1: curX, y1: curY, x2: nextX, y2: curY });
        updateBounds(nextX, curY);
        curX = nextX;
      } else if (cmd === 'V' || cmd === 'v') {
        const y = parseFloat(commands[i++]);
        const nextY = cmd === 'V' ? y : curY + y;
        lines.push({ x1: curX, y1: curY, x2: curX, y2: nextY });
        updateBounds(curX, nextY);
        curY = nextY;
      } else if (cmd === 'z' || cmd === 'Z') {
        if (curX !== startX || curY !== startY) {
          lines.push({ x1: curX, y1: curY, x2: startX, y2: startY });
        }
        curX = startX;
        curY = startY;
      } else {
        i++;
      }
    }

    return lines;
  }

  classifyStroke(stroke) {
    if (!stroke) return 'border';
    if (stroke.includes('#ff0000') || stroke.includes('rgb(255,0,0)') || stroke === 'red') return 'mountain';
    if (stroke.includes('#0000ff') || stroke.includes('rgb(0,0,255)') || stroke === 'blue') return 'valley';
    if (stroke.includes('#00ff00') || stroke.includes('rgb(0,255,0)') || stroke === 'green') return 'cut';
    if (stroke.includes('#ffff00') || stroke.includes('rgb(255,255,0)') || stroke === 'yellow') return 'facet';
    if (stroke.includes('#ff00ff') || stroke.includes('magenta')) return 'hinge';
    return 'border';
  }

  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    this.drawGrid(w, h);

    if (!this.parsedGeometry) {
      ctx.restore();
      return;
    }

    const { elements, width, height, centerX, centerY, maxDim } = this.parsedGeometry;

    ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Scale so paper nicely occupies 70% of viewport
    const fitScale = (Math.min(w, h) * 0.72) / maxDim;
    ctx.scale(fitScale, fitScale);

    // Center geometry at origin (0,0)
    ctx.translate(-centerX, -centerY);

    // Draw background paper sheet
    ctx.fillStyle = '#faf8f5';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw pattern lines with origami notation
    elements.forEach(elem => {
      ctx.beginPath();
      let color = '#0f172a';
      let lineWidth = maxDim / 180;
      let dash = [];

      if (elem.stroke === 'mountain') {
        color = '#ef4444'; // Red
        dash = [maxDim / 60, maxDim / 100, maxDim / 200, maxDim / 100];
        lineWidth = maxDim / 160;
      } else if (elem.stroke === 'valley') {
        color = '#3b82f6'; // Blue
        dash = [maxDim / 80, maxDim / 90];
        lineWidth = maxDim / 160;
      } else if (elem.stroke === 'cut') {
        color = '#22c55e'; // Green
        dash = [];
        lineWidth = maxDim / 120;
      } else if (elem.stroke === 'facet') {
        color = 'rgba(234, 179, 8, 0.75)'; // Amber/yellow hinge
        dash = [maxDim / 120, maxDim / 120];
        lineWidth = maxDim / 240;
      } else if (elem.stroke === 'hinge') {
        color = '#ec4899';
        dash = [maxDim / 100, maxDim / 100];
        lineWidth = maxDim / 200;
      } else {
        // Border
        color = '#1e293b';
        dash = [];
        lineWidth = maxDim / 130;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, lineWidth);
      ctx.setLineDash(dash);

      if (elem.type === 'line') {
        ctx.moveTo(elem.x1, elem.y1);
        ctx.lineTo(elem.x2, elem.y2);
        ctx.stroke();
      } else if (elem.type === 'rect') {
        ctx.strokeRect(elem.x, elem.y, elem.w, elem.h);
      }
    });

    ctx.restore();
  }

  drawGrid(w, h) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.08)';
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
    if (!this.parsedGeometry) return null;
    const { elements, width, height, centerX, centerY } = this.parsedGeometry;
    const pad = 20;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${centerX - width / 2 - pad} ${centerY - height / 2 - pad} ${width + pad * 2} ${height + pad * 2}" width="800" height="800">
  <rect fill="#faf8f5" stroke="#1e293b" stroke-width="2" x="${centerX - width / 2}" y="${centerY - height / 2}" width="${width}" height="${height}" />
`;

    elements.forEach(elem => {
      let strokeHex = '#000000';
      let dashAttr = '';
      if (elem.stroke === 'mountain') {
        strokeHex = '#ff0000';
        dashAttr = 'stroke-dasharray="8 3 2 3"';
      } else if (elem.stroke === 'valley') {
        strokeHex = '#0000ff';
        dashAttr = 'stroke-dasharray="5 4"';
      } else if (elem.stroke === 'cut') {
        strokeHex = '#00ff00';
      }

      if (elem.type === 'line') {
        svg += `  <line stroke="${strokeHex}" stroke-width="1.5" ${dashAttr} x1="${elem.x1}" y1="${elem.y1}" x2="${elem.x2}" y2="${elem.y2}" />\n`;
      } else if (elem.type === 'rect') {
        svg += `  <rect stroke="${strokeHex}" stroke-width="2" fill="none" x="${elem.x}" y="${elem.y}" width="${elem.w}" height="${elem.h}" />\n`;
      }
    });

    svg += `</svg>`;
    return svg;
  }
}

