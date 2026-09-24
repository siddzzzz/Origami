/**
 * Computational Origami Engine
 * Mathematical formalization of fold operations for:
 * 1. Exact rigid-origami paper folding kinematics
 * 2. Step-by-step state representations (suitable for RL / Transformer action space)
 * 3. 3D vertex positions derived strictly from crease line rotations
 */

import * as THREE from 'three';

/**
 * Applies rigid rotation of 3D point P around line (P0 + t * Axis) by angle theta
 */
export function rotatePointAroundLine(point, p0, axis, theta) {
  const p = point.clone().sub(p0);
  const q = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), theta);
  p.applyQuaternion(q);
  return p.add(p0);
}

/**
 * Standard origami paper size: 100x100 (-50 to +50)
 */
export const PAPER_SIZE = 100;
export const HALF_SIZE = 50;

/**
 * AI-learnable Origami Models
 * Each model is defined as:
 * - A single continuous paper sheet
 * - Explicit discrete fold actions (Hinge Line P1-P2, Target Fold Angle, Affected Facets)
 * - Measurable 3D target shape and developable flat crease pattern
 */
export const RIGID_ORIGAMI_MODELS = [
  {
    id: 'origami-cup',
    name: 'Traditional Drinking Cup / Envelope',
    difficulty: 'Pure Single-Sheet (4 Straight Folds)',
    description: 'A genuine single-sheet origami classic with zero cuts. Folds diagonally into a triangle, wings tuck horizontally across, and the top brim folds down to form a real vessel.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      // Step 1: Center diagonal
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'valley', label: 'Diagonal Fold' },
      // Step 2: Right corner fold to opposite side
      { x1: 0, y1: -16.6, x2: 50, y2: 50, type: 'valley', label: 'Right Flap Fold' },
      // Step 3: Left corner fold across
      { x1: 0, y1: -16.6, x2: -50, y2: -50, type: 'valley', label: 'Left Flap Fold' },
      // Step 4: Top triangle cuff fold down
      { x1: -25, y1: 25, x2: 25, y2: -25, type: 'valley', label: 'Rim Fold Down' }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Flat Square Sheet',
        instruction: 'Start with a square piece of paper flat on the surface.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Diagonal Valley Fold',
        instruction: 'Fold bottom corner straight up along the diagonal to meet the top corner, making a large triangle.',
        creaseHighlightIndex: [4]
      },
      {
        stepNumber: 3,
        title: 'Fold Right Corner Across',
        instruction: 'Take the right corner and fold it straight horizontally to meet the midpoint of the opposite edge.',
        creaseHighlightIndex: [5]
      },
      {
        stepNumber: 4,
        title: 'Fold Left Corner Across',
        instruction: 'Fold the left corner across over the front of the right flap.',
        creaseHighlightIndex: [6]
      },
      {
        stepNumber: 5,
        title: 'Fold Top Flap Down',
        instruction: 'Fold the top front triangular flap downward over the tucked corners to lock the cup opening.',
        creaseHighlightIndex: [7]
      }
    ]
  },
  {
    id: 'origami-masu',
    name: 'Single-Sheet Masu Box',
    difficulty: 'Foundation Box (4 Upward Folds)',
    description: 'Formed strictly by folding the four borders of a single continuous square sheet upward by 90 degrees along the crease boundary.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      // 4 interior crease lines defining the 50x50 base
      { x1: -25, y1: -25, x2: 25, y1: -25, type: 'valley', label: 'North Hinge' },
      { x1: 25, y1: -25, x2: 25, y2: 25, type: 'valley', label: 'East Hinge' },
      { x1: 25, y1: 25, x2: -25, y2: 25, type: 'valley', label: 'South Hinge' },
      { x1: -25, y1: 25, x2: -25, y2: -25, type: 'valley', label: 'West Hinge' }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Flat Square Sheet',
        instruction: 'Single undivided sheet of paper positioned flat.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Fold East & West Walls Upward',
        instruction: 'Fold the left and right flaps up at a crisp 90 degree angle along the crease lines.',
        creaseHighlightIndex: [5, 7]
      },
      {
        stepNumber: 3,
        title: 'Fold North & South Walls Upward',
        instruction: 'Fold the front and back flaps up at 90 degrees to form the hollow square container.',
        creaseHighlightIndex: [4, 6]
      }
    ]
  },
  {
    id: 'origami-pyramid',
    name: 'Origami Tent / Valley Peak',
    difficulty: 'Beginner Symmetry (2 Folds)',
    description: 'A fundamental origami crease form showing mountain & valley fold mechanics from a single square.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      { x1: 0, y1: -50, x2: 0, y2: 50, type: 'mountain', label: 'Center Mountain Spine' }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Flat Square Sheet',
        instruction: 'Single flat square sheet of paper.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Center Mountain Fold',
        instruction: 'Fold down the vertical center spine so the sheet stands up as an architectural tent.',
        creaseHighlightIndex: [4]
      }
    ]
  }
];
