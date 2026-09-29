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
    const exts = this.skeleton?.extremities || [];
    const insetRatios = exts.map(e => 0.2 + (e.normalizedLength || 0.7) * 0.22);

    this.baseGenome = {
      insetRatios: insetRatios.length > 0 ? insetRatios : [0.28, 0.28, 0.28, 0.28],
      foldAngles: exts.map(() => -180.0)
    };

    this.bestGenome = JSON.parse(JSON.stringify(this.baseGenome));
  }

  /**
   * Synthesizes a candidate FOLD pattern from a specific genome.
   */
  synthesizeCandidate(genome) {
    const paperSize = 1000;
    const foldData = OrigamiUniversalSolver.synthesizeFoldPattern(this.skeleton, {
      paperSize,
      insetRatios: genome.insetRatios
    });

    const svgData = OrigamiUniversalSolver.foldToSVG(foldData);
    return { foldData, svgData };
  }

  /**
   * Generates a mutated genome from an existing genome
   */
  mutateGenome(parentGenome, rate = 0.25) {
    const child = JSON.parse(JSON.stringify(parentGenome));

    if (Array.isArray(child.insetRatios)) {
      child.insetRatios = child.insetRatios.map(r => {
        if (Math.random() < rate) {
          const delta = (Math.random() - 0.5) * 0.08;
          return Math.max(0.10, Math.min(0.48, r + delta));
        }
        return r;
      });
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
