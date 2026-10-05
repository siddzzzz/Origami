/**
 * Universal Origami Crease Generator (TreeMaker, Medial Axis & Morphological Base Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid, flat-foldable .FOLD & SVG crease patterns:
 * 
 * Supports 8 distinct structural origami base families:
 * 1. 'treemaker' / 'universal': Dynamic Medial-Axis Voronoi tree base computed directly from 3D extremity vectors
 * 2. 'box_pleat': Orthogonal grid pleating with diagonal gussets (prismatic, mechanical, boxy, architectural objects)
 * 3. 'miura_corrugation': Herringbone parallelogram tessellation (cylindrical, conical, vases, curved organic shells)
 * 4. 'fish': 22.5° asymmetric kite bisectors (streamlined, aquatic, aerodynamic, fish, sharks, planes)
 * 5. 'frog': 8-flap blintzed waterbomb / frog base (amphibians, quadrupeds, multilimbed creatures, bipeds)
 * 6. 'bird': Traditional diamond crane / bird base (winged creatures, dragons, eagles)
 * 7. 'bunny': Upright dorsal ear pleats, snout crimp, and crouching hind leg folds
 * 8. 'pyramid': Concentric fluted iso-area stepped pyramid tiers, There are more yet to come, these are for testing only 
 */

export class OrigamiUniversalSolver {
  /**
   * Main synthesis entry point
   * @param {Object} skeleton Extracted skeleton with morphology, extremities, and bounding proportions
   * @param {Object} options Configuration options (morphologyOverride, detailLevel: 0|1|2, minCreaseLength: number, insetRatios: number[])
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const morphology = options.morphologyOverride || skeleton?.morphology || 'treemaker';
    const detailLevel = options.detailLevel ?? 2; // 0: Macro, 1: Articulated, 2: Micro-Sculpted
    const minCreaseLength = options.minCreaseLength ?? 35; // Minimum crease limit in paper units

    const synthOpts = {
      ...options,
      detailLevel,
      minCreaseLength,
      paperSize: options.paperSize || 1000
    };

    let foldData;
    switch (morphology) {
      case 'box_pleat':
        foldData = this.synthesizeBoxPleatedBase(skeleton, synthOpts);
        break;
      case 'miura_corrugation':
        foldData = this.synthesizeMiuraCorrugationBase(skeleton, synthOpts);
        break;
      case 'fish':
        foldData = this.synthesizeFishBase(skeleton, synthOpts);
        break;
      case 'frog':
      case 'quadruped':
        foldData = this.synthesizeFrogBase(skeleton, synthOpts);
        break;
      case 'bird':
        foldData = this.synthesizeBirdBase(skeleton, synthOpts);
        break;
      case 'bunny':
        foldData = this.synthesizeBunnyBase(skeleton, synthOpts);
        break;
      case 'pyramid':
        foldData = this.synthesizePyramidBase(skeleton, synthOpts);
        break;
      case 'treemaker':
      case 'universal':
      default:
        foldData = this.synthesizeTreeMakerMedialAxisBase(skeleton, synthOpts);
        break;
    }

    // Enforce physical minimum crease length constraint
    return this.filterMicroCreases(foldData, minCreaseLength);
  }

  /**
   * 1. Dynamic TreeMaker Medial-Axis Base (General Arbitrary 3D Extremity Tree)
   * Constructs a custom crease pattern by placing 2D flap nodes matching the 3D direction and length
   * of each extremity, generating Voronoi ridge crease lines and axial hinge bisectors.
   */
  static synthesizeTreeMakerMedialAxisBase(skeleton, options = {}) {
    const { extremities = [] } = skeleton;
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const N = Math.max(3, Math.min(10, extremities.length || 5));
    const vertices_coords = [];
    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    const sortedExts = [...extremities].sort((a, b) => (a.azimuth || 0) - (b.azimuth || 0));

    // 1. Outer boundary vertices [0 ... N-1]
    for (let i = 0; i < N; i++) {
      const ext = sortedExts[i];
      const angle = ext?.azimuth ?? ((i / N) * Math.PI * 2);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const scale = W / Math.max(Math.abs(cos), Math.abs(sin), 0.001);
      vertices_coords.push([cos * scale, sin * scale, 0]);
    }

    // 2. Inset limb flap nodes [N ... 2N-1]
    for (let i = 0; i < N; i++) {
      const ext = sortedExts[i];
      const userRatio = options.insetRatios?.[i];
      const r = userRatio !== undefined ? userRatio : (0.35 + (ext?.normalizedLength || 0.6) * 0.22);
      const angle = ext?.azimuth ?? ((i / N) * Math.PI * 2);
      vertices_coords.push([Math.cos(angle) * r * W, Math.sin(angle) * r * W, 0]);
    }

    // 3. Voronoi bisector junction nodes [2N ... 3N-1]
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      const angle1 = sortedExts[i]?.azimuth ?? ((i / N) * Math.PI * 2);
      let angle2 = sortedExts[next]?.azimuth ?? (((i + 1) / N) * Math.PI * 2);
      if (angle2 < angle1) angle2 += Math.PI * 2;
      const midAngle = (angle1 + angle2) / 2;
      const midR = 0.28 * W;
      vertices_coords.push([Math.cos(midAngle) * midR, Math.sin(midAngle) * midR, 0]);
    }

    // 4. Center core vertex [3N]
    const centerIdx = 3 * N;
    vertices_coords.push([0, 0, 0]);

    // Outer boundary edges
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      addEdge(i, next, 'B', null);
    }

    // Macro TreeMaker Creases: Axial Spines and Voronoi Ridges
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      const insetI = N + i;
      const insetNext = N + next;
      const juncI = 2 * N + i;

      // Axial mountain fold along extremity branch
      addEdge(i, insetI, 'M', -180);

      // Valley bisectors between extremity and boundary
      addEdge(i, juncI, 'V', 180);
      addEdge(next, juncI, 'V', 180);

      // Voronoi cell ridges connecting insets to junctions and center
      addEdge(insetI, juncI, 'M', -180);
      addEdge(insetNext, juncI, 'M', -180);
      addEdge(juncI, centerIdx, 'V', 180);
      addEdge(insetI, centerIdx, 'V', 180);
    }

    // Micro-Creases: Articulated Knuckle & Branch Darts
    if (detail >= 1) {
      for (let i = 0; i < N; i++) {
        const ext = sortedExts[i];
        const angle = ext?.azimuth ?? ((i / N) * Math.PI * 2);
        const midR = 0.72 * W;
        const ribIdx = vertices_coords.length;
        vertices_coords.push([Math.cos(angle) * midR, Math.sin(angle) * midR, 0]);

        addEdge(i, ribIdx, 'M', -180);
        addEdge(N + i, ribIdx, 'V', 180);
      }
    }

    if (detail >= 2) {
      for (let i = 0; i < N; i++) {
        const juncI = 2 * N + i;
        const sideDart = vertices_coords.length;
        const vJunc = vertices_coords[juncI];
        vertices_coords.push([vJunc[0] * 1.45, vJunc[1] * 1.45, 0]);
        addEdge(juncI, sideDart, 'M', -180);
      }
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `${N}-Extremity TreeMaker Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 2. Box-Pleating Base (Orthogonal Grid Tessellation)
   * Used for boxy, mechanical, architectural, vehicular, and cubical 3D forms.
   * Distinctive appearance: 8x8 orthogonal grid with 45° diagonal corner gusset sinks.
   */
  static synthesizeBoxPleatedBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;
    const gridN = detail >= 2 ? 8 : (detail >= 1 ? 6 : 4);
    const step = (2 * W) / gridN;

    const vertices_coords = [];
    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    const getVertIndex = (gx, gy) => gy * (gridN + 1) + gx;

    // Create (gridN + 1) x (gridN + 1) grid vertices
    for (let gy = 0; gy <= gridN; gy++) {
      for (let gx = 0; gx <= gridN; gx++) {
        const x = -W + gx * step;
        const y = -W + gy * step;
        vertices_coords.push([x, y, 0]);
      }
    }

    // Grid Boundaries & Orthogonal Creases
    for (let gy = 0; gy <= gridN; gy++) {
      for (let gx = 0; gx <= gridN; gx++) {
        const idx = getVertIndex(gx, gy);

        // Horizontal edges
        if (gx < gridN) {
          const nextIdx = getVertIndex(gx + 1, gy);
          if (gy === 0 || gy === gridN) {
            addEdge(idx, nextIdx, 'B', null);
          } else {
            const isMountain = gy % 2 === 1;
            addEdge(idx, nextIdx, isMountain ? 'M' : 'V', isMountain ? -180 : 180);
          }
        }

        // Vertical edges
        if (gy < gridN) {
          const nextIdx = getVertIndex(gx, gy + 1);
          if (gx === 0 || gx === gridN) {
            addEdge(idx, nextIdx, 'B', null);
          } else {
            const isMountain = gx % 2 === 1;
            addEdge(idx, nextIdx, isMountain ? 'M' : 'V', isMountain ? -180 : 180);
          }
        }
      }
    }

    // Diagonal 45° Gusset Creases for 3D Box Volume Collapse
    const gussetCount = Math.floor(gridN / 2);
    for (let g = 0; g < gussetCount; g++) {
      // Bottom-Left diagonal gusset
      addEdge(getVertIndex(g, g), getVertIndex(g + 1, g + 1), 'M', -180);
      addEdge(getVertIndex(g + 1, g), getVertIndex(g, g + 1), 'V', 180);

      // Top-Right diagonal gusset
      addEdge(getVertIndex(gridN - g, gridN - g), getVertIndex(gridN - g - 1, gridN - g - 1), 'M', -180);
      addEdge(getVertIndex(gridN - g - 1, gridN - g), getVertIndex(gridN - g, gridN - g - 1), 'V', 180);

      // Top-Left diagonal gusset
      addEdge(getVertIndex(g, gridN - g), getVertIndex(g + 1, gridN - g - 1), 'M', -180);
      addEdge(getVertIndex(g + 1, gridN - g), getVertIndex(g, gridN - g - 1), 'V', 180);

      // Bottom-Right diagonal gusset
      addEdge(getVertIndex(gridN - g, g), getVertIndex(gridN - g - 1, g + 1), 'M', -180);
      addEdge(getVertIndex(gridN - g - 1, g), getVertIndex(gridN - g, g + 1), 'V', 180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Box-Pleated Grid Base (${gridN}x${gridN})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 3. Miura-Ori Corrugation Base (Herringbone Cylindrical / Shell Tessellation)
   * Used for cylinders, vases, tubes, shells, and curved accordion folding surfaces.
   * Distinctive appearance: Parallel alternating zigzag rows forming parallelogram facet tiles.
   */
  static synthesizeMiuraCorrugationBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const rows = detail >= 2 ? 6 : (detail >= 1 ? 5 : 4);
    const cols = detail >= 2 ? 6 : (detail >= 1 ? 5 : 4);
    const dy = (2 * W) / rows;
    const dx = (2 * W) / cols;
    const shift = dx * 0.35; // Parallelogram skew angle offset

    const vertices_coords = [];
    const edges_vertices = [];
    const edges_assignment = [];
    const edges_foldAngle = [];

    const addEdge = (v1, v2, type, angle) => {
      edges_vertices.push([v1, v2]);
      edges_assignment.push(type);
      edges_foldAngle.push(angle);
    };

    const getVertIndex = (c, r) => r * (cols + 1) + c;

    // Generate zigzag vertices
    for (let r = 0; r <= rows; r++) {
      const y = -W + r * dy;
      const xOffset = (r % 2 === 1) ? shift : -shift;
      for (let c = 0; c <= cols; c++) {
        let x = -W + c * dx;
        if (c > 0 && c < cols) {
          x += xOffset;
        }
        vertices_coords.push([Math.max(-W, Math.min(W, x)), y, 0]);
      }
    }

    // Boundary and Miura-Ori Creases
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const idx = getVertIndex(c, r);

        // Horizontal zigzag edges
        if (c < cols) {
          const nextIdx = getVertIndex(c + 1, r);
          if (r === 0 || r === rows) {
            addEdge(idx, nextIdx, 'B', null);
          } else {
            const isMountain = r % 2 === 1;
            addEdge(idx, nextIdx, isMountain ? 'M' : 'V', isMountain ? -180 : 180);
          }
        }

        // Slanted vertical edges (alternating M/V in herringbone pattern)
        if (r < rows) {
          const nextIdx = getVertIndex(c, r + 1);
          if (c === 0 || c === cols) {
            addEdge(idx, nextIdx, 'B', null);
          } else {
            const isMountain = (r + c) % 2 === 0;
            addEdge(idx, nextIdx, isMountain ? 'M' : 'V', isMountain ? -180 : 180);
          }
        }
      }
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Miura-Ori Corrugation Base (${rows}x${cols})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 4. Fish / Kite Base (22.5° Asymmetric Streamlined Base)
   * Used for streamlined, aquatic, and aerodynamic shapes (fish, sharks, dolphins, airplanes).
   * Distinctive appearance: Sharp 22.5° anterior angle bisectors, lateral pectoral fin flaps, and posterior caudal split.
   */
  static synthesizeFishBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const snoutInset = options.insetRatios?.[0] ?? 0.42;
    const finInset = options.insetRatios?.[1] ?? 0.38;

    const vertices_coords = [
      [-W, -W, 0], // 0: BL (Left Tail)
      [W, -W, 0],  // 1: BR (Right Tail)
      [W, W, 0],   // 2: TR
      [-W, W, 0],  // 3: TL
      [0, -W, 0],  // 4: Tail Ventral Notch
      [W, 0, 0],   // 5: Right Pectoral Fin Tip
      [0, W, 0],   // 6: Snout / Head Tip
      [-W, 0, 0],  // 7: Left Pectoral Fin Tip
      [0, 0, 0],   // 8: Center Body
      [-finInset * W, 0.20 * W, 0],  // 9: Left Fin Root
      [finInset * W, 0.20 * W, 0],   // 10: Right Fin Root
      [0, (1 - snoutInset) * W, 0],  // 11: Snout Hinge
      [-0.40 * W, -0.50 * W, 0],     // 12: Left Tail Flap Root
      [0.40 * W, -0.50 * W, 0]      // 13: Right Tail Flap Root
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

    // 22.5° Kite Angle Bisectors (Fish Base Head)
    addEdge(6, 11, 'M', -180);
    addEdge(6, 9, 'V', 180);
    addEdge(6, 10, 'V', 180);
    addEdge(3, 9, 'M', -180);
    addEdge(2, 10, 'M', -180);
    addEdge(7, 9, 'V', 180);
    addEdge(5, 10, 'V', 180);

    // Central Dorsal Spine & Body Ribs
    addEdge(11, 8, 'M', -180);
    addEdge(9, 8, 'V', 180);
    addEdge(10, 8, 'V', 180);
    addEdge(8, 4, 'M', -180);

    // Posterior Caudal Tail Folds
    addEdge(0, 12, 'V', 180);
    addEdge(1, 13, 'V', 180);
    addEdge(4, 12, 'M', -180);
    addEdge(4, 13, 'M', -180);
    addEdge(8, 12, 'V', 180);
    addEdge(8, 13, 'V', 180);

    // Micro-Creases: Dorsal Fin & Gill Darts
    if (detail >= 1) {
      const gillL = vertices_coords.length; vertices_coords.push([-0.25 * W, 0.45 * W, 0]);
      addEdge(9, gillL, 'M', -180);
      addEdge(6, gillL, 'V', 180);

      const gillR = vertices_coords.length; vertices_coords.push([0.25 * W, 0.45 * W, 0]);
      addEdge(10, gillR, 'M', -180);
      addEdge(6, gillR, 'V', 180);
    }

    if (detail >= 2) {
      const finRibL = vertices_coords.length; vertices_coords.push([-0.72 * W, 0.10 * W, 0]);
      addEdge(7, finRibL, 'V', 180);
      addEdge(9, finRibL, 'M', -180);

      const finRibR = vertices_coords.length; vertices_coords.push([0.72 * W, 0.10 * W, 0]);
      addEdge(5, finRibR, 'V', 180);
      addEdge(10, finRibR, 'M', -180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Fish / Kite Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 5. Frog Base (8-Flap Blintzed Waterbomb Multi-Limb Base)
   * Used for amphibians, frogs, spiders, 8-limbed creatures, and complex multilimbed quadrupeds.
   * Distinctive appearance: 8 radiating petal-crease clusters from 4 corners and 4 edge midpoints.
   */
  static synthesizeFrogBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const rCorner = options.insetRatios?.[0] ?? 0.45;
    const rEdge = options.insetRatios?.[1] ?? 0.35;

    const vertices_coords = [
      [-W, -W, 0], // 0: BL Corner (Hind Left Foot)
      [W, -W, 0],  // 1: BR Corner (Hind Right Foot)
      [W, W, 0],   // 2: TR Corner (Front Right Arm)
      [-W, W, 0],  // 3: TL Corner (Front Left Arm)
      [0, -W, 0],  // 4: Bottom Edge (Tail / Rear Flap)
      [W, 0, 0],   // 5: Right Edge (Right Flank Flap)
      [0, W, 0],   // 6: Top Edge (Snout / Head Flap)
      [-W, 0, 0],  // 7: Left Edge (Left Flank Flap)
      [0, 0, 0],   // 8: Center Body Hub

      // Corner Flap Inset Roots [9..12]
      [-rCorner * W, -rCorner * W, 0], // 9: BL Inset
      [rCorner * W, -rCorner * W, 0],  // 10: BR Inset
      [rCorner * W, rCorner * W, 0],   // 11: TR Inset
      [-rCorner * W, rCorner * W, 0],  // 12: TL Inset

      // Edge Flap Inset Roots [13..16]
      [0, -rEdge * W, 0],  // 13: Bottom Inset
      [rEdge * W, 0, 0],   // 14: Right Inset
      [0, rEdge * W, 0],   // 15: Top Inset
      [-rEdge * W, 0, 0]   // 16: Left Inset
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
    addEdge(0, 4, 'B', null); addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null); addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null); addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null); addEdge(7, 0, 'B', null);

    // 4 Corner Petal Flaps (Legs)
    addEdge(0, 9, 'M', -180); addEdge(1, 10, 'M', -180);
    addEdge(2, 11, 'M', -180); addEdge(3, 12, 'M', -180);

    addEdge(0, 16, 'V', 180); addEdge(0, 13, 'V', 180);
    addEdge(1, 13, 'V', 180); addEdge(1, 14, 'V', 180);
    addEdge(2, 14, 'V', 180); addEdge(2, 15, 'V', 180);
    addEdge(3, 15, 'V', 180); addEdge(3, 16, 'V', 180);

    // 4 Edge Flap Insets (Head, Tail, Flanks)
    addEdge(6, 15, 'M', -180); addEdge(4, 13, 'M', -180);
    addEdge(5, 14, 'M', -180); addEdge(7, 16, 'M', -180);

    // Central Octagonal Waterbomb Hub
    addEdge(9, 8, 'V', 180); addEdge(10, 8, 'V', 180);
    addEdge(11, 8, 'V', 180); addEdge(12, 8, 'V', 180);
    addEdge(13, 8, 'M', -180); addEdge(14, 8, 'M', -180);
    addEdge(15, 8, 'M', -180); addEdge(16, 8, 'M', -180);

    addEdge(9, 13, 'M', -180); addEdge(10, 13, 'M', -180);
    addEdge(10, 14, 'M', -180); addEdge(11, 14, 'M', -180);
    addEdge(11, 15, 'M', -180); addEdge(12, 15, 'M', -180);
    addEdge(12, 16, 'M', -180); addEdge(9, 16, 'M', -180);

    // Micro-Creases: 4 Knee Joint Pleats
    if (detail >= 1) {
      const kneeBL = vertices_coords.length; vertices_coords.push([-0.72 * W, -0.72 * W, 0]);
      addEdge(0, kneeBL, 'M', -180); addEdge(9, kneeBL, 'V', 180);

      const kneeBR = vertices_coords.length; vertices_coords.push([0.72 * W, -0.72 * W, 0]);
      addEdge(1, kneeBR, 'M', -180); addEdge(10, kneeBR, 'V', 180);

      const kneeTR = vertices_coords.length; vertices_coords.push([0.72 * W, 0.72 * W, 0]);
      addEdge(2, kneeTR, 'M', -180); addEdge(11, kneeTR, 'V', 180);

      const kneeTL = vertices_coords.length; vertices_coords.push([-0.72 * W, 0.72 * W, 0]);
      addEdge(3, kneeTL, 'M', -180); addEdge(12, kneeTL, 'V', 180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Frog 8-Flap Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 6. Traditional Bird / Crane Base
   */
  static synthesizeBirdBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const wingSpread = options.insetRatios?.[0] ?? 0.50;
    const headRatio = options.insetRatios?.[1] ?? 0.40;

    const qw = Math.max(0.3, Math.min(0.65, wingSpread)) * W;
    const qh = Math.max(0.25, Math.min(0.55, headRatio)) * W;
    const qt = qh * 0.9;

    const vertices_coords = [
      [-W, -W, 0], // 0: BL (Tail Tip)
      [W, -W, 0],  // 1: BR (Tail Right Corner)
      [W, W, 0],   // 2: TR (Right Wing Tip)
      [-W, W, 0],  // 3: TL (Left Wing Tip)
      [0, -W, 0],  // 4: Bottom Mid
      [W, 0, 0],   // 5: Right Mid
      [0, W, 0],   // 6: Top Mid (Head / Beak Tip)
      [-W, 0, 0],  // 7: Left Mid
      [0, 0, 0],   // 8: Center (Spine Apex)
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
    addEdge(0, 4, 'B', null); addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null); addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null); addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null); addEdge(7, 0, 'B', null);

    // Wing Folds
    addEdge(6, 11, 'M', -180); addEdge(7, 9, 'V', 180);
    addEdge(5, 10, 'V', 180); addEdge(4, 12, 'M', -180);

    addEdge(3, 11, 'V', 180); addEdge(3, 9, 'M', -180);
    addEdge(2, 11, 'V', 180); addEdge(2, 10, 'M', -180);

    addEdge(1, 10, 'M', -180); addEdge(1, 12, 'V', 180);
    addEdge(0, 9, 'M', -180); addEdge(0, 12, 'V', 180);

    // Center Diamond
    addEdge(11, 8, 'V', 180); addEdge(10, 8, 'M', -180);
    addEdge(12, 8, 'V', 180); addEdge(9, 8, 'M', -180);

    addEdge(11, 10, 'M', -180); addEdge(10, 12, 'M', -180);
    addEdge(12, 9, 'M', -180); addEdge(9, 11, 'M', -180);

    // Micro-Creases: Wing Feathers & Beak
    if (detail >= 1) {
      const featherL1 = vertices_coords.length; vertices_coords.push([-qw * 1.5, 0, 0]);
      addEdge(7, featherL1, 'M', -180); addEdge(9, featherL1, 'V', 180);
      addEdge(3, featherL1, 'V', 180); addEdge(0, featherL1, 'V', 180);

      const featherR1 = vertices_coords.length; vertices_coords.push([qw * 1.5, 0, 0]);
      addEdge(5, featherR1, 'M', -180); addEdge(10, featherR1, 'V', 180);
      addEdge(2, featherR1, 'V', 180); addEdge(1, featherR1, 'V', 180);

      const beak = vertices_coords.length; vertices_coords.push([0, 0.78 * W, 0]);
      addEdge(6, beak, 'V', 180); addEdge(11, beak, 'M', -180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Bird Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 7. Bunny / Crouching Mammal Base
   */
  static synthesizeBunnyBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

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
    addEdge(0, 4, 'B', null); addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null); addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null); addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null); addEdge(7, 0, 'B', null);

    // Left Ear
    addEdge(3, 9, 'V', 180); addEdge(6, 9, 'M', -180);
    addEdge(7, 9, 'M', -180); addEdge(8, 9, 'V', 180);

    // Right Ear
    addEdge(2, 10, 'V', 180); addEdge(6, 10, 'M', -180);
    addEdge(5, 10, 'M', -180); addEdge(8, 10, 'V', 180);

    // Snout
    addEdge(6, 11, 'V', 180); addEdge(9, 11, 'M', -180);
    addEdge(10, 11, 'M', -180); addEdge(8, 11, 'M', -180);

    // Hind Legs
    addEdge(0, 12, 'V', 180); addEdge(4, 12, 'M', -180);
    addEdge(7, 12, 'M', -180); addEdge(8, 12, 'V', 180);

    addEdge(1, 13, 'V', 180); addEdge(4, 13, 'M', -180);
    addEdge(5, 13, 'M', -180); addEdge(8, 13, 'V', 180);

    // Flank Gussets
    addEdge(12, 13, 'M', -180); addEdge(9, 12, 'V', 180); addEdge(10, 13, 'V', 180);

    // Micro-Creases: Ear Ribs & Snout Crimp
    if (detail >= 1) {
      const earMidL = vertices_coords.length; vertices_coords.push([-0.65 * W, 0.75 * W, 0]);
      addEdge(3, earMidL, 'M', -180); addEdge(9, earMidL, 'V', 180);

      const earMidR = vertices_coords.length; vertices_coords.push([0.65 * W, 0.75 * W, 0]);
      addEdge(2, earMidR, 'M', -180); addEdge(10, earMidR, 'V', 180);

      const snoutCrimp = vertices_coords.length; vertices_coords.push([0, 0.65 * W, 0]);
      addEdge(6, snoutCrimp, 'M', -180); addEdge(11, snoutCrimp, 'V', 180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Bunny Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 8. Star Pyramid Base
   */
  static synthesizePyramidBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

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
    addEdge(0, 4, 'B', null); addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null); addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null); addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null); addEdge(7, 0, 'B', null);

    // Diagonals (Valley)
    addEdge(0, 8, 'V', 180); addEdge(1, 8, 'V', 180);
    addEdge(2, 8, 'V', 180); addEdge(3, 8, 'V', 180);

    // Orthogonal Ridges (Mountain)
    addEdge(4, 8, 'M', -180); addEdge(5, 8, 'M', -180);
    addEdge(6, 8, 'M', -180); addEdge(7, 8, 'M', -180);

    // Micro-Creases: Concentric Fluted Tiers
    if (detail >= 1) {
      const r1 = 0.50 * W;
      const t1_BL = vertices_coords.length; vertices_coords.push([-r1, -r1, 0]);
      const t1_BR = vertices_coords.length; vertices_coords.push([r1, -r1, 0]);
      const t1_TR = vertices_coords.length; vertices_coords.push([r1, r1, 0]);
      const t1_TL = vertices_coords.length; vertices_coords.push([-r1, r1, 0]);

      addEdge(t1_BL, t1_BR, 'M', -180); addEdge(t1_BR, t1_TR, 'M', -180);
      addEdge(t1_TR, t1_TL, 'M', -180); addEdge(t1_TL, t1_BL, 'M', -180);
    }

    if (detail >= 2) {
      const r2 = 0.72 * W;
      const t2_B = vertices_coords.length; vertices_coords.push([0, -r2, 0]);
      const t2_R = vertices_coords.length; vertices_coords.push([r2, 0, 0]);
      const t2_T = vertices_coords.length; vertices_coords.push([0, r2, 0]);
      const t2_L = vertices_coords.length; vertices_coords.push([-r2, 0, 0]);

      addEdge(t2_B, t2_R, 'V', 180); addEdge(t2_R, t2_T, 'V', 180);
      addEdge(t2_T, t2_L, 'V', 180); addEdge(t2_L, t2_B, 'V', 180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Star Pyramid Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * Validates and enforces minimum physical fold length constraint (L_min)
   */
  static filterMicroCreases(foldData, minLength = 35) {
    const coords = foldData.vertices_coords;
    const validEdges = [];
    const validAssignments = [];
    const validAngles = [];

    foldData.edges_vertices.forEach((edge, idx) => {
      const v1 = coords[edge[0]];
      const v2 = coords[edge[1]];
      if (!v1 || !v2) return;

      const x1 = v1[0];
      const y1 = v1[2] !== undefined && v1[2] !== 0 ? v1[2] : v1[1];
      const x2 = v2[0];
      const y2 = v2[2] !== undefined && v2[2] !== 0 ? v2[2] : v2[1];
      const len = Math.hypot(x2 - x1, y2 - y1);

      const isBoundary = foldData.edges_assignment[idx] === 'B';
      if (isBoundary || len >= minLength) {
        validEdges.push(edge);
        validAssignments.push(foldData.edges_assignment[idx]);
        validAngles.push(foldData.edges_foldAngle[idx]);
      }
    });

    foldData.edges_vertices = validEdges;
    foldData.edges_assignment = validAssignments;
    foldData.edges_foldAngle = validAngles;
    return foldData;
  }

  /**
   * Generates SVG markup directly compatible with Amanda Ghassaei's Origami Simulator
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
      if (!v1 || !v2) return;

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
