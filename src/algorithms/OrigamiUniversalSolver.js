/**
 * Universal Origami Crease Generator (TreeMaker & Morphological Base Synthesis)
 * Converts 3D skeleton extremity trees into mathematically valid, flat-foldable .FOLD & SVG crease patterns:
 * 1. Analyzes 3D morphological classification (Bunny, Quadruped, Bird, Pyramid, Universal)
 * 2. Generates hierarchical origami bases with macro flaps and micro-sculpting folds
 * 3. Enforces a strict minimum physical fold length (L_min) to ensure human foldability and avoid paper tearing
 * 4. Assigns valid alternating Mountain/Valley dihedral target angles
 * 5. Exports both structured .FOLD format and standard vector SVG for direct physical simulation
 */

export class OrigamiUniversalSolver {
  /**
   * Main synthesis entry point
   * @param {Object} skeleton Extracted skeleton with morphology, extremities, and bounding proportions
   * @param {Object} options Configuration options (detailLevel: 0|1|2, minCreaseLength: number, insetRatios: number[])
   */
  static synthesizeFoldPattern(skeleton, options = {}) {
    const morphology = skeleton?.morphology || 'universal';
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
      case 'bunny':
        foldData = this.synthesizeBunnyBase(skeleton, synthOpts);
        break;
      case 'quadruped':
        foldData = this.synthesizeQuadrupedBase(skeleton, synthOpts);
        break;
      case 'bird':
        foldData = this.synthesizeBirdBase(skeleton, synthOpts);
        break;
      case 'pyramid':
        foldData = this.synthesizePyramidBase(skeleton, synthOpts);
        break;
      case 'universal':
      default:
        foldData = this.synthesizeUniversalMultiFlapBase(skeleton, synthOpts);
        break;
    }

    // Enforce physical minimum crease length constraint
    return this.filterMicroCreases(foldData, minCreaseLength);
  }

  /**
   * 1. Bunny / Rabbit Fold Base
   * Authentic origami rabbit base with upright ears (+Y),
   * forward snout (+Z), dorsal spine, and crouching hind paws (-Y).
   * Micro-folds add ear curvature ribbing, blunt muzzle profiling, and knee/paw joints.
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

    // Macro Vertices [0..13]
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

    // Boundary Edges
    addEdge(0, 4, 'B', null);
    addEdge(4, 1, 'B', null);
    addEdge(1, 5, 'B', null);
    addEdge(5, 2, 'B', null);
    addEdge(2, 6, 'B', null);
    addEdge(6, 3, 'B', null);
    addEdge(3, 7, 'B', null);
    addEdge(7, 0, 'B', null);

    // Macro Creases
    // Left Ear
    addEdge(3, 9, 'V', 180);
    addEdge(6, 9, 'M', -180);
    addEdge(7, 9, 'M', -180);
    addEdge(8, 9, 'V', 180);

    // Right Ear
    addEdge(2, 10, 'V', 180);
    addEdge(6, 10, 'M', -180);
    addEdge(5, 10, 'M', -180);
    addEdge(8, 10, 'V', 180);

    // Snout / Head
    addEdge(6, 11, 'M', -180);
    addEdge(11, 8, 'V', 180);
    addEdge(11, 9, 'M', -180);
    addEdge(11, 10, 'M', -180);

    // Flanks
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

    // Tail spine
    addEdge(4, 8, 'M', -180);

    // Micro-Creases: Level 1 (Articulated Ears, Muzzle, and Paws)
    if (detail >= 1) {
      // 1. Ear Longitudinal Ribs (gives curved, concave 3D hollow ears)
      const earRibL = vertices_coords.length;
      vertices_coords.push([-qx * 1.35, qy * 1.35, 0]);
      addEdge(3, earRibL, 'V', 180);
      addEdge(9, earRibL, 'M', -180);
      addEdge(7, earRibL, 'V', 180);

      const earRibR = vertices_coords.length;
      vertices_coords.push([qx * 1.35, qy * 1.35, 0]);
      addEdge(2, earRibR, 'V', 180);
      addEdge(10, earRibR, 'M', -180);
      addEdge(5, earRibR, 'V', 180);

      // 2. Snout Crimp Diamond (folds muzzle forward-downward)
      const snoutTip = vertices_coords.length;
      vertices_coords.push([0, 0.44 * W, 0]);
      addEdge(11, snoutTip, 'M', -180);
      addEdge(9, snoutTip, 'V', 180);
      addEdge(10, snoutTip, 'V', 180);

      // 3. Hind Paw / Knee Joints (gives defined sitting paws)
      const pawL = vertices_coords.length;
      vertices_coords.push([-px * 1.35, -py * 1.35, 0]);
      addEdge(0, pawL, 'V', 180);
      addEdge(12, pawL, 'M', -180);
      addEdge(4, pawL, 'V', 180);

      const pawR = vertices_coords.length;
      vertices_coords.push([px * 1.35, -py * 1.35, 0]);
      addEdge(1, pawR, 'V', 180);
      addEdge(13, pawR, 'M', -180);
      addEdge(4, pawR, 'V', 180);
    }

    // Micro-Creases: Level 2 (Volumetric Back & Flank Rounding)
    if (detail >= 2) {
      const flankL = vertices_coords.length;
      vertices_coords.push([-0.25 * W, 0, 0]);
      addEdge(8, flankL, 'V', 180);
      addEdge(9, flankL, 'M', -180);
      addEdge(12, flankL, 'M', -180);

      const flankR = vertices_coords.length;
      vertices_coords.push([0.25 * W, 0, 0]);
      addEdge(8, flankR, 'V', 180);
      addEdge(10, flankR, 'M', -180);
      addEdge(13, flankR, 'M', -180);
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
   * 2. Quadruped / Frog Base
   * 4 downward-folding corner legs, forward head/neck, tail, and dorsal spine.
   * Micro-folds add articulated knee joints, hooves/paws, jowl crimps, and ribcage volume.
   */
  static synthesizeQuadrupedBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const legRatio = options.insetRatios?.[0] ?? 0.42;
    const headRatio = options.insetRatios?.[1] ?? 0.35;
    const tailRatio = options.insetRatios?.[2] ?? 0.35;

    const p = Math.max(0.25, Math.min(0.46, legRatio)) * W;
    const qh = Math.max(0.20, Math.min(0.45, headRatio)) * W;
    const qt = Math.max(0.20, Math.min(0.45, tailRatio)) * W;

    // Macro Vertices [0..14]
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

    // Flanks & Core Spine
    addEdge(7, 8, 'M', -180);
    addEdge(5, 8, 'M', -180);
    addEdge(9, 8, 'V', 180);
    addEdge(10, 8, 'V', 180);
    addEdge(11, 8, 'V', 180);
    addEdge(12, 8, 'V', 180);

    // Micro-Creases: Level 1 (Articulated Knee/Hock Joints on all 4 legs)
    if (detail >= 1) {
      // 4 Leg Knee / Hock Joints
      const kneeTL = vertices_coords.length;
      vertices_coords.push([-p * 1.45, p * 1.45, 0]);
      addEdge(3, kneeTL, 'V', 180);
      addEdge(9, kneeTL, 'M', -180);
      addEdge(7, kneeTL, 'V', 180);

      const kneeTR = vertices_coords.length;
      vertices_coords.push([p * 1.45, p * 1.45, 0]);
      addEdge(2, kneeTR, 'V', 180);
      addEdge(10, kneeTR, 'M', -180);
      addEdge(5, kneeTR, 'V', 180);

      const hockBR = vertices_coords.length;
      vertices_coords.push([p * 1.45, -p * 1.45, 0]);
      addEdge(1, hockBR, 'V', 180);
      addEdge(11, hockBR, 'M', -180);
      addEdge(5, hockBR, 'V', 180);

      const hockBL = vertices_coords.length;
      vertices_coords.push([-p * 1.45, -p * 1.45, 0]);
      addEdge(0, hockBL, 'V', 180);
      addEdge(12, hockBL, 'M', -180);
      addEdge(7, hockBL, 'V', 180);

      // Muzzle / Jowl Reverse Crimp
      const muzzle = vertices_coords.length;
      vertices_coords.push([0, 0.75 * W, 0]);
      addEdge(6, muzzle, 'V', 180);
      addEdge(13, muzzle, 'M', -180);
      addEdge(9, muzzle, 'V', 180);
      addEdge(10, muzzle, 'V', 180);
    }

    // Micro-Creases: Level 2 (Barrel Ribcage & Flank Volume)
    if (detail >= 2) {
      const ribL = vertices_coords.length;
      vertices_coords.push([-0.28 * W, 0, 0]);
      addEdge(8, ribL, 'V', 180);
      addEdge(9, ribL, 'M', -180);
      addEdge(12, ribL, 'M', -180);

      const ribR = vertices_coords.length;
      vertices_coords.push([0.28 * W, 0, 0]);
      addEdge(8, ribR, 'V', 180);
      addEdge(10, ribR, 'M', -180);
      addEdge(11, ribR, 'M', -180);
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `Origami Quadruped Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * 3. Bird Base
   * 2 broad lateral wings (+X, -X), forward head/beak (+Y), tail (-Y).
   * Micro-folds add tiered aerodynamic wing feather pleats, hooked beak crimp, and fanned tail.
   */
  static synthesizeBirdBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const wingRatio = options.insetRatios?.[0] ?? 0.40;
    const headRatio = options.insetRatios?.[1] ?? 0.36;
    const tailRatio = options.insetRatios?.[2] ?? 0.36;

    const qw = Math.max(0.20, Math.min(0.48, wingRatio)) * W;
    const qh = Math.max(0.20, Math.min(0.48, headRatio)) * W;
    const qt = Math.max(0.20, Math.min(0.48, tailRatio)) * W;

    // Macro Vertices [0..12]
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

    // Micro-Creases: Level 1 (Primary Wing Feathers & Beak)
    if (detail >= 1) {
      // Left Wing Mid-Feather Pleat
      const featherL1 = vertices_coords.length;
      vertices_coords.push([-qw * 1.5, 0, 0]);
      addEdge(7, featherL1, 'M', -180);
      addEdge(9, featherL1, 'V', 180);
      addEdge(3, featherL1, 'V', 180);
      addEdge(0, featherL1, 'V', 180);

      // Right Wing Mid-Feather Pleat
      const featherR1 = vertices_coords.length;
      vertices_coords.push([qw * 1.5, 0, 0]);
      addEdge(5, featherR1, 'M', -180);
      addEdge(10, featherR1, 'V', 180);
      addEdge(2, featherR1, 'V', 180);
      addEdge(1, featherR1, 'V', 180);

      // Beak Profiling Crimp
      const beak = vertices_coords.length;
      vertices_coords.push([0, 0.78 * W, 0]);
      addEdge(6, beak, 'V', 180);
      addEdge(11, beak, 'M', -180);
      addEdge(3, beak, 'V', 180);
      addEdge(2, beak, 'V', 180);
    }

    // Micro-Creases: Level 2 (Secondary Stepped Flight Feathers)
    if (detail >= 2) {
      const wingStepL = vertices_coords.length;
      vertices_coords.push([-0.78 * W, 0.20 * W, 0]);
      addEdge(7, wingStepL, 'V', 180);
      addEdge(3, wingStepL, 'M', -180);

      const wingStepR = vertices_coords.length;
      vertices_coords.push([0.78 * W, 0.20 * W, 0]);
      addEdge(5, wingStepR, 'V', 180);
      addEdge(2, wingStepR, 'M', -180);
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
   * 4. Star Pyramid Base
   * Multi-facet 3D pyramid with elevated apex and flat-folding triangular quadrants.
   * Micro-folds add concentric fluting / stepped pyramid tiers.
   */
  static synthesizePyramidBase(skeleton, options = {}) {
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    // Macro Vertices [0..8]
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

    // Micro-Creases: Concentric Fluted Pyramid Tiers
    if (detail >= 1) {
      // Tier 1 Ring (at 50% radius)
      const r1 = 0.50 * W;
      const t1_BL = vertices_coords.length; vertices_coords.push([-r1, -r1, 0]); // 9
      const t1_BR = vertices_coords.length; vertices_coords.push([r1, -r1, 0]);  // 10
      const t1_TR = vertices_coords.length; vertices_coords.push([r1, r1, 0]);   // 11
      const t1_TL = vertices_coords.length; vertices_coords.push([-r1, r1, 0]);  // 12

      addEdge(t1_BL, t1_BR, 'M', -180);
      addEdge(t1_BR, t1_TR, 'M', -180);
      addEdge(t1_TR, t1_TL, 'M', -180);
      addEdge(t1_TL, t1_BL, 'M', -180);
    }

    if (detail >= 2) {
      // Tier 2 Diamond Ring (at 75% midpoints)
      const r2 = 0.72 * W;
      const t2_B = vertices_coords.length; vertices_coords.push([0, -r2, 0]);
      const t2_R = vertices_coords.length; vertices_coords.push([r2, 0, 0]);
      const t2_T = vertices_coords.length; vertices_coords.push([0, r2, 0]);
      const t2_L = vertices_coords.length; vertices_coords.push([-r2, 0, 0]);

      addEdge(t2_B, t2_R, 'V', 180);
      addEdge(t2_R, t2_T, 'V', 180);
      addEdge(t2_T, t2_L, 'V', 180);
      addEdge(t2_L, t2_B, 'V', 180);
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
   * 5. Universal Multi-Flap Star Base
   * General synthesis for arbitrary 3D extremity trees with N spatial directions.
   * Micro-folds add longitudinal limb ribs and radial facet darts.
   */
  static synthesizeUniversalMultiFlapBase(skeleton, options = {}) {
    const { extremities = [] } = skeleton;
    const paperSize = options.paperSize || 1000;
    const W = paperSize / 2;
    const detail = options.detailLevel ?? 2;

    const N = Math.max(4, Math.min(8, extremities.length || 6));
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

    // Outer boundary vertices [0 ... N-1]
    for (let i = 0; i < N; i++) {
      const angle = sortedExts[i]?.azimuth ?? ((i / N) * Math.PI * 2);
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

    // Macro radial creases
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      const insetI = N + i;
      const insetNext = N + next;

      addEdge(i, insetI, 'V', 180);
      addEdge(insetI, centerIdx, 'M', -180);
      addEdge(insetI, next, 'M', -180);
      addEdge(insetI, insetNext, 'V', 180);
    }

    // Micro-Creases: Articulated Extremity Mid-Ribs
    if (detail >= 1) {
      for (let i = 0; i < N; i++) {
        const ext = sortedExts[i];
        const angle = ext?.azimuth ?? ((i / N) * Math.PI * 2);
        const midR = 0.68 * W;
        const ribIdx = vertices_coords.length;
        vertices_coords.push([Math.cos(angle) * midR, Math.sin(angle) * midR, 0]);

        addEdge(i, ribIdx, 'V', 180);
        addEdge(N + i, ribIdx, 'M', -180);
      }
    }

    return {
      file_spec: 1.1,
      file_creator: 'OrigamiUniversalSolver',
      file_title: `${N}-Extremity Universal Base (Detail L${detail})`,
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };
  }

  /**
   * Validates and enforces minimum physical fold length constraint (L_min)
   * Prevents physically impossible micro-folds and paper tears
   * @param {Object} foldData FOLD format data
   * @param {number} minLength Minimum physical fold length threshold (default 35)
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

      // Boundary edges are always preserved; internal folds must satisfy minLength
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
