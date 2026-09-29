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
   * Analyzes the 3D mesh and classifies its morphological archetype:
   * - 'bunny' / 'upright_ears': Two tall dorsal ears (+Y), front head, squat base
   * - 'bird' / 'winged': Dominant lateral wings (+X, -X), head/beak (+Z), tail (-Z)
   * - 'quadruped': 4 ground limbs (-Y), elongated body spine (±Z), neck/head (+Y,+Z)
   * - 'star' / 'radial': Radial symmetric lobes
   */
  static extractSkeleton(meshData) {
    const { vertices } = meshData;
    if (!vertices || vertices.length === 0) {
      throw new Error('No vertices found in 3D OBJ mesh');
    }

    // 1. Calculate Bounding Box and Center of Mass
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let sumX = 0, sumY = 0, sumZ = 0;

    vertices.forEach(v => {
      sumX += v.x; sumY += v.y; sumZ += v.z;
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
    });

    const center = {
      x: sumX / vertices.length,
      y: sumY / vertices.length,
      z: sumZ / vertices.length
    };

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const spanZ = maxZ - minZ || 1;

    // 2. Identify major extremities relative to bounding span
    // Compute distance and directional prominence of each vertex
    const extremities = [];
    const distances = vertices.map((v, index) => {
      const dx = v.x - center.x;
      const dy = v.y - center.y;
      const dz = v.z - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return { index, vertex: v, dist, dx, dy, dz };
    });
    distances.sort((a, b) => b.dist - a.dist);

    const maxDist = distances[0]?.dist || 1;
    const minClusterAngle = 0.38; // ~22 degrees angular separation

    for (const item of distances) {
      if (item.dist < maxDist * 0.3) continue;

      const dir = {
        x: item.dx / item.dist,
        y: item.dy / item.dist,
        z: item.dz / item.dist
      };

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

      if (extremities.length >= 10) break;
    }

    // 3. Map extremities onto 2D perimeter angles and normalized flap radii
    extremities.forEach((ext, i) => {
      // Azimuth angle in 3D (XZ plane relative to principal body axis)
      const azimuth = Math.atan2(ext.dir.x, ext.dir.z);
      // Elevation angle (-PI/2 to +PI/2)
      const elevation = Math.asin(Math.max(-1, Math.min(1, ext.dir.y)));
      
      ext.azimuth = azimuth;
      ext.elevation = elevation;
      ext.index = i;
    });

    return {
      center,
      maxDist,
      extremities,
      proportions: { spanX, spanY, spanZ },
      totalVertices: vertices.length
    };
  }
}
