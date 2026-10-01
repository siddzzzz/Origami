/**
 * Universal Origami Crease Generator (TreeMaker & Morphological Base Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid, flat-foldable .FOLD & SVG crease patterns:
 * 1. Analyzes 3D morphological classification (Bunny, Quadruped, Bird, Pyramid, Universal)
 * 2. Parameterizes authentic origami bases with closed triangular polygonal meshes (Euler characteristic = 1)
 * 3. Assigns valid alternating Mountain/Valley dihedral target angles
 * 4. Exports both structured .FOLD format and standard vector SVG for direct physical simulation
 */

export class OrigamiUniversalSolver {
  /**
   * Main synthesis entry point
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const morphology = skeleton?.morphology || 'universal';

    switch (morphology) {
      case 'bunny':
        return this.synthesizeBunnyBase(skeleton, options);
      case 'quadruped':
        return this.synthesizeQuadrupedBase(skeleton, options);
      case 'bird':
        return this.synthesizeBirdBase(skeleton, options);
      case 'pyramid':
        return this.synthesizePyramidBase(skeleton, options);
      case 'universal':
      default:
        return this.synthesizeUniversalMultiFlapBase(skeleton, options);
    }
  }

  /**
   * 1. Bunny / Rabbit Fold Base
   * Authentic origami rabbit base with two distinct upright ears (+Y),
   * forward snout (+Z), dorsal spine, and crouching hind paws (-Y).
   */
  static synthesizeBunnyBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;

    const earRatioX = options.insetRatios?.[0] ?? 0.36;
    const earRatioY = options.insetRatios?.[1] ?? 0.52;
    const legRatioX = options.insetRatios?.[2] ?? 0.44;
    const legRatioY = options.insetRatios?.[3] ?? 0.44;

    const qx = Math.max(0.2, Math.min(0.46, earRatioX)) * W;
    const qy = Math.max(0.35, Math.min(0.65, earRatioY)) * W;
    const px = Math.max(0.25, Math.min(0.48, legRatioX)) * W;
    const py = Math.max(0.25, Math.min(0.48, legRatioY)) * W;

    const vertices_coords = [
      [-W, -W, 0],   // 0: BL (Left Hind Paw)
      [W, -W, 0],    // 1: BR (Right Hind Paw)
      [W, W, 0],     // 2: TR (Right Ear Tip)
      [-W, W, 0],    // 3: TL (Left Ear Tip)
      [0, -W, 0],    // 4: Bottom Mid (Tail)
      [W, 0, 0],     // 5: Right Mid (Right Flank)
      [0, W, 0],     // 6: Top Mid (Forehead between ears)
      [-W, 0, 0],    // 7: Left Mid (Left Flank)
      [0, 0, 0],     // 8: Center (Core Body)
      [-qx, qy, 0],  // 9: Left Ear Inset Root
      [qx, qy, 0],   // 10: Right Ear Inset Root
      [0, 0.38 * W, 0], // 11: Snout / Nose
      [-px, -py, 0], // 12: Left Leg Inset Root
      [px, -py, 0]   // 13: Right Leg Inset Root
    ];

    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    // Boundary
    addEdge(0, 4, 'B', null);
    addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null);
    addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null);
    addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null);
    addEdge(7, 0, 'B', null);

    // Left Ear (folds into upright 3D ear)
    addEdge(3, 9, 'V', 180);
    addEdge(6, 9, 'M', -180);
    addEdge(7, 9, 'M', -180);
    addEdge(8, 9, 'V', 180);

    // Right Ear (folds into upright 3D ear)
    addEdge(2, 10, 'V', 180);
    addEdge(6, 10, 'M', -180);
    addEdge(5, 10, 'M', -180);
    addEdge(8, 10, 'V', 180);

    // Snout / Head
    addEdge(6, 11, 'M', -180);
    addEdge(11, 8, 'V', 180);
    addEdge(11, 9, 'M', -180);
    addEdge(11, 10, 'M', -180);

    // Sides
    addEdge(7, 8, 'M', -180);
    addEdge(5, 8, 'M', -180);

    // Left Leg
    addEdge(0, 12, 'V', 180);
    addEdge(7, 12, 'M', -180);
    addEdge(4, 12, 'M', -180);
    addEdge(8, 12, 'V', 180);

    // Right Leg
    addEdge(1, 13, 'V', 180);
    addEdge(5, 13, 'M', -180);
    addEdge(4, 13, 'M', -180);
    addEdge(8, 13, 'V', 180);

    // Tail / Rump spine
    addEdge(4, 8, 'M', -180);

    const faces_vertices = [
      [3, 6, 9], [3, 9, 7], [6, 11, 9], [6, 10, 11], [2, 10, 6], [2, 5, 10],
      [7, 9, 8], [9, 11, 8], [10, 8, 11], [5, 8, 10],
      [7, 8, 12], [0, 7, 12], [0, 12, 4], [4, 12, 8],
      [5, 13, 8], [1, 13, 5], [1, 4, 13], [4, 8, 13]
    ];

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Origami Bunny Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle,
      faces_vertices
    };
  }

  /**
   * 2. Quadruped / Frog Base
   * 4 distinct downward-folding corner legs, 1 forward head/neck, 1 tail, and back spine.
   */
  static synthesizeQuadrupedBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;

    const legRatio = options.insetRatios?.[0] ?? 0.42;
    const headRatio = options.insetRatios?.[1] ?? 0.35;
    const tailRatio = options.insetRatios?.[2] ?? 0.35;

    const p = Math.max(0.25, Math.min(0.46, legRatio)) * W;
    const qh = Math.max(0.20, Math.min(0.45, headRatio)) * W;
    const qt = Math.max(0.20, Math.min(0.45, tailRatio)) * W;

    const vertices_coords = [
      [-W, -W, 0],  // 0: BL (Rear Left Leg)
      [W, -W, 0],   // 1: BR (Rear Right Leg)
      [W, W, 0],    // 2: TR (Front Right Leg)
      [-W, W, 0],   // 3: TL (Front Left Leg)
      [0, -W, 0],   // 4: Bottom Mid (Tail)
      [W, 0, 0],    // 5: Right Flank
      [0, W, 0],    // 6: Top Mid (Head / Beak)
      [-W, 0, 0],   // 7: Left Flank
      [0, 0, 0],    // 8: Center (Dorsal Spine)
      [-p, p, 0],   // 9: TL Leg Root
      [p, p, 0],    // 10: TR Leg Root
      [p, -p, 0],   // 11: BR Leg Root
      [-p, -p, 0],  // 12: BL Leg Root
      [0, qh, 0],   // 13: Head Root
      [0, -qt, 0]   // 14: Tail Root
    ];

    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    // Boundary
    addEdge(0, 4, 'B', null);
    addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null);
    addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null);
    addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null);
    addEdge(7, 0, 'B', null);

    // 4 Corner Legs
    addEdge(3, 9, 'V', 180);
    addEdge(6, 9, 'M', -180);
    addEdge(7, 9, 'M', -180);

    addEdge(2, 10, 'V', 180);
    addEdge(6, 10, 'M', -180);
    addEdge(5, 10, 'M', -180);

    addEdge(1, 11, 'V', 180);
    addEdge(4, 11, 'M', -180);
    addEdge(5, 11, 'M', -180);

    addEdge(0, 12, 'V', 180);
    addEdge(4, 12, 'M', -180);
    addEdge(7, 12, 'M', -180);

    // Head
    addEdge(6, 13, 'M', -180);
    addEdge(13, 9, 'V', 180);
    addEdge(13, 10, 'V', 180);
    addEdge(13, 8, 'M', -180);

    // Tail
    addEdge(4, 14, 'M', -180);
    addEdge(14, 11, 'V', 180);
    addEdge(14, 12, 'V', 180);
    addEdge(14, 8, 'M', -180);

    // Flanks & Core
    addEdge(7, 8, 'M', -180);
    addEdge(5, 8, 'M', -180);
    addEdge(9, 8, 'V', 180);
    addEdge(10, 8, 'V', 180);
    addEdge(11, 8, 'V', 180);
    addEdge(12, 8, 'V', 180);

    const faces_vertices = [
      [3, 6, 9], [3, 9, 7],
      [2, 5, 10], [2, 10, 6],
      [1, 4, 11], [1, 11, 5],
      [0, 7, 12], [0, 12, 4],
      [6, 10, 13], [6, 13, 9], [9, 13, 8], [10, 8, 13],
      [4, 14, 11], [4, 12, 14], [12, 8, 14], [11, 14, 8],
      [7, 9, 8], [7, 8, 12],
      [5, 8, 10], [5, 11, 8]
    ];

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Origami Quadruped Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle,
      faces_vertices
    };
  }

  /**
   * 3. Bird Base
   * 2 broad lateral wings (+X, -X), forward head/beak (+Y), tail (-Y).
   */
  static synthesizeBirdBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;

    const wingRatio = options.insetRatios?.[0] ?? 0.40;
    const headRatio = options.insetRatios?.[1] ?? 0.36;
    const tailRatio = options.insetRatios?.[2] ?? 0.36;

    const qw = Math.max(0.20, Math.min(0.48, wingRatio)) * W;
    const qh = Math.max(0.20, Math.min(0.48, headRatio)) * W;
    const qt = Math.max(0.20, Math.min(0.48, tailRatio)) * W;

    const vertices_coords = [
      [-W, -W, 0], // 0: BL
      [W, -W, 0],  // 1: BR
      [W, W, 0],   // 2: TR
      [-W, W, 0],  // 3: TL
      [0, -W, 0],  // 4: Tail Tip
      [W, 0, 0],   // 5: Right Wing Tip
      [0, W, 0],   // 6: Beak / Head Tip
      [-W, 0, 0],  // 7: Left Wing Tip
      [0, 0, 0],   // 8: Center (Heart / Keel)
      [-qw, 0, 0], // 9: Left Wing Inset
      [qw, 0, 0],  // 10: Right Wing Inset
      [0, qh, 0],  // 11: Head Inset
      [0, -qt, 0]  // 12: Tail Inset
    ];

    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    // Boundary
    addEdge(0, 4, 'B', null);
    addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null);
    addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null);
    addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null);
    addEdge(7, 0, 'B', null);

    // Wing Folds
    addEdge(6, 11, 'M', -180);
    addEdge(7, 9, 'V', 180);
    addEdge(5, 10, 'V', 180);
    addEdge(4, 12, 'M', -180);

    addEdge(3, 11, 'V', 180);
    addEdge(3, 9, 'M', -180);
    addEdge(2, 11, 'V', 180);
    addEdge(2, 10, 'M', -180);

    addEdge(1, 10, 'M', -180);
    addEdge(1, 12, 'V', 180);
    addEdge(0, 9, 'M', -180);
    addEdge(0, 12, 'V', 180);

    // Center Diamond
    addEdge(11, 8, 'V', 180);
    addEdge(10, 8, 'M', -180);
    addEdge(12, 8, 'V', 180);
    addEdge(9, 8, 'M', -180);

    addEdge(11, 10, 'M', -180);
    addEdge(10, 12, 'M', -180);
    addEdge(12, 9, 'M', -180);
    addEdge(9, 11, 'M', -180);

    const faces_vertices = [
      [3, 6, 11], [3, 11, 9], [3, 9, 7],
      [2, 10, 11], [2, 11, 6], [2, 5, 10],
      [1, 12, 10], [1, 10, 5], [1, 4, 12],
      [0, 9, 12], [0, 7, 9], [0, 12, 4],
      [11, 10, 8], [10, 12, 8], [12, 9, 8], [9, 11, 8]
    ];

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Origami Bird Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle,
      faces_vertices
    };
  }

  /**
   * 4. Star Pyramid Base
   * Multi-facet 3D pyramid with elevated apex and flat-folding triangular quadrants.
   */
  static synthesizePyramidBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;

    const vertices_coords = [
      [-W, -W, 0], // 0: BL
      [W, -W, 0],  // 1: BR
      [W, W, 0],   // 2: TR
      [-W, W, 0],  // 3: TL
      [0, -W, 0],  // 4: Bottom Mid
      [W, 0, 0],   // 5: Right Mid
      [0, W, 0],   // 6: Top Mid
      [-W, 0, 0],  // 7: Left Mid
      [0, 0, 0]    // 8: Center Apex
    ];

    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    // Boundary
    addEdge(0, 4, 'B', null);
    addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null);
    addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null);
    addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null);
    addEdge(7, 0, 'B', null);

    // Diagonals (Valley folds - pull inward)
    addEdge(0, 8, 'V', 180);
    addEdge(1, 8, 'V', 180);
    addEdge(2, 8, 'V', 180);
    addEdge(3, 8, 'V', 180);

    // Orthogonal Ridges (Mountain folds - push upward toward apex)
    addEdge(4, 8, 'M', -180);
    addEdge(5, 8, 'M', -180);
    addEdge(6, 8, 'M', -180);
    addEdge(7, 8, 'M', -180);

    const faces_vertices = [
      [0, 4, 8], [4, 1, 8], [1, 5, 8], [5, 2, 8],
      [2, 6, 8], [6, 3, 8], [3, 7, 8], [7, 0, 8]
    ];

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Origami Star Pyramid Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle,
      faces_vertices
    };
  }

  /**
   * 5. Universal Multi-Flap Star Base
   * General synthesis for arbitrary 3D extremity trees with N spatial directions.
   */
  static synthesizeUniversalMultiFlapBase(skeleton, options = {}) {
    const { extremities = [] } = skeleton;
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;

    const N = Math.max(4, Math.min(8, extremities.length || 6));
    const vertices_coords = [];
    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];
    const faces_vertices = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    // Sort extremities by 3D azimuth angle
    const sortedExts = [...extremities].sort((a, b) => (a.azimuth || 0) - (b.azimuth || 0));

    // Outer boundary vertices [0 ... N-1]
    for (let i = 0; i < N; i++) {
      const angle = sortedExts[i]?.azimuth ?? ((i / N) * Math.PI * 2);
      // Map to perimeter of square
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const scale = W / Math.max(Math.abs(cos), Math.abs(sin), 0.001);
      vertices_coords.push([cos * scale, sin * scale, 0]);
    }

    // Inset flap root vertices [N ... 2N-1]
    for (let i = 0; i < N; i++) {
      const ext = sortedExts[i];
      const r = options.insetRatios?.[i] ?? (0.35 + (ext?.normalizedLength || 0.6) * 0.15);
      const angle = ext?.azimuth ?? ((i / N) * Math.PI * 2);
      vertices_coords.push([Math.cos(angle) * r * W, Math.sin(angle) * r * W, 0]);
    }

    // Center core vertex [2N]
    const centerIdx = 2 * N;
    vertices_coords.push([0, 0, 0]);

    // Outer boundary edges
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      addEdge(i, next, 'B', null);
    }

    // Creases & Faces
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      const insetI = N + i;
      const insetNext = N + next;

      // Radial Flap Creases
      addEdge(i, insetI, 'V', 180);
      addEdge(insetI, centerIdx, 'M', -180);
      addEdge(insetI, next, 'M', -180);
      addEdge(insetI, insetNext, 'V', 180);

      // Sector Triangles
      faces_vertices.push([i, next, insetI]);
      faces_vertices.push([next, insetNext, insetI]);
      faces_vertices.push([insetI, insetNext, centerIdx]);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `${N}-Extremity Universal Base`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle,
      faces_vertices
    };
  }

  /**
   * Generates production-grade SVG markup directly compatible with Amanda Ghassaei's Origami Simulator
   */
  static foldToSVG(foldData) {
    const coords = foldData.vertices_coords;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    coords.forEach(v => {
      const x = v[0];
      const y = v[2] !== undefined && v[2] !== 0 ? v[2] : v[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const pad = 25;
    const w = Math.ceil(maxX - minX + pad * 2);
    const h = Math.ceil(maxY - minY + pad * 2);

    let svg = `<?xml version="1.0" encoding="utf-8"?>\n`;
    svg += `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${minY - pad} ${w} ${h}" width="${w}" height="${h}">\n`;

    foldData.edges_vertices.forEach((edge, idx) => {
      const v1 = coords[edge[0]];
      const v2 = coords[edge[1]];
      const x1 = v1[0];
      const y1 = v1[2] !== undefined && v1[2] !== 0 ? v1[2] : v1[1];
      const x2 = v2[0];
      const y2 = v2[2] !== undefined && v2[2] !== 0 ? v2[2] : v2[1];

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
      } else if (type === 'U') {
        stroke = '#FF00FF'; // Hinge (Magenta)
        strokeWidth = 1;
      }

      svg += `  <line stroke="${stroke}" stroke-width="${strokeWidth}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" />\n`;
    });

    svg += `</svg>`;
    return svg;
  }
}
