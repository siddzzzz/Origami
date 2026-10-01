import { OrigamiUniversalSolver } from '../algorithms/OrigamiUniversalSolver.js';

/**
 * Curated Authentic Origami Presets with Distinct Geometric Morphologies
 */

// Generate mathematical fold data and SVG for each distinct base
const craneFold = OrigamiUniversalSolver.synthesizeBirdBase({}, { paperSize: 1000, detailLevel: 2 });
const boxPleatFold = OrigamiUniversalSolver.synthesizeBoxPleatedBase({}, { paperSize: 1000, detailLevel: 2 });
const miuraFold = OrigamiUniversalSolver.synthesizeMiuraCorrugationBase({}, { paperSize: 1000, detailLevel: 2 });
const fishFold = OrigamiUniversalSolver.synthesizeFishBase({}, { paperSize: 1000, detailLevel: 2 });
const frogFold = OrigamiUniversalSolver.synthesizeFrogBase({}, { paperSize: 1000, detailLevel: 2 });
const pyramidFold = OrigamiUniversalSolver.synthesizePyramidBase({}, { paperSize: 1000, detailLevel: 2 });
const bunnyFold = OrigamiUniversalSolver.synthesizeBunnyBase({}, { paperSize: 1000, detailLevel: 2 });

export const CLEAN_ORIGAMI_MODELS = [
  {
    id: 'crane-3d',
    name: 'Traditional Origami Crane (Tsuru)',
    foldData: craneFold,
    svgData: OrigamiUniversalSolver.foldToSVG(craneFold),
    difficulty: 'Master Classic',
    description: 'The iconic Japanese crane bird base with dual spreading wings, neck, and tail.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Flat Square Sheet', instruction: 'Start with an unbroken square sheet of paper.' },
      { stepNumber: 2, title: 'Preliminary Base Folds', instruction: 'Simultaneous valley diagonals and mountain cross-creases.' },
      { stepNumber: 3, title: 'Petal Formations', instruction: 'Flaps fold inward into elongated diamond wings.' },
      { stepNumber: 4, title: 'Finished 3D Crane Body', instruction: 'Neck and tail reversed, wings spread into 3D equilibrium.' }
    ]
  },
  {
    id: 'box-pleat',
    name: 'Box-Pleated 8x8 Grid Base',
    foldData: boxPleatFold,
    svgData: OrigamiUniversalSolver.foldToSVG(boxPleatFold),
    difficulty: 'Architectural Grid',
    description: 'Orthogonal grid pleating with 45° corner gusset sinks for boxy, cubical, and mechanical forms.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Orthogonal Grid', instruction: 'Sheet divided into 8x8 mountain/valley grid bands.' },
      { stepNumber: 2, title: 'Corner Gusset Sinks', instruction: '45-degree diagonal steps collapse into 3D vertical walls.' },
      { stepNumber: 3, title: 'Prismatic Box Collapse', instruction: 'Sheet forms a 3D structural enclosure.' }
    ]
  },
  {
    id: 'miura-ori',
    name: 'Miura-Ori Herringbone Tessellation',
    foldData: miuraFold,
    svgData: OrigamiUniversalSolver.foldToSVG(miuraFold),
    difficulty: 'Tessellation Physics',
    description: 'Famous space-folding accordion corrugation that collapses flat sheets into rigid curved 3D surfaces.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Parallel Zigzags', instruction: 'Alternating mountain and valley zigzag rows.' },
      { stepNumber: 2, title: 'Herringbone Hinge Sync', instruction: 'All nodes act as degree-4 rigid kinematic vertices.' },
      { stepNumber: 3, title: 'Cylindrical Curvature', instruction: 'Sheet contracts synchronously in both X and Y dimensions.' }
    ]
  },
  {
    id: 'fish-base',
    name: 'Fish / Kite Base (22.5° Bisectors)',
    foldData: fishFold,
    svgData: OrigamiUniversalSolver.foldToSVG(fishFold),
    difficulty: 'Streamlined Classic',
    description: 'Asymmetric 22.5° angle bisectors creating a sharp anterior head, lateral pectoral fins, and tail.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Kite Angle Folds', instruction: 'Top corners bisected sharply at 22.5 degrees.' },
      { stepNumber: 2, title: 'Lateral Fin Flaps', instruction: 'Left and right flaps swing outward as pectoral fins.' },
      { stepNumber: 3, title: 'Caudal Tail Notch', instruction: 'Posterior flaps split to form the dorsal spine and tail.' }
    ]
  },
  {
    id: 'frog-base',
    name: 'Frog 8-Flap Multi-Limb Base',
    foldData: frogFold,
    svgData: OrigamiUniversalSolver.foldToSVG(frogFold),
    difficulty: 'Multi-Limb Base',
    description: '8 radiating petal flaps forming 4 jumping limbs, head, tail, and body volume.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Blintzed Waterbomb', instruction: '4 corners and 4 edge midpoints folded inward.' },
      { stepNumber: 2, title: '8 Petal Squashes', instruction: 'Each flap squashed symmetrically into an articulated limb.' },
      { stepNumber: 3, title: '3D Joint Articulation', instruction: 'Knees and paws folded into crouching equilibrium.' }
    ]
  },
  {
    id: 'bunny-base',
    name: 'Stanford Bunny / Crouching Mammal Base',
    foldData: bunnyFold,
    svgData: OrigamiUniversalSolver.foldToSVG(bunnyFold),
    difficulty: 'Sculpted Organic',
    description: 'Upright dorsal ear cupping ribs, blunt snout crimp, and crouching hind paws.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Dorsal Ear Insets', instruction: 'Top corners folded into upright ear columns.' },
      { stepNumber: 2, title: 'Snout Profile Crimp', instruction: 'Front diamond crimped downward to shape the muzzle.' },
      { stepNumber: 3, title: 'Hind Leg Pleats', instruction: 'Bottom paws folded into compact sitting stance.' }
    ]
  },
  {
    id: 'pyramid-base',
    name: 'Star Pyramid (Stepped Facets)',
    foldData: pyramidFold,
    svgData: OrigamiUniversalSolver.foldToSVG(pyramidFold),
    difficulty: 'Geometric Polyhedron',
    description: 'Concentric square and diamond fluted rings forming an elevated 3D stepped pyramid.',
    paperSize: 1000,
    steps: [
      { stepNumber: 1, title: 'Diagonal Valley Lines', instruction: 'Diagonals pull inward while cross-creases push upward.' },
      { stepNumber: 2, title: 'Concentric Fluting', instruction: 'Stepped tiers lock the apex in elevated 3D space.' }
    ]
  }
];
