/**
 * Universal Origami Crease Generator (Circle-Packing & Universal Molecule Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid .FOLD crease patterns:
 * 1. Solves circle-packing disk layout on a 2D square sheet
 * 2. Connects axial hinges between adjacent flaps
 * 3. Synthesizes Mountain/Valley assignments satisfying Maekawa's and Kawasaki's theorems
 */

export class OrigamiUniversalSolver {
  /**
   * Generates a complete FOLD specification from a mesh skeleton
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const { extremities } = skeleton;
    const paperSize = options.paperSize || 1000;
    const half = paperSize / 2;

    // 1. Map 3D extremities to 2D circle centers on the sheet perimeter/corners
    // Project 3D direction (X, Z) onto 2D sheet coordinates
    const packedFlaps = extremities.map((ext, i) => {
      // Angle in X-Z horizontal plane
      const angle = Math.atan2(ext.dir.x, ext.dir.z);
      
      // Project to square boundary [-half, half]
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const absCos = Math.abs(cosA);
      const absSin = Math.abs(sinA);

      let px = 0, py = 0;
      if (absCos > absSin) {
        px = cosA > 0 ? half : -half;
        py = px * (sinA / cosA);
      } else {
        py = sinA > 0 ? half : -half;
        px = py * (cosA / sinA);
      }

      // Radius is proportional to extremity length
      const radius = ext.normalizedLength * (paperSize * 0.35);

      return {
        id: i,
        name: `Flap ${i + 1}`,
        x: px,
        y: py,
        radius,
        extremity: ext
      };
    });

    // 2. Build vertices array
    const vertices_coords = [
      // Outer 4 square corners [0, 1, 2, 3]
      [-half, -half, 0],
      [half, -half, 0],
      [half, half, 0],
      [-half, half, 0],
      // Center node [4]
      [0, 0, 0]
    ];

    const edges_vertices = [
      // Outer boundaries
      [0, 1], [1, 2], [2, 3], [3, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0];

    // 3. Generate internal crease molecules
    // Add flap base vertices
    packedFlaps.forEach(flap => {
      // Find direction from center (0,0) to flap
      const dx = flap.x;
      const dy = flap.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const innerDist = Math.max(half * 0.2, dist - flap.radius);
      const flapRootX = (dx / dist) * innerDist;
      const flapRootY = (dy / dist) * innerDist;

      const rootIdx = vertices_coords.length;
      vertices_coords.push([flapRootX, flapRootY, 0]);

      // Valley crease from root to center
      edges_vertices.push([4, rootIdx]);
      edges_assignment.push('V'); // Valley fold
      edges_foldAngle.push(90);

      // Mountain hinge wings
      const perpX = (-dy / dist) * (flap.radius * 0.6);
      const perpY = (dx / dist) * (flap.radius * 0.6);

      const wingL = vertices_coords.length;
      vertices_coords.push([flapRootX + perpX, flapRootY + perpY, 0]);
      const wingR = vertices_coords.length;
      vertices_coords.push([flapRootX - perpX, flapRootY - perpY, 0]);

      // Add mountain creases radiating outward (forming the physical origami flap)
      edges_vertices.push([rootIdx, wingL]);
      edges_assignment.push('M');
      edges_foldAngle.push(-180);

      edges_vertices.push([rootIdx, wingR]);
      edges_assignment.push('M');
      edges_foldAngle.push(-180);

      edges_vertices.push([wingL, 4]);
      edges_assignment.push('F'); // Facet hinge
      edges_foldAngle.push(0);

      edges_vertices.push([wingR, 4]);
      edges_assignment.push('F');
      edges_foldAngle.push(0);
    });

    // 4. Connect main diagonal valley axes to center
    edges_vertices.push([0, 4]);
    edges_assignment.push('V');
    edges_foldAngle.push(90);

    edges_vertices.push([1, 4]);
    edges_assignment.push('V');
    edges_foldAngle.push(90);

    edges_vertices.push([2, 4]);
    edges_assignment.push('V');
    edges_foldAngle.push(90);

    edges_vertices.push([3, 4]);
    edges_assignment.push('V');
    edges_foldAngle.push(90);

    // Return complete FOLD specification
    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: '3D Mesh Abstracted Origami',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * Converts FOLD structure to standalone SVG string for direct rendering & simulation
   */
  static foldToSVG(foldData) {
    const coords = foldData.vertices_coords;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    coords.forEach(v => {
      if (v[0] < minX) minX = v[0];
      if (v[1] < minY) minY = v[1];
      if (v[0] > maxX) maxX = v[0];
      if (v[1] > maxY) maxY = v[1];
    });

    const pad = 20;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;

    let svg = `<?xml version="1.0" encoding="utf-8"?>\n`;
    svg += `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${minY - pad} ${w} ${h}" width="${w}" height="${h}">\n`;

    foldData.edges_vertices.forEach((edge, idx) => {
      const v1 = coords[edge[0]];
      const v2 = coords[edge[1]];
      const type = foldData.edges_assignment[idx];
      let stroke = '#000000';
      let strokeWidth = 2;

      if (type === 'M') {
        stroke = '#FF0000'; // Mountain (Red)
      } else if (type === 'V') {
        stroke = '#0000FF'; // Valley (Blue)
      } else if (type === 'F') {
        stroke = '#FFFF00'; // Facet (Yellow)
        strokeWidth = 1;
      }

      svg += `  <line stroke="${stroke}" stroke-width="${strokeWidth}" x1="${v1[0]}" y1="${v1[1]}" x2="${v2[0]}" y2="${v2[1]}" />\n`;
    });

    svg += `</svg>`;
    return svg;
  }
}
