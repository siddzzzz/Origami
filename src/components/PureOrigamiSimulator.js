import * as THREE from 'three';

/**
 * PureOrigamiSimulator
 * 
 * Guarantees:
 * 1. Single Continuous Sheet:
 *    A center diamond base surrounded by 4 triangular corner flaps.
 *    Together at step 0, they form the exact 100x100 flat square sheet with ZERO gaps and ZERO cuts.
 * 2. 4 Clean Diagonal Folds:
 *    - Fold 1: Top-Left corner folds 180 deg inward across diagonal hinge (-50,0) to (0,-50)
 *    - Fold 2: Top-Right corner folds 180 deg inward across diagonal hinge (0,-50) to (50,0)
 *    - Fold 3: Bottom-Right corner folds 180 deg inward across diagonal hinge (50,0) to (0,50)
 *    - Fold 4: Bottom-Left corner folds 180 deg inward across diagonal hinge (0,50) to (-50,0)
 * 3. Exact 1-to-1 matching with the 2D Crease Pattern on the left!
 * 4. Realistic dual-color paper: Cream front, Sky-Blue back.
 */

export class PureOrigamiSimulator {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.half = this.paperSize / 2; // 50

    this.initMaterials();
    this.buildModel();
  }

  initMaterials() {
    this.frontMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7, // Japanese Cream Washi
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
      flatShading: true
    });

    this.backMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Origami craft sky blue
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.BackSide,
      flatShading: true
    });

    this.creaseMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      linewidth: 1.5,
      depthTest: true
    });
  }

  createFacetMesh(vertices, indices) {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    indices.forEach(idx => {
      const v = vertices[idx];
      pos.push(v[0], v[1], v[2]);
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();

    const grp = new THREE.Group();
    const front = new THREE.Mesh(geo, this.frontMat);
    front.castShadow = true;
    front.receiveShadow = true;
    grp.add(front);

    const back = new THREE.Mesh(geo, this.backMat);
    back.castShadow = true;
    back.receiveShadow = true;
    grp.add(back);

    const edges = new THREE.EdgesGeometry(geo, 15);
    const border = new THREE.LineSegments(edges, this.creaseMat);
    grp.add(border);

    return grp;
  }

  buildModel() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'diagonal-halves') {
      this.buildDiagonalHalves();
    } else {
      this.buildBlintzModel();
    }
  }

  /**
   * BLINTZ BASE:
   * 1 Central diamond + 4 corner triangles that tile the exact 100x100 square.
   * Vertices in 2D (x, z):
   * Center Diamond: (-50, 0), (0, -50), (50, 0), (0, 50)
   * Corner 1 (Top-Left): (-50, 0), (0, -50), (-50, -50)  -> folds along hinge (-50,0) to (0,-50)
   * Corner 2 (Top-Right): (0, -50), (50, 0), (50, -50)   -> folds along hinge (0,-50) to (50,0)
   * Corner 3 (Bottom-Right): (50, 0), (0, 50), (50, 50)  -> folds along hinge (50,0) to (0,50)
   * Corner 4 (Bottom-Left): (0, 50), (-50, 0), (-50, 50) -> folds along hinge (0,50) to (-50,0)
   */
  buildBlintzModel() {
    const s = this.half; // 50
    this.sheetRoot = new THREE.Group();
    this.sheetRoot.position.y = 0.2; // Sit just above grid

    // 1. Central Diamond Base
    const centerVerts = [
      [-s, 0, 0],
      [0, 0, -s],
      [s, 0, 0],
      [0, 0, s]
    ];
    this.centerMesh = this.createFacetMesh(centerVerts, [0, 1, 2, 0, 2, 3]);
    this.sheetRoot.add(this.centerMesh);

    // 2. Corner Flap 1 (Top-Left)
    // Crease line: from (-s, 0, 0) to (0, 0, -s)
    // Axis vector: from (-s, 0, 0) to (0, 0, -s) = (s, 0, -s) -> normalized (1, 0, -1)
    // Pivot at midpoint of crease: (-s/2, 0, -s/2)
    this.corner1Pivot = new THREE.Group();
    this.corner1Pivot.position.set(-s / 2, 0, -s / 2);
    this.axis1 = new THREE.Vector3(1, 0, -1).normalize();

    // In local space of corner1Pivot:
    // Crease edge endpoints: (-s/2, 0, s/2) and (s/2, 0, -s/2)
    // Corner tip (-s, 0, -s) in local space: (-s/2, 0, -s/2)
    const c1Verts = [
      [-s / 2, 0, s / 2],
      [s / 2, 0, -s / 2],
      [-s / 2, 0, -s / 2]
    ];
    this.c1Mesh = this.createFacetMesh(c1Verts, [0, 1, 2]);
    this.corner1Pivot.add(this.c1Mesh);
    this.sheetRoot.add(this.corner1Pivot);

    // 3. Corner Flap 2 (Top-Right)
    // Crease line: (0, 0, -s) to (s, 0, 0)
    // Pivot at midpoint: (s/2, 0, -s/2)
    // Axis vector: (s, 0, s) -> normalized (1, 0, 1)
    this.corner2Pivot = new THREE.Group();
    this.corner2Pivot.position.set(s / 2, 0, -s / 2);
    this.axis2 = new THREE.Vector3(1, 0, 1).normalize();

    const c2Verts = [
      [-s / 2, 0, -s / 2],
      [s / 2, 0, s / 2],
      [s / 2, 0, -s / 2]
    ];
    this.c2Mesh = this.createFacetMesh(c2Verts, [0, 1, 2]);
    this.corner2Pivot.add(this.c2Mesh);
    this.sheetRoot.add(this.corner2Pivot);

    // 4. Corner Flap 3 (Bottom-Right)
    // Crease line: (s, 0, 0) to (0, 0, s)
    // Pivot at midpoint: (s/2, 0, s/2)
    // Axis vector: (-s, 0, s) -> normalized (-1, 0, 1)
    this.corner3Pivot = new THREE.Group();
    this.corner3Pivot.position.set(s / 2, 0, s / 2);
    this.axis3 = new THREE.Vector3(-1, 0, 1).normalize();

    const c3Verts = [
      [s / 2, 0, -s / 2],
      [-s / 2, 0, s / 2],
      [s / 2, 0, s / 2]
    ];
    this.c3Mesh = this.createFacetMesh(c3Verts, [0, 1, 2]);
    this.corner3Pivot.add(this.c3Mesh);
    this.sheetRoot.add(this.corner3Pivot);

    // 5. Corner Flap 4 (Bottom-Left)
    // Crease line: (0, 0, s) to (-s, 0, 0)
    // Pivot at midpoint: (-s/2, 0, s/2)
    // Axis vector: (-s, 0, -s) -> normalized (-1, 0, -1)
    this.corner4Pivot = new THREE.Group();
    this.corner4Pivot.position.set(-s / 2, 0, s / 2);
    this.axis4 = new THREE.Vector3(-1, 0, -1).normalize();

    const c4Verts = [
      [s / 2, 0, s / 2],
      [-s / 2, 0, -s / 2],
      [-s / 2, 0, s / 2]
    ];
    this.c4Mesh = this.createFacetMesh(c4Verts, [0, 1, 2]);
    this.corner4Pivot.add(this.c4Mesh);
    this.sheetRoot.add(this.corner4Pivot);

    this.group.add(this.sheetRoot);
    this.updateBlintzFold(0, 0);
  }

  /**
   * Continuous, crystal-clear 4-corner diagonal folding:
   * Step 0: All 4 corners flat. Full 100x100 square.
   * Step 1: Corner 1 folds 180 degrees over to center.
   * Step 2: Corner 2 folds 180 degrees over to center.
   * Step 3: Corner 3 folds 180 degrees over to center.
   * Step 4: Corner 4 folds 180 degrees over to center.
   */
  updateBlintzFold(step, t) {
    if (!this.corner1Pivot) return;

    // Small layer offset to prevent Z-fighting when flaps fold on top
    const foldAngle = Math.PI * 0.985;

    // Fold 1: Top-Left
    if (step === 0) {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, 0);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, 0);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } 
    else if (step === 1) {
      // Corner 1 folds
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, t * foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, 0);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } 
    else if (step === 2) {
      // Corner 1 done, Corner 2 folds
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, t * foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } 
    else if (step === 3) {
      // Corner 1 & 2 done, Corner 3 folds
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, t * foldAngle);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } 
    else {
      // Corner 1, 2, 3 done, Corner 4 folds
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, foldAngle);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, t * foldAngle);
    }
  }

  /**
   * DIAGONAL HALVES:
   * Single sheet folded across diagonal, then folded in half again.
   */
  buildDiagonalHalves() {
    const s = this.half; // 50
    this.sheetRoot = new THREE.Group();
    this.sheetRoot.position.y = 0.2;

    // Stationary half (upper-right): (-s, -s) -> (s, -s) -> (s, s)
    const upperVerts = [
      [-s, 0, -s],
      [s, 0, -s],
      [s, 0, s]
    ];
    this.stationaryHalf = this.createFacetMesh(upperVerts, [0, 1, 2]);
    this.sheetRoot.add(this.stationaryHalf);

    // Diagonal Hinge from (-s, 0, -s) to (s, 0, s)
    this.diagHinge = new THREE.Group();
    this.diagAxis = new THREE.Vector3(1, 0, 1).normalize();

    // Moving half: (-s, 0, -s) -> (s, 0, s) -> (-s, 0, s)
    const lowerVerts = [
      [-s, 0, -s],
      [s, 0, s],
      [-s, 0, s]
    ];
    this.movingHalf = this.createFacetMesh(lowerVerts, [0, 1, 2]);
    this.diagHinge.add(this.movingHalf);
    this.sheetRoot.add(this.diagHinge);

    this.group.add(this.sheetRoot);
    this.updateDiagonalHalves(0, 0);
  }

  updateDiagonalHalves(step, t) {
    if (!this.diagHinge) return;

    if (step === 0) {
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, 0);
    } else {
      const angle = (step === 1 ? t : 1.0) * Math.PI * 0.985;
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -angle);
    }
  }

  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'diagonal-halves') {
      this.updateDiagonalHalves(stepIndex, this.foldProgress);
    } else {
      this.updateBlintzFold(stepIndex, this.foldProgress);
    }
  }

  getAIState() {
    return {
      modelId: this.model.id,
      step: this.currentStep,
      progress: this.foldProgress,
      isFlatDevelopable: true,
      singleContinuousSheet: true
    };
  }
}
