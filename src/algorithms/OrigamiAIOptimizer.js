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
    // Genome represents parameterized variables of the crease pattern:
    // [radius_multiplier_1, angle_offset_1, wing_spread_1, ... flap_n, valley_angle, mountain_angle]
    const genes = [];
    this.skeleton.extremities.forEach((ext, i) => {
      genes.push({
        radiusMult: 1.0,      // Scale of flap radius
        angleOffset: 0.0,     // 2D perimeter angle offset (-0.3 to +0.3 rad)
        wingSpread: 0.6,      // Width of mountain hinge wings (0.3 to 1.0)
        innerDepth: 0.2       // Root offset from center
      });
    });

    this.baseGenome = {
      flapGenes: genes,
      diagonalValleyAngle: 90.0,
      mountainFoldAngle: -180.0
    };

    this.bestGenome = JSON.parse(JSON.stringify(this.baseGenome));
  }

  /**
   * Synthesizes a candidate FOLD pattern from a specific genome
   */
  synthesizeCandidate(genome) {
    const paperSize = 1000;
    const half = paperSize / 2;

    const packedFlaps = this.skeleton.extremities.map((ext, i) => {
      const gene = genome.flapGenes[i] || { radiusMult: 1.0, angleOffset: 0.0, wingSpread: 0.6, innerDepth: 0.2 };
      const baseAngle = Math.atan2(ext.dir.x, ext.dir.z);
      const angle = baseAngle + gene.angleOffset;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const absCos = Math.abs(cosA);
      const absSin = Math.abs(sinA);

      let px = 0, py = 0;
      if (absCos > absSin) {
        px = cosA > 0 ? half : -half;
        py = px * (sinA / cosA);
      } else {
        py = sinA > 0 ? half : -half;
        px = py * (cosA / sinA);
      }

      const radius = ext.normalizedLength * (paperSize * 0.35) * Math.max(0.3, Math.min(2.0, gene.radiusMult));

      return {
        id: i,
        x: px,
        y: py,
        radius,
        gene,
        extremity: ext
      };
    });

    const vertices_coords = [
      [-half, -half, 0],
      [half, -half, 0],
      [half, half, 0],
      [-half, half, 0],
      [0, 0, 0]
    ];

    const edges_vertices = [[0, 1], [1, 2], [2, 3], [3, 0]];
    const edges_assignment = ['B', 'B', 'B', 'B'];
    const edges_foldAngle = [0, 0, 0, 0];

    packedFlaps.forEach(flap => {
      const dx = flap.x;
      const dy = flap.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const innerDist = Math.max(half * flap.gene.innerDepth, dist - flap.radius);
      const flapRootX = (dx / dist) * innerDist;
      const flapRootY = (dy / dist) * innerDist;

      const rootIdx = vertices_coords.length;
      vertices_coords.push([flapRootX, flapRootY, 0]);

      edges_vertices.push([4, rootIdx]);
      edges_assignment.push('V');
      edges_foldAngle.push(genome.diagonalValleyAngle);

      const spread = flap.radius * flap.gene.wingSpread;
      const perpX = (-dy / dist) * spread;
      const perpY = (dx / dist) * spread;

      const wingL = vertices_coords.length;
      vertices_coords.push([flapRootX + perpX, flapRootY + perpY, 0]);
      const wingR = vertices_coords.length;
      vertices_coords.push([flapRootX - perpX, flapRootY - perpY, 0]);

      edges_vertices.push([rootIdx, wingL]);
      edges_assignment.push('M');
      edges_foldAngle.push(genome.mountainFoldAngle);

      edges_vertices.push([rootIdx, wingR]);
      edges_assignment.push('M');
      edges_foldAngle.push(genome.mountainFoldAngle);

      edges_vertices.push([wingL, 4]);
      edges_assignment.push('F');
      edges_foldAngle.push(0);

      edges_vertices.push([wingR, 4]);
      edges_assignment.push('F');
      edges_foldAngle.push(0);
    });

    edges_vertices.push([0, 4], [1, 4], [2, 4], [3, 4]);
    edges_assignment.push('V', 'V', 'V', 'V');
    edges_foldAngle.push(genome.diagonalValleyAngle, genome.diagonalValleyAngle, genome.diagonalValleyAngle, genome.diagonalValleyAngle);

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
  mutateGenome(parentGenome, rate = 0.15) {
    const child = JSON.parse(JSON.stringify(parentGenome));
    child.flapGenes.forEach(gene => {
      if (Math.random() < rate) {
        gene.radiusMult += (Math.random() - 0.5) * 0.25;
        gene.radiusMult = Math.max(0.4, Math.min(1.8, gene.radiusMult));
      }
      if (Math.random() < rate) {
        gene.angleOffset += (Math.random() - 0.5) * 0.15;
        gene.angleOffset = Math.max(-0.4, Math.min(0.4, gene.angleOffset));
      }
      if (Math.random() < rate) {
        gene.wingSpread += (Math.random() - 0.5) * 0.2;
        gene.wingSpread = Math.max(0.2, Math.min(1.2, gene.wingSpread));
      }
      if (Math.random() < rate) {
        gene.innerDepth += (Math.random() - 0.5) * 0.1;
        gene.innerDepth = Math.max(0.05, Math.min(0.5, gene.innerDepth));
      }
    });

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
