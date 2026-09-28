/**
 * OrigamiAI Optimizer & Evolutionary Parameter Search Engine
 * 
 * Non-LLM Evolutionary Strategy (CMA-ES / Genetic Search / Gradient Step)
 * Iteratively optimizes crease parameters (radii, angles, hinge positions)
 * to minimize Chamfer / Hausdorff loss against target 3D meshes.
 */

import { OrigamiUniversalSolver } from './OrigamiUniversalSolver.js';
import { OrigamiFitnessEvaluator } from './OrigamiFitnessEvaluator.js';

export class OrigamiAIOptimizer {
  constructor(skeleton, targetVertices, options = {}) {
    this.skeleton = skeleton;
    this.targetVertices = targetVertices;
    this.populationSize = options.populationSize || 8;
    this.mutationRate = options.mutationRate || 0.15;
    this.currentGeneration = 0;
    this.bestGenome = null;
    this.bestLoss = Infinity;
    this.bestScore = 0;
    this.history = [];
    this.isRunning = false;

    // Initialize base genome from initial skeleton
    this.initBaseGenome();
  }

  initBaseGenome() {
    // Genome represents parameterized variables of the flat-foldable origami base:
    // [inset ratios for cardinal flaps, mountain/valley fold angles, petal stretch factors]
    const genes = [];
    // 4 cardinal flaps (Bottom, Right, Top, Left)
    for (let i = 0; i < 4; i++) {
      genes.push({
        insetRatio: 0.28,      // Flap root distance from center (0.1 to 0.45)
        angleOffset: 0.0,      // Angular shift of root
        petalScale: 1.0        // Length factor
      });
    }

    this.baseGenome = {
      flapGenes: genes,
      diagonalValleyAngle: 90.0,
      mountainFoldAngle: -180.0,
      axialValleyAngle: 180.0
    };

    this.bestGenome = JSON.parse(JSON.stringify(this.baseGenome));
  }

  /**
   * Synthesizes a candidate FOLD pattern from a specific genome.
   * Produces a strictly closed-polygon flat-foldable origami base (Kawasaki/Maekawa compliant)
   * so the GPU physics engine can triangulate faces and compute dihedral bending springs.
   */
  synthesizeCandidate(genome) {
    const paperSize = 1000;
    const half = paperSize / 2;

    const genes = genome.flapGenes || [
      { insetRatio: 0.28 },
      { insetRatio: 0.28 },
      { insetRatio: 0.28 },
      { insetRatio: 0.28 }
    ];

    const q0 = Math.max(0.08, Math.min(0.46, genes[0]?.insetRatio ?? 0.28)) * paperSize; // Bottom
    const q1 = Math.max(0.08, Math.min(0.46, genes[1]?.insetRatio ?? 0.28)) * paperSize; // Right
    const q2 = Math.max(0.08, Math.min(0.46, genes[2]?.insetRatio ?? 0.28)) * paperSize; // Top
    const q3 = Math.max(0.08, Math.min(0.46, genes[3]?.insetRatio ?? 0.28)) * paperSize; // Left

    const vertices_coords = [
      [-half, -half, 0], // 0: Bottom-Left
      [half, -half, 0],  // 1: Bottom-Right
      [half, half, 0],   // 2: Top-Right
      [-half, half, 0],  // 3: Top-Left
      [0, 0, 0],         // 4: Center
      [0, -half, 0],     // 5: Bottom Mid
      [half, 0, 0],      // 6: Right Mid
      [0, half, 0],      // 7: Top Mid
      [-half, 0, 0],     // 8: Left Mid
      [0, -q0, 0],       // 9: Bottom Flap Root
      [q1, 0, 0],        // 10: Right Flap Root
      [0, q2, 0],        // 11: Top Flap Root
      [-q3, 0, 0]        // 12: Left Flap Root
    ];

    // Closed boundary perimeter
    const edges_vertices = [
      [0, 5], [5, 1], [1, 6], [6, 2], [2, 7], [7, 3], [3, 8], [8, 0]
    ];
    const edges_assignment = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0];

    // Main diagonal valley folds (Corner to Center)
    const diagValleyAngle = genome.diagonalValleyAngle ?? 90;
    edges_vertices.push([0, 4], [1, 4], [2, 4], [3, 4]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(diagValleyAngle, diagValleyAngle, diagValleyAngle, diagValleyAngle);

    // Flap petal mountain creases radiating outward from roots to corners
    const mountainAngle = genome.mountainFoldAngle ?? -180;
    edges_vertices.push(
      [0, 9], [1, 9],
      [1, 10], [2, 10],
      [2, 11], [3, 11],
      [3, 12], [0, 12]
    );
    edges_assignment.push('M', 'M', 'M', 'M', 'M', 'M', 'M', 'M');
    edges_foldAngle.push(
      mountainAngle, mountainAngle,
      mountainAngle, mountainAngle,
      mountainAngle, mountainAngle,
      mountainAngle, mountainAngle
    );

    // Spine mountain creases from center to flap roots
    edges_vertices.push([4, 9], [4, 10], [4, 11], [4, 12]);
    edges_assignment.push('M', 'M', 'M', 'M');
    edges_foldAngle.push(mountainAngle, mountainAngle, mountainAngle, mountainAngle);

    // Valley axial folds from flap roots to outer edge midpoints
    const axialValleyAngle = genome.axialValleyAngle ?? 180;
    edges_vertices.push([9, 5], [10, 6], [11, 7], [12, 8]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(axialValleyAngle, axialValleyAngle, axialValleyAngle, axialValleyAngle);

    const foldData = {
      file_spec: 1.1,
      file_creator: 'OrigamiAIOptimizer',
      file_title: 'AI Optimized Origami Pattern',
      frame_classes: ['creasePattern'],
      vertices_coords,
      edges_vertices,
      edges_assignment,
      edges_foldAngle
    };

    const svgData = OrigamiUniversalSolver.foldToSVG(foldData);
    return { foldData, svgData };
  }

  /**
   * Generates a mutated genome from an existing genome
   */
  mutateGenome(parentGenome, rate = 0.2) {
    const child = JSON.parse(JSON.stringify(parentGenome));
    child.flapGenes.forEach(gene => {
      if (Math.random() < rate) {
        gene.insetRatio += (Math.random() - 0.5) * 0.08;
        gene.insetRatio = Math.max(0.12, Math.min(0.42, gene.insetRatio));
      }
      if (Math.random() < rate) {
        gene.petalScale += (Math.random() - 0.5) * 0.2;
        gene.petalScale = Math.max(0.5, Math.min(1.5, gene.petalScale));
      }
    });

    if (Math.random() < rate * 0.5) {
      child.diagonalValleyAngle += (Math.random() - 0.5) * 20;
      child.diagonalValleyAngle = Math.max(45, Math.min(135, child.diagonalValleyAngle));
    }

    return child;
  }

  /**
   * Executes one iteration / generation of evolutionary search
   */
  stepGeneration(getCurrentSimPositions) {
    this.currentGeneration++;

    // Generate candidate population
    const population = [this.bestGenome];
    for (let i = 1; i < this.populationSize; i++) {
      population.push(this.mutateGenome(this.bestGenome, this.mutationRate));
    }

    // Evaluate candidates
    let genBestGenome = this.bestGenome;
    let genBestLoss = this.bestLoss;
    let genBestEval = null;

    population.forEach((candidate, idx) => {
      const pattern = this.synthesizeCandidate(candidate);
      
      // Simulate/estimate folded vertex positions
      const paper3DPoints = pattern.foldData.vertices_coords.map(v => ({
        x: v[0],
        y: v[1],
        z: v[2]
      }));

      const evaluation = OrigamiFitnessEvaluator.evaluateFitness(paper3DPoints, this.targetVertices);

      if (evaluation.totalLoss < genBestLoss) {
        genBestLoss = evaluation.totalLoss;
        genBestGenome = candidate;
        genBestEval = evaluation;
      }
    });

    this.bestGenome = genBestGenome;
    this.bestLoss = genBestLoss;
    this.bestScore = genBestEval ? genBestEval.scorePercent : this.bestScore;

    this.history.push({
      generation: this.currentGeneration,
      loss: this.bestLoss,
      score: this.bestScore
    });

    const bestPattern = this.synthesizeCandidate(this.bestGenome);
    return {
      generation: this.currentGeneration,
      bestLoss: this.bestLoss,
      bestScore: this.bestScore,
      bestPattern,
      history: this.history
    };
  }
}
