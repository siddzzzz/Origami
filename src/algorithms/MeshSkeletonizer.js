/**
 * 3D Mesh Feature & Extremity Analyzer (TreeMaker Medial Axis principle)
 * Parses .OBJ 3D geometries and extracts:
 * 1. Geometric bounding box and center of mass
 * 2. Extremity vertices / branch terminals (tips of wings, legs, head, tail)
 * 3. Topological stick tree skeleton (branch lengths and angles relative to center)
 * 4. Morphological classification across 8 structural origami base families
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
   * Analyzes the 3D mesh and extracts its stick skeleton tree & morphological base:
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
    const minClusterAngle = 0.35; // ~20 degrees angular separation

    for (const item of distances) {
      if (item.dist < maxDist * 0.25) continue;

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

      if (extremities.length >= 12) break;
    }

    // 3. Map extremities onto 2D perimeter angles and normalized flap radii
    extremities.forEach((ext, i) => {
      const azimuth = Math.atan2(ext.dir.x, ext.dir.z);
      const elevation = Math.asin(Math.max(-1, Math.min(1, ext.dir.y)));
      ext.azimuth = azimuth;
      ext.elevation = elevation;
      ext.index = i;
    });

    const skeleton = {
      center,
      maxDist,
      extremities,
      proportions: { spanX, spanY, spanZ },
      bounds: { minX, maxX, minY, maxY, minZ, maxZ },
      totalVertices: vertices.length
    };
    skeleton.morphology = MeshSkeletonizer.detectMorphology(meshData, skeleton);
    return skeleton;
  }

  /**
   * Identifies 3D morphological class across the 8 structural origami base families:
   * - 'box_pleat': Prismatic, cubical, or architectural box forms
   * - 'miura_corrugation': Cylindrical, conical, or rotational vases/shells
   * - 'fish': Streamlined, aquatic, aerodynamic (Z-elongated with snout + tail)
   * - 'frog': 8-flap multilimbed amphibians, frogs, spiders, quadrupeds
   * - 'bird': Broad lateral wings (±X) with head & tail
   * - 'bunny': Upright dorsal ear spikes (+Y) with compact crouching body
   * - 'pyramid': Single elevated apex with radial polygon base
   * - 'treemaker': General arbitrary branching stick tree
   */
  static detectMorphology(meshData, skeleton) {
    const { extremities = [], proportions = {}, bounds = {} } = skeleton;
    const { spanX = 1, spanY = 1, spanZ = 1 } = proportions;
    const { vertices = [] } = meshData;

    // 1. Check for Box-Pleating: Cubical / Boxy / Low vertex counts with 90° planar bounds
    const isCubic = Math.abs(spanX - spanY) / spanX < 0.25 && Math.abs(spanY - spanZ) / spanY < 0.25;
    if (vertices.length <= 16 && isCubic) {
      return 'box_pleat';
    }

    // 2. Check for Miura-Ori Corrugation: Cylindrical / Vase shells (high Y elongation with circular XZ cross section)
    const isCylinder = spanY > spanX * 1.1 && Math.abs(spanX - spanZ) / Math.max(spanX, spanZ) < 0.28;
    if (isCylinder && extremities.length >= 6) {
      return 'miura_corrugation';
    }

    // 3. Check for Fish / Kite Base: Streamlined, elongated along Z with anterior snout and posterior tail
    const isStreamlined = spanZ > spanX * 1.25 && spanZ > spanY * 1.1;
    const hasFrontSnout = extremities.some(e => e.dir.z > 0.75);
    const hasRearTail = extremities.some(e => e.dir.z < -0.75);
    if (isStreamlined && hasFrontSnout && hasRearTail) {
      return 'fish';
    }

    // 4. Check for Star / Pyramid: Dominant top apex (+Y > 0.7) with radial symmetric base
    const topApexes = extremities.filter(e => e.dir.y > 0.7);
    if (topApexes.length === 1 && extremities.length <= 6 && Math.abs(spanX - spanZ) / Math.max(spanX, spanZ) < 0.35) {
      return 'pyramid';
    }

    // 5. Check for Bunny: Two tall dorsal ears (+Y > 0.75) with compact body
    const tallEars = extremities.filter(e => e.dir.y > 0.75);
    if (tallEars.length >= 2 || (extremities.some(e => e.dir.y > 0.85) && spanY > spanX * 0.70)) {
      return 'bunny';
    }

    // 6. Check for Frog / Multilimbed (>= 3 ground limbs or multi-limb extremities)
    const groundLegs = extremities.filter(e => e.dir.y < -0.30);
    if (groundLegs.length >= 3 || extremities.length >= 6) {
      return 'frog';
    }

    // 7. Check for Bird: Dominant lateral span / wings (±X > 0.6)
    const wings = extremities.filter(e => Math.abs(e.dir.x) > 0.6);
    if (wings.length >= 2 || (spanX > spanY * 1.3 && spanX > spanZ * 1.1)) {
      return 'bird';
    }

    // 8. General TreeMaker Medial-Axis Base for arbitrary 3D trees
    return 'treemaker';
  }
}
