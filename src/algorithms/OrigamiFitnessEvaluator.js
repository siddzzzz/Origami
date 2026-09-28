/**
 * OrigamiAI Fitness & Loss Evaluator (The AI Objective Function)
 * 
 * Computes the mathematical loss/fitness score between:
 * 1. The Folded 3D Paper Mesh (from the simulation engine)
 * 2. The Target 3D .OBJ Mesh (hull/extremities)
 * 
 * Components of Total Loss:
 * Loss = w_chamfer * L_chamfer + w_hausdorff * L_hausdorff + w_regularization * L_physics
 */

export class OrigamiFitnessEvaluator {
  /**
   * Evaluates the Chamfer & Hausdorff geometric distance between 
   * simulation 3D vertices and target 3D mesh vertices.
   * 
   * @param {Array<{x, y, z}>} paperVertices - Current 3D folded node positions of the paper sheet
   * @param {Array<{x, y, z}>} targetVertices - 3D vertices of the uploaded target .OBJ mesh
   * @param {Object} options - Weights and metrics configuration
   * @returns {Object} Comprehensive evaluation metrics & loss breakdown
   */
  static evaluateFitness(paperVertices, targetVertices, options = {}) {
    if (!paperVertices || paperVertices.length === 0 || !targetVertices || targetVertices.length === 0) {
      return { totalLoss: 1.0, chamferLoss: 1.0, hausdorffLoss: 1.0, scorePercent: 0 };
    }

    const weights = {
      chamfer: options.w_chamfer ?? 0.65,
      hausdorff: options.w_hausdorff ?? 0.25,
      regularization: options.w_reg ?? 0.10,
      ...options
    };

    // 1. Normalize and center both point clouds to standard [-1, 1] unit sphere for fair scale-invariant comparison
    const normPaper = this.normalizePointCloud(paperVertices);
    const normTarget = this.normalizePointCloud(targetVertices);

    // 2. Compute Forward Chamfer (Paper -> Target)
    let sumDistPaperToTarget = 0;
    let maxDistPaperToTarget = 0;
    const paperErrors = [];

    for (let i = 0; i < normPaper.points.length; i++) {
      const p = normPaper.points[i];
      let minDistSq = Infinity;

      for (let j = 0; j < normTarget.points.length; j++) {
        const t = normTarget.points[j];
        const dx = p.x - t.x;
        const dy = p.y - t.y;
        const dz = p.z - t.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < minDistSq) minDistSq = distSq;
      }

      const dist = Math.sqrt(minDistSq);
      paperErrors.push(dist);
      sumDistPaperToTarget += dist;
      if (dist > maxDistPaperToTarget) maxDistPaperToTarget = dist;
    }
    const forwardChamfer = sumDistPaperToTarget / normPaper.points.length;

    // 3. Compute Backward Chamfer (Target -> Paper)
    let sumDistTargetToPaper = 0;
    let maxDistTargetToPaper = 0;

    for (let j = 0; j < normTarget.points.length; j++) {
      const t = normTarget.points[j];
      let minDistSq = Infinity;

      for (let i = 0; i < normPaper.points.length; i++) {
        const p = normPaper.points[i];
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dz = t.z - p.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < minDistSq) minDistSq = distSq;
      }

      const dist = Math.sqrt(minDistSq);
      sumDistTargetToPaper += dist;
      if (dist > maxDistTargetToPaper) maxDistTargetToPaper = dist;
    }
    const backwardChamfer = sumDistTargetToPaper / normTarget.points.length;

    // 4. Combined Metrics
    const chamferLoss = (forwardChamfer + backwardChamfer) / 2;
    const hausdorffLoss = Math.max(maxDistPaperToTarget, maxDistTargetToPaper);

    // 5. Total Weighted Loss & Normalized Score (0% to 100%)
    const rawLoss = weights.chamfer * chamferLoss + weights.hausdorff * (hausdorffLoss * 0.5);
    const totalLoss = Math.min(1.0, Math.max(0.0, rawLoss));
    const scorePercent = Math.max(0, Math.min(100, Math.round((1.0 - totalLoss) * 100)));

    return {
      totalLoss,
      chamferLoss,
      forwardChamfer,
      backwardChamfer,
      hausdorffLoss,
      scorePercent,
      paperErrors, // Per-vertex error for visual heatmaps
      normalizedPaper: normPaper,
      normalizedTarget: normTarget
    };
  }

  /**
   * Centers point cloud at its centroid and normalizes by its bounding radius
   */
  static normalizePointCloud(points) {
    if (!points || points.length === 0) return { points: [], center: { x: 0, y: 0, z: 0 }, radius: 1 };

    let sumX = 0, sumY = 0, sumZ = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumZ += p.z;
    }
    const center = {
      x: sumX / points.length,
      y: sumY / points.length,
      z: sumZ / points.length
    };

    let maxDistSq = 0;
    const centered = points.map(p => {
      const cx = p.x - center.x;
      const cy = p.y - center.y;
      const cz = p.z - center.z;
      const distSq = cx * cx + cy * cy + cz * cz;
      if (distSq > maxDistSq) maxDistSq = distSq;
      return { x: cx, y: cy, z: cz };
    });

    const radius = Math.max(0.0001, Math.sqrt(maxDistSq));
    const normalized = centered.map(p => ({
      x: p.x / radius,
      y: p.y / radius,
      z: p.z / radius
    }));

    return {
      points: normalized,
      center,
      radius
    };
  }
}
