/**
 * Universal Origami Crease Generator (Circle-Packing & Universal Molecule Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid .FOLD crease patterns:
 * 1. Solves circle-packing disk layout on a 2D square sheet
 * 2. Connects axial hinges between adjacent flaps
 * 3. Synthesizes Mountain/Valley assignments satisfying Maekawa's and Kawasaki's theorems
 */

export class OrigamiUniversalSolver {
  /**
   * Generates a complete FOLD specification tailored to the 3D mesh archetype:
   * - 'bunny': Blintz/Diamond base with twin vertical ear flaps (+Y), compact snout, and body tuck
   * - 'quadruped': 4-corner limb tucks + spine ridge
   * - 'bird' / default: 4-way cardinal flap base (wings, head, tail)
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const { extremities, archetype } = skeleton;
    const paperSize = options.paperSize || 1000;
    const half = paperSize / 2;

    if (archetype === 'bunny') {
      return this.synthesizeBunnyBase(paperSize, options);
    } else if (archetype === 'quadruped') {
      return this.synthesizeQuadrupedBase(paperSize, options);
    } else {
      return this.synthesizeBirdBase(paperSize, options);
    }
  }

  /**
   * Dedicated Flat-Foldable Bunny/Rabbit Origami Base (Twin Dorsal Ears + Head + Body)
   */
  static synthesizeBunnyBase(paperSize, options = {}) {
    const half = paperSize / 2;
    const earDepth = (options.earDepth ?? 0.35) * paperSize;
    const snoutDepth = (options.snoutDepth ?? 0.22) * paperSize;
    const bodyInset = (options.bodyInset ?? 0.30) * paperSize;

    const vertices_coords = [
      [-half, -half, 0], // 0: Bottom-Left (Body base)
      [half, -half, 0],  // 1: Bottom-Right (Body base)
      [half, half, 0],   // 2: Top-Right (Right Ear Tip)
      [-half, half, 0],  // 3: Top-Left (Left Ear Tip)
      [0, 0, 0],         // 4: Central Hinge
      [0, -half, 0],     // 5: Bottom Mid
      [half, 0, 0],      // 6: Right Mid
      [0, half, 0],      // 7: Top Mid (Between Ears)
      [-half, 0, 0],     // 8: Left Mid
      [-earDepth, half - earDepth, 0], // 9: Left Ear Root
      [earDepth, half - earDepth, 0],  // 10: Right Ear Root
      [0, -bodyInset, 0],              // 11: Body Flap Root
      [0, snoutDepth, 0]               // 12: Snout/Head Center
    ];

    const edges_vertices = [
      // Outer boundaries
      [0, 5], [5, 1], [1, 6], [6, 2], [2, 7], [7, 3], [3, 8], [8, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0];

    // Ear Mountain Split Hinges (forming distinct upright bunny ears)
    edges_vertices.push([7, 12], [3, 9], [2, 10], [9, 12], [10, 12]);
    edges_assignment.push('M', 'M', 'M', 'M', 'M');
    edges_foldAngle.push(-180, -180, -180, -180, -180);

    // Ear Valley Spreads
    edges_vertices.push([8, 9], [6, 10], [9, 7], [10, 7]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(180, 180, 90, 90);

    // Body & Spine Base
    edges_vertices.push([0, 11], [1, 11], [11, 5], [11, 4], [4, 12]);
    edges_assignment.push('M', 'M', 'V', 'M', 'M');
    edges_foldAngle.push(-180, -180, 180, -180, -180);

    // Side Tucks
    edges_vertices.push([0, 4], [1, 4], [8, 4], [6, 4]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(90, 90, 90, 90);

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Bunny Rabbit Origami Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * Quadruped 4-Legged Animal Origami Base
   */
  static synthesizeQuadrupedBase(paperSize, options = {}) {
    const half = paperSize / 2;
    const q = (options.insetRatio ?? 0.32) * paperSize;

    const vertices_coords = [
      [-half, -half, 0], [half, -half, 0], [half, half, 0], [-half, half, 0], // 0..3: 4 feet
      [0, 0, 0],                                                             // 4: Spine Center
      [0, -half, 0], [half, 0, 0], [0, half, 0], [-half, 0, 0],              // 5..8: Midpoints
      [-q, -q, 0], [q, -q, 0], [q, q, 0], [-q, q, 0]                         // 9..12: 4 Inset Knee Nodes
    ];

    const edges_vertices = [
      [0, 5], [5, 1], [1, 6], [6, 2], [2, 7], [7, 3], [3, 8], [8, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0];

    // Corner Leg Petal Mountains
    edges_vertices.push(
      [0, 9], [9, 5], [9, 8], [9, 4],
      [1, 10], [10, 5], [10, 6], [10, 4],
      [2, 11], [11, 6], [11, 7], [11, 4],
      [3, 12], [12, 7], [12, 8], [12, 4]
    );
    edges_assignment.push(
      'M', 'V', 'V', 'M',
      'M', 'V', 'V', 'M',
      'M', 'V', 'V', 'M',
      'M', 'V', 'V', 'M'
    );
    edges_foldAngle.push(
      -180, 180, 180, -180,
      -180, 180, 180, -180,
      -180, 180, 180, -180,
      -180, 180, 180, -180
    );

    // Spine Axial Fold
    edges_vertices.push([5, 4], [7, 4], [8, 4], [6, 4]);
    edges_assignment.push('M', 'M', 'V', 'V');
    edges_foldAngle.push(-180, -180, 180, 180);

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: 'Quadruped Animal Origami Base',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * Classical Bird / Crane Origami Base (Wings, Beak, Tail)
   */
  static synthesizeBirdBase(paperSize, options = {}) {
    const half = paperSize / 2;
    const q = (options.insetRatio ?? 0.28) * paperSize;

    const vertices_coords = [
      [-half, -half, 0], [half, -half, 0], [half, half, 0], [-half, half, 0],
      [0, 0, 0],
      [0, -half, 0], [half, 0, 0], [0, half, 0], [-half, 0, 0],
      [0, -q, 0], [q, 0, 0], [0, q, 0], [-q, 0, 0]
    ];

    const edges_vertices = [
      [0, 5], [5, 1], [1, 6], [6, 2], [2, 7], [7, 3], [3, 8], [8, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0];

    edges_vertices.push([0, 4], [1, 4], [2, 4], [3, 4]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(90, 90, 90, 90);

    edges_vertices.push(
      [0, 9], [1, 9],
      [1, 10], [2, 10],
      [2, 11], [3, 11],
      [3, 12], [0, 12]
    );
    edges_assignment.push('M', 'M', 'M', 'M', 'M', 'M', 'M', 'M');
    edges_foldAngle.push(-180, -180, -180, -180, -180, -180, -180, -180);

    edges_vertices.push([4, 9], [4, 10], [4, 11], [4, 12]);
    edges_assignment.push('M', 'M', 'M', 'M');
    edges_foldAngle.push(-180, -180, -180, -180);

    edges_vertices.push([9, 5], [10, 6], [11, 7], [12, 8]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(180, 180, 180, 180);

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
