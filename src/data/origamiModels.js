/**
 * Represents crease line types according to standard origami notation:
 * - MOUNTAIN (red, dash-dot or solid red)
 * - VALLEY (blue, dashed)
 * - BORDER (dark gray/black outer boundary)
 * - FLAT / HINGE (unfolded or guide line)
 */

export const CreaseType = {
  BORDER: 'border',
  MOUNTAIN: 'mountain',
  VALLEY: 'valley',
  FLAT: 'flat'
};

/**
 * Pre-defined Origami folding models with:
 * - 2D Crease Pattern (vertices, edges, fold assignments)
 * - Fold sequence steps with hinge axes, affected face vertices, and target fold angles
 * - Target 3D reference representation
 */
export const ORIGAMI_MODELS = [
  {
    id: 'crane-classic',
    name: 'Classic Origami Crane (Tsuru)',
    difficulty: 'Intermediate',
    description: 'Traditional Japanese crane featuring preliminary square fold, petal folds, neck/tail reverse folds, and wing expansion.',
    paperSize: 100, // 100x100mm square
    // 2D Crease Pattern representation for canvas rendering & SVG export
    creases: [
      // Outer border
      { x1: -50, y1: -50, x2: 50, y1: -50, type: CreaseType.BORDER },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: CreaseType.BORDER },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: CreaseType.BORDER },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: CreaseType.BORDER },
      // Diagonals (Valleys)
      { x1: -50, y1: -50, x2: 50, y2: 50, type: CreaseType.VALLEY, label: 'Diagonal A' },
      { x1: -50, y1: 50, x2: 50, y2: -50, type: CreaseType.VALLEY, label: 'Diagonal B' },
      // Orthogonal medians (Mountains)
      { x1: 0, y1: -50, x2: 0, y2: 50, type: CreaseType.MOUNTAIN, label: 'Vertical Book Fold' },
      { x1: -50, y1: 0, x2: 50, y2: 0, type: CreaseType.MOUNTAIN, label: 'Horizontal Book Fold' },
      // Petal fold creases
      { x1: -25, y1: 0, x2: 0, y2: 50, type: CreaseType.VALLEY },
      { x1: 25, y1: 0, x2: 0, y2: 50, type: CreaseType.VALLEY },
      { x1: -25, y1: 0, x2: 0, y2: -50, type: CreaseType.VALLEY },
      { x1: 25, y1: 0, x2: 0, y2: -50, type: CreaseType.VALLEY },
      { x1: 0, y1: -25, x2: 50, y2: 0, type: CreaseType.MOUNTAIN },
      { x1: 0, y1: -25, x2: -50, y2: 0, type: CreaseType.MOUNTAIN },
      { x1: 0, y1: 25, x2: 50, y2: 0, type: CreaseType.MOUNTAIN },
      { x1: 0, y1: 25, x2: -50, y2: 0, type: CreaseType.MOUNTAIN }
    ],
    // Step-by-step sequence of transformations for animated 3D folding
    steps: [
      {
        stepNumber: 1,
        title: 'Initial Flat Sheet',
        instruction: 'Start with a square sheet of paper, colored side facing down.',
        creaseHighlightIndex: [0, 1, 2, 3],
        foldType: 'base'
      },
      {
        stepNumber: 2,
        title: 'Diagonal Valley Fold',
        instruction: 'Fold the bottom corner up to meet the top corner, forming a triangle.',
        creaseHighlightIndex: [4],
        hingeLine: { p1: [-50, -50], p2: [50, 50] },
        maxAngle: Math.PI * 0.96
      },
      {
        stepNumber: 3,
        title: 'Second Diagonal Valley Fold',
        instruction: 'Fold corner to corner in the opposite direction to establish the center crease.',
        creaseHighlightIndex: [5],
        hingeLine: { p1: [-50, 50], p2: [50, -50] },
        maxAngle: Math.PI * 0.96
      },
      {
        stepNumber: 4,
        title: 'Horizontal & Vertical Mountain Folds',
        instruction: 'Turn over and fold edge to edge horizontally and vertically.',
        creaseHighlightIndex: [6, 7],
        maxAngle: Math.PI * 0.9
      },
      {
        stepNumber: 5,
        title: 'Preliminary Square Base (Squash)',
        instruction: 'Bring all four corners together along the creases to form a compact square base.',
        creaseHighlightIndex: [4, 5, 6, 7],
        maxAngle: Math.PI
      },
      {
        stepNumber: 6,
        title: 'Petal Fold Flaps',
        instruction: 'Fold the outer edges toward the center vertical crease on front and back.',
        creaseHighlightIndex: [8, 9, 10, 11],
        maxAngle: Math.PI * 0.85
      },
      {
        stepNumber: 7,
        title: 'Reverse Fold Neck and Tail',
        instruction: 'Perform an inside reverse fold on both narrow bottom legs to raise the neck and tail.',
        creaseHighlightIndex: [12, 13],
        maxAngle: Math.PI * 0.75
      },
      {
        stepNumber: 8,
        title: 'Head Beak & Wing Spread',
        instruction: 'Inside reverse fold the neck tip to form the beak, then gently unfold wings outwards.',
        creaseHighlightIndex: [14, 15],
        maxAngle: Math.PI * 0.5
      }
    ]
  },
  {
    id: 'origami-box',
    name: 'Traditional Masu Box',
    difficulty: 'Beginner / Foundation',
    description: 'Rectangular self-locking origami box constructed using blintz folds and vertical rim walling.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: CreaseType.BORDER },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: CreaseType.BORDER },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: CreaseType.BORDER },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: CreaseType.BORDER },
      // Inner square base
      { x1: -25, y1: -25, x2: 25, y1: -25, type: CreaseType.VALLEY },
      { x1: 25, y1: -25, x2: 25, y2: 25, type: CreaseType.VALLEY },
      { x1: 25, y1: 25, x2: -25, y2: 25, type: CreaseType.VALLEY },
      { x1: -25, y1: 25, x2: -25, y2: -25, type: CreaseType.VALLEY },
      // Flap walls
      { x1: -50, y1: -25, x2: -25, y2: -25, type: CreaseType.MOUNTAIN },
      { x1: 25, y1: -25, x2: 50, y2: -25, type: CreaseType.MOUNTAIN },
      { x1: -50, y1: 25, x2: -25, y2: 25, type: CreaseType.MOUNTAIN },
      { x1: 25, y1: 25, x2: 50, y2: 25, type: CreaseType.MOUNTAIN },
      // Diagonals to corners
      { x1: -50, y1: -50, x2: -25, y2: -25, type: CreaseType.VALLEY },
      { x1: 50, y1: -50, x2: 25, y2: -25, type: CreaseType.VALLEY },
      { x1: 50, y1: 50, x2: 25, y2: 25, type: CreaseType.VALLEY },
      { x1: -50, y1: 50, x2: -25, y2: 25, type: CreaseType.VALLEY }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Flat Square Sheet',
        instruction: 'Position sheet flat on workspace.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Establish Base Boundary',
        instruction: 'Crease the inner 50% square defining the bottom of the container.',
        creaseHighlightIndex: [4, 5, 6, 7]
      },
      {
        stepNumber: 3,
        title: 'Erect Lateral Walls',
        instruction: 'Fold left and right flanks upward at 90 degrees.',
        creaseHighlightIndex: [7, 5]
      },
      {
        stepNumber: 4,
        title: 'Fold End Flaps & Interlock',
        instruction: 'Raise front and back walls, folding triangular dog-ears inwards over the rim to lock.',
        creaseHighlightIndex: [8, 9, 10, 11, 12, 13, 14, 15]
      }
    ]
  },
  {
    id: 'origami-fox',
    name: 'Geometric Fox Head',
    difficulty: 'Easy',
    description: 'Playful animal head origami illustrating asymmetric folds, ear flaring, and snout inversion.',
    paperSize: 100,
    creases: [
      { x1: -50, y1: -50, x2: 50, y1: -50, type: CreaseType.BORDER },
      { x1: 50, y1: -50, x2: 50, y2: 50, type: CreaseType.BORDER },
      { x1: 50, y1: 50, x2: -50, y2: 50, type: CreaseType.BORDER },
      { x1: -50, y1: 50, x2: -50, y2: -50, type: CreaseType.BORDER },
      { x1: -50, y1: -50, x2: 50, y2: 50, type: CreaseType.VALLEY },
      { x1: 0, y1: 0, x2: -50, y2: 50, type: CreaseType.VALLEY },
      { x1: 0, y1: 0, x2: 50, y2: -50, type: CreaseType.VALLEY },
      { x1: -25, y1: 25, x2: -50, y2: 0, type: CreaseType.MOUNTAIN },
      { x1: 25, y1: -25, x2: 0, y2: -50, type: CreaseType.MOUNTAIN }
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Square Sheet Preparation',
        instruction: 'Lay the paper diagonally in a diamond orientation.',
        creaseHighlightIndex: [0, 1, 2, 3]
      },
      {
        stepNumber: 2,
        title: 'Main Diagonal Fold',
        instruction: 'Fold in half diagonally to form a large triangle.',
        creaseHighlightIndex: [4]
      },
      {
        stepNumber: 3,
        title: 'Fold Ears Upward',
        instruction: 'Fold both side points upward towards the top apex at a slight outward angle.',
        creaseHighlightIndex: [5, 6]
      },
      {
        stepNumber: 4,
        title: 'Fold Snout Down & Open Center Layer',
        instruction: 'Fold the front top point down to form the muzzle and push middle leaf in for face contour.',
        creaseHighlightIndex: [7, 8]
      }
    ]
  }
];
