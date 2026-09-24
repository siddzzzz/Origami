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
    id: 'blintz-base',
    name: 'Blintz Base (4 Diagonal Corner Folds)',
    difficulty: 'Clean Single-Sheet Foundation',
    description: 'The foundation of dozens of traditional origami models. 4 diagonal folds where each corner folds into the exact center of the single sheet.',
    paperSize: 100,
    creases: [
      // Outer border
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      // 4 Diagonal Creases connecting midpoints of edges
      // Fold 1: Top-Left diagonal crease: (-50, 0) to (0, -50)
      { x1: -50, y1: 0, x2: 0, y2: -50, type: 'valley', label: 'Top-Left Corner Fold' },
      // Fold 2: Top-Right diagonal crease: (0, -50) to (50, 0)
      { x1: 0, y1: -50, x2: 50, y2: 0, type: 'valley', label: 'Top-Right Corner Fold' },
      // Fold 3: Bottom-Right diagonal crease: (50, 0) to (0, 50)
      { x1: 50, y1: 0, x2: 0, y2: 50, type: 'valley', label: 'Bottom-Right Corner Fold' },
      // Fold 4: Bottom-Left diagonal crease: (0, 50) to (-50, 0)
      { x1: 0, y1: 50, x2: -50, y2: 0, type: 'valley', label: 'Bottom-Left Corner Fold' }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Initial Flat Sheet',
        instruction: 'Single undivided square sheet of paper laying flat on the workspace.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Fold Top-Left Corner to Center',
        instruction: 'Fold the top-left corner inward along its diagonal crease so the tip touches the center (0,0).',
        creaseHighlightIndex: [4]
      },
      {
        stepNumber: 3,
        title: 'Fold Top-Right Corner to Center',
        instruction: 'Fold the top-right corner inward along its diagonal crease to meet the center.',
        creaseHighlightIndex: [5]
      },
      {
        stepNumber: 4,
        title: 'Fold Bottom-Right Corner to Center',
        instruction: 'Fold the bottom-right corner inward along its diagonal crease to meet the center.',
        creaseHighlightIndex: [6]
      },
      {
        stepNumber: 5,
        title: 'Fold Bottom-Left Corner to Center',
        instruction: 'Fold the fourth corner inward along its diagonal crease to complete the blintz square.',
        creaseHighlightIndex: [7]
      }
    ]
  },
  {
    id: 'diagonal-halves',
    name: 'Diagonal Half & Quarter Fold',
    difficulty: 'Pure Geometric Triangle Folds',
    description: '4 consecutive diagonal folds demonstrating corner-to-corner origami folding on a single continuous sheet.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: 'border' },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: 'border' },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: 'border' },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: 'border' },
      // Diagonal A
      { x1: -50, y1: -50, x2: 50, y2: 50, type: 'valley', label: 'Primary Diagonal' },
      // Diagonal B
      { x1: -50, y1: 50, x2: 50, y2: -50, type: 'valley', label: 'Secondary Diagonal' }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Flat Square Sheet',
        instruction: 'Start with the sheet flat.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Diagonal Half Fold',
        instruction: 'Fold the lower half diagonally upward over the top half along the center diagonal.',
        creaseHighlightIndex: [4]
      },
      {
        stepNumber: 3,
        title: 'Fold in Half Again (Quarter Triangle)',
        instruction: 'Fold the right corner over to the left corner along the median altitude to form a neat 45-degree triangle.',
        creaseHighlightIndex: [5]
      }
    ]
  }
];
