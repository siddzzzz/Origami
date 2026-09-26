import * as THREE from 'three';

/**
 * Clean 4-Fold Origami Models
 * 
 * 1. "blintz-base" (Letter Fold / Fortune Cookie / Blintz Base):
 *    Start: 1 Single Square Sheet (100x100)
 *    Fold 1: Corner 1 (Top-Left) folds to center along diagonal crease
 *    Fold 2: Corner 2 (Top-Right) folds to center along diagonal crease
 *    Fold 3: Corner 3 (Bottom-Right) folds to center along diagonal crease
 *    Fold 4: Corner 4 (Bottom-Left) folds to center along diagonal crease
 *    Result: An iconic single-sheet origami base with 100% geometric clarity!
 * 
 * 2. "diagonal-quarter" (Quarter Diagonal Fold):
 *    Fold 1: Fold in half diagonally
 *    Fold 2: Fold in half again to form a smaller triangle
 *    Fold 3: Fold tip down
 *    Fold 4: Turn over and fold back
 */

export const CLEAN_ORIGAMI_MODELS = [
  {
    id: 'crane-3d',
    name: 'Traditional Origami Crane (Tsugumi/Tsuru)',
    simUrl: 'Origami/traditionalCrane.svg',
    difficulty: 'Master Classic',
    description: 'The world-famous Japanese crane. Solved with multi-point mountain & valley dynamic GPU springs.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'valley', label: 'Diagonal Fold' },
      { x1: -50, y1: 50, x2: 50, y2: -50, type: 'valley', label: 'Diagonal Fold B' },
      { x1: 0, y1: -50, x2: 0, y2: 50, type: 'mountain', label: 'Vertical Fold' },
      { x1: -50, y1: 0, x2: 50, y2: 0, type: 'mountain', label: 'Horizontal Fold' }
    ],
    steps: [
      { stepNumber: 1, title: 'Flat Square Sheet', instruction: 'Start with an unbroken square sheet of paper.' },
      { stepNumber: 2, title: 'Preliminary Base Folds', instruction: 'Simultaneous valley diagonals and mountain cross-creases.' },
      { stepNumber: 3, title: 'Petal Formations', instruction: 'Flaps fold inward into elongated diamond wings.' },
      { stepNumber: 4, title: 'Finished 3D Crane Body', instruction: 'Neck and tail reversed, wings spread into 3D equilibrium.' }
    ]
  },
  {
    id: 'flapping-bird',
    name: 'Flapping Bird (Moving Wings)',
    simUrl: 'Origami/flappingBird.svg',
    difficulty: 'Action Model',
    description: 'Dynamic origami model that flaps wings along continuous hinge creases.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'valley' },
      { x1: -50, y1: 50, x2: 50, y2: -50, type: 'valley' }
    ],
    steps: [
      { stepNumber: 1, title: 'Flat Square Sheet', instruction: 'Square paper ready for folding.' },
      { stepNumber: 2, title: 'Bird Base Creases', instruction: 'Dynamic hinges form the core bird base.' },
      { stepNumber: 3, title: 'Flapping Wing Fold', instruction: 'Paper flexes smoothly along symmetric valley folds.' }
    ]
  },
  {
    id: 'waterbomb-base',
    name: 'Waterbomb Base (Triangle Inward Fold)',
    simUrl: 'Bases/waterbombBase.svg',
    difficulty: 'Fundamental Base',
    description: 'Essential origami base folding 4 triangular quadrants inward into a compact double-triangle.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'mountain', label: 'Diagonal Mountain A' },
      { x1: 25, y1: -50, x2: -25, y2: 50, type: 'mountain', label: 'Diagonal Mountain B' },
      { x1: -50, y1: 0, x2: 50, y2: 0, type: 'valley', label: 'Horizontal Valley' }
    ],
    steps: [
      { stepNumber: 1, title: 'Flat Square Sheet', instruction: 'Start flat.' },
      { stepNumber: 2, title: 'Mountain Diagonals', instruction: 'Fold both diagonals into mountain creases.' },
      { stepNumber: 3, title: 'Collapse into Waterbomb Base', instruction: 'Sides push inward simultaneously into a neat triangle.' }
    ]
  },
  {
    id: 'paper-airplane',
    name: 'Aerodynamic Paper Airplane',
    simUrl: 'Origami/airplane.svg',
    difficulty: 'Classic Fold',
    description: 'Aeronautical dart fold with symmetrical wings folded down along the center fuselage.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: 0, y1: -50, x2: 0, y2: 50, type: 'valley', label: 'Fuselage Fold' }
    ],
    steps: [
      { stepNumber: 1, title: 'Flat Sheet', instruction: 'Start with a rectangular or square sheet.' },
      { stepNumber: 2, title: 'Corner Nose Folds', instruction: 'Fold top corners inward toward the center.' },
      { stepNumber: 3, title: 'Wing Folds', instruction: 'Fold both wings outward to generate aerodynamic lift.' }
    ]
  },
  {
    id: 'russian-triangle',
    name: 'Russian Triangle Base',
    simUrl: 'SimpleFolds/russianTriangle.svg',
    difficulty: 'Geometric Fold',
    description: 'Precise multi-triangle compound fold with zero paper distortion.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'valley', label: 'Diagonal Fold' }
    ],
    steps: [
      { stepNumber: 1, title: 'Flat Sheet', instruction: 'Flat sheet ready for folding.' },
      { stepNumber: 2, title: 'Triangle Creases', instruction: 'Creases fold symmetrically without tearing.' }
    ]
  },
  {
    id: 'hypar-twisted',
    name: 'Hyperbolic Paraboloid (Hypar)',
    simUrl: 'Origami/hypar.svg',
    difficulty: 'Advanced Non-Euclidean',
    description: 'Self-folding 3D curved saddle surface created entirely by concentric square folds.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' }
    ],
    steps: [
      { stepNumber: 1, title: 'Concentric Squares', instruction: 'Alternating mountain and valley concentric squares.' },
      { stepNumber: 2, title: 'Hyperbolic Saddle Collapse', instruction: 'Sheet buckles naturally into a double-curved 3D saddle.' }
    ]
  }
];

