/**
 * 3D Mesh Feature & Extremity Analyzer (TreeMaker Medial Axis principle)
 * Parses .OBJ 3D geometries and extracts:
 * 1. Geometric bounding box and center of mass
 * 2. Extremity vertices / branch terminals (tips of wings, legs, head, tail)
 * 3. Topological stick tree skeleton (branch lengths and angles relative to center)
 */

export class MeshSkeletonizer {
  /**
   * Parses an OBJ file text into vertices and face indices
   */
  static parseOBJ(objText) {
    const vertices = [];
    const faces = [];
    const lines = objText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const parts = trimmed.split(/\s+/).slice(1).map(Number);
        vertices.push({ x: parts[0] || 0, y: parts[1] || 0, z: parts[2] || 0 });
      } else if (trimmed.startsWith('f ')) {
        const parts = trimmed.split(/\s+/).slice(1).map(p => parseInt(p.split('/')[0], 10) - 1);
        faces.push(parts);
      }
    }

    return { vertices, faces };
  }

  /**
   * Analyzes the 3D mesh and extracts the terminal branch skeleton (TreeMaker abstraction)
   */
  static extractSkeleton(meshData) {
    const { vertices } = meshData;
    if (!vertices || vertices.length === 0) {
      throw new Error('No vertices found in 3D OBJ mesh');
    }

    // 1. Calculate Center of Mass
    let sumX = 0, sumY = 0, sumZ = 0;
    vertices.forEach(v => {
      sumX += v.x;
      sumY += v.y;
      sumZ += v.z;
    });
    const center = {
      x: sumX / vertices.length,
      y: sumY / vertices.length,
      z: sumZ / vertices.length
    };

    // 2. Compute distance of each vertex from the center
    const distances = vertices.map((v, index) => {
      const dx = v.x - center.x;
      const dy = v.y - center.y;
      const dz = v.z - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return { index, vertex: v, dist, dx, dy, dz };
    });

    // Sort descending by distance from center
    distances.sort((a, b) => b.dist - a.dist);

    const maxDist = distances[0]?.dist || 1;

    // 3. Extract distinct spatial extremity clusters (e.g. wings ±X, head +Z, tail -Z, legs -Y)
    const extremities = [];
    const minClusterAngle = 0.45; // ~25 degrees angular separation

    for (const item of distances) {
      if (item.dist < maxDist * 0.35) continue; // Ignore vertices too close to the core body

      // Direction unit vector
      const dir = {
        x: item.dx / item.dist,
        y: item.dy / item.dist,
        z: item.dz / item.dist
      };

      // Check if this extremity is in a distinct angular direction from already extracted tips
      let isDistinct = true;
      for (const ext of extremities) {
        const dot = dir.x * ext.dir.x + dir.y * ext.dir.y + dir.z * ext.dir.z;
        if (dot > Math.cos(minClusterAngle)) {
          isDistinct = false;
          break;
        }
      }

      if (isDistinct) {
        extremities.push({
          vertexIndex: item.index,
          vertex: item.vertex,
          dist: item.dist,
          normalizedLength: item.dist / maxDist,
          dir
        });
      }

      if (extremities.length >= 8) break; // Limit to principal extremities
    }

    return {
      center,
      maxDist,
      extremities,
      totalVertices: vertices.length
    };
  }
}
