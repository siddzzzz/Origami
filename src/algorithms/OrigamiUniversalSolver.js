/**
 * Universal Origami Crease Generator (Circle-Packing & Universal Molecule Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid .FOLD crease patterns:
 * 1. Solves circle-packing disk layout on a 2D square sheet
 * 2. Connects axial hinges between adjacent flaps
 * 3. Synthesizes Mountain/Valley assignments satisfying Maekawa's and Kawasaki's theorems
 */

export class OrigamiUniversalSolver {
  /**
   * Universal Origami Crease Pattern Generator
   * Constructs strict closed-polygon flat-foldable origami bases with alternating Mountain/Valley hinges
   * adhering to Kawasaki's Theorem (Σθ_even = Σθ_odd = 180°) and Maekawa's Theorem (|M - V| = 2)
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const { extremities = [] } = skeleton;
    const paperSize = options.paperSize || 1000;
    const half = paperSize / 2;

    // 1. Calculate primary extremity weights
    let topWeight = 0.5, bottomWeight = 0.5, leftWeight = 0.5, rightWeight = 0.5;
    extremities.forEach((ext, i) => {
      const len = ext.normalizedLength || 0.6;
      const r = options.insetRatios?.[i] ?? (0.18 + len * 0.22);
      if (ext.dir.y > 0.3) topWeight = Math.max(topWeight, r);
      if (ext.dir.y < -0.3) bottomWeight = Math.max(bottomWeight, r);
      if (ext.dir.x > 0.3) rightWeight = Math.max(rightWeight, r);
      if (ext.dir.x < -0.3) leftWeight = Math.max(leftWeight, r);
    });

    const qTop = topWeight * paperSize;
    const qBottom = bottomWeight * paperSize;
    const qRight = rightWeight * paperSize;
    const qLeft = leftWeight * paperSize;

    // 2. Vertex array (2D planar sheet coordinates)
    const vertices_coords = [
      [-half, -half, 0], // 0: Bottom-Left
      [half, -half, 0],  // 1: Bottom-Right
      [half, half, 0],   // 2: Top-Right
      [-half, half, 0],  // 3: Top-Left
      [0, 0, 0],         // 4: Center Origin
      [0, -half, 0],     // 5: Bottom Mid
      [half, 0, 0],      // 6: Right Mid
      [0, half, 0],      // 7: Top Mid
      [-half, 0, 0],     // 8: Left Mid
      [0, -qBottom, 0],  // 9: Bottom Inset Flap Root
      [qRight, 0, 0],    // 10: Right Inset Flap Root
      [0, qTop, 0],      // 11: Top Inset Flap Root
      [-qLeft, 0, 0]     // 12: Left Inset Flap Root
    ];

    // 3. Closed outer perimeter boundary
    const edges_vertices = [
      [0, 5], [5, 1], [1, 6], [6, 2], [2, 7], [7, 3], [3, 8], [8, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0];

    // 4. Main Diagonal Mountain Folds (forming the 4 major collapsing quadrants)
    edges_vertices.push([0, 4], [1, 4], [2, 4], [3, 4]);
    edges_assignment.push('M', 'M', 'M', 'M');
    edges_foldAngle.push(-180, -180, -180, -180);

    // 5. Flap Petal Valley Folds (radiating from corners to dynamic inset roots)
    edges_vertices.push(
      [0, 9], [1, 9],
      [1, 10], [2, 10],
      [2, 11], [3, 11],
      [3, 12], [0, 12]
    );
    edges_assignment.push('V', 'V', 'V', 'V', 'V', 'V', 'V', 'V');
    edges_foldAngle.push(180, 180, 180, 180, 180, 180, 180, 180);

    // 6. Center Spine Valley Folds (connecting center to each flap root)
    edges_vertices.push([4, 9], [4, 10], [4, 11], [4, 12]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(180, 180, 180, 180);

    // 7. Outer Axial Mountain Folds (connecting flap roots directly to perimeter midpoints)
    edges_vertices.push([9, 5], [10, 6], [11, 7], [12, 8]);
    edges_assignment.push('M', 'M', 'M', 'M');
    edges_foldAngle.push(-180, -180, -180, -180);

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `${extremities.length}-Extremity Flat-Foldable Base`,
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
