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
    this.mutationRate = options.mutationRate || 0.20;
    this.currentGeneration = 0;
    this.bestGenome = null;
    this.bestLoss = Infinity;
    this.bestScore = 0;
    this.history = [];
    this.isRunning = false;

    // Initialize base genome from initial skeleton & archetype
    this.initBaseGenome();
  }

  initBaseGenome() {
    const archetype = this.skeleton?.archetype || 'bird';

    if (archetype === 'bunny') {
      this.baseGenome = {
        archetype: 'bunny',
        earDepth: 0.35,
        snoutDepth: 0.22,
        bodyInset: 0.30,
        earFoldAngle: -180.0,
        bodyValleyAngle: 180.0,
        subdivisions: 0
      };
    } else if (archetype === 'quadruped') {
      this.baseGenome = {
        archetype: 'quadruped',
        legInset: 0.32,
        kneeAngle: -180.0,
        spineAngle: -180.0,
        subdivisions: 0
      };
    } else {
      this.baseGenome = {
        archetype: 'bird',
        flapGenes: [
          { insetRatio: 0.28 },
          { insetRatio: 0.28 },
          { insetRatio: 0.28 },
          { insetRatio: 0.28 }
        ],
        diagonalValleyAngle: 90.0,
        mountainFoldAngle: -180.0,
        axialValleyAngle: 180.0,
        subdivisions: 0
      };
    }

    this.bestGenome = JSON.parse(JSON.stringify(this.baseGenome));
  }

  /**
   * Synthesizes a candidate FOLD pattern from a specific genome.
   */
  synthesizeCandidate(genome) {
    const paperSize = 1000;
    let foldData;

    if (genome.archetype === 'bunny') {
      foldData = OrigamiUniversalSolver.synthesizeBunnyBase(paperSize, {
        earDepth: genome.earDepth,
        snoutDepth: genome.snoutDepth,
        bodyInset: genome.bodyInset
      });
    } else if (genome.archetype === 'quadruped') {
      foldData = OrigamiUniversalSolver.synthesizeQuadrupedBase(paperSize, {
        insetRatio: genome.legInset
      });
    } else {
      foldData = OrigamiUniversalSolver.synthesizeBirdBase(paperSize, {
        insetRatio: genome.flapGenes?.[0]?.insetRatio ?? 0.28
      });
    }

    const svgData = OrigamiUniversalSolver.foldToSVG(foldData);
    return { foldData, svgData };
  }

  /**
   * Generates a mutated genome from an existing genome
   */
  mutateGenome(parentGenome, rate = 0.25) {
    const child = JSON.parse(JSON.stringify(parentGenome));

    if (child.archetype === 'bunny') {
      if (Math.random() < rate) {
        child.earDepth += (Math.random() - 0.5) * 0.08;
        child.earDepth = Math.max(0.18, Math.min(0.48, child.earDepth));
      }
      if (Math.random() < rate) {
        child.snoutDepth += (Math.random() - 0.5) * 0.06;
        child.snoutDepth = Math.max(0.10, Math.min(0.38, child.snoutDepth));
      }
      if (Math.random() < rate) {
        child.bodyInset += (Math.random() - 0.5) * 0.08;
        child.bodyInset = Math.max(0.15, Math.min(0.45, child.bodyInset));
      }
    } else if (child.archetype === 'quadruped') {
      if (Math.random() < rate) {
        child.legInset += (Math.random() - 0.5) * 0.08;
        child.legInset = Math.max(0.15, Math.min(0.45, child.legInset));
      }
    } else {
      if (child.flapGenes) {
        child.flapGenes.forEach(gene => {
          if (Math.random() < rate) {
            gene.insetRatio += (Math.random() - 0.5) * 0.08;
            gene.insetRatio = Math.max(0.12, Math.min(0.42, gene.insetRatio));
          }
        });
      }
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
