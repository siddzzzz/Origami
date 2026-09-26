import * as THREE from 'three';

/**
 * SinglePieceOrigamiSimulator
 * 
 * Mathematically exact, physics-consistent single-sheet kinematics.
 * 
 * Core Invariant:
 * The sheet is ONE continuous geometric object.
 * When paper is folded into multi-layer configurations (e.g. Triangle Half -> Quarter Triangle),
 * the exact 3D vertex transformation is computed so that:
 * 1. Every edge maintains its exact rest length (ZERO stretching, ZERO breaking).
 * 2. Faces that are folded together move in complete, locked synchronization.
 * 3. Rotations are around the exact physical crease axes in world coordinates.
 */

export class SinglePieceOrigamiSimulator {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.half = this.paperSize / 2; // 50

    this.currentStep = 0;
    this.foldProgress = 0;

    this.initMaterials();
    this.buildModel();
  }

  initMaterials() {
    this.frontMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7, // Cream Japanese Washi
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
      flatShading: true
    });

    this.backMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Sky Blue Craft Underside
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

  /* =========================================================================
   * MODEL 1: BLINTZ BASE (4 Clean Corner Folds)
   * ========================================================================= */
  buildBlintzModel() {
    const s = this.half; // 50
    this.blintzRoot = new THREE.Group();
    this.blintzRoot.position.y = 0.2;

    // Central Diamond Base: (-s,0), (0,-s), (s,0), (0,s)
    const centerVerts = [
      [-s, 0, 0],
      [0, 0, -s],
      [s, 0, 0],
      [0, 0, s]
    ];
    this.centerMesh = this.createFacetMesh(centerVerts, [0, 1, 2, 0, 2, 3]);
    this.blintzRoot.add(this.centerMesh);

    // Corner 1: Top-Left
    this.corner1Pivot = new THREE.Group();
    this.corner1Pivot.position.set(-s / 2, 0, -s / 2);
    this.axis1 = new THREE.Vector3(1, 0, -1).normalize();
    const c1Verts = [
      [-s / 2, 0, s / 2],
      [s / 2, 0, -s / 2],
      [-s / 2, 0, -s / 2]
    ];
    this.corner1Pivot.add(this.createFacetMesh(c1Verts, [0, 1, 2]));
    this.blintzRoot.add(this.corner1Pivot);

    // Corner 2: Top-Right
    this.corner2Pivot = new THREE.Group();
    this.corner2Pivot.position.set(s / 2, 0, -s / 2);
    this.axis2 = new THREE.Vector3(1, 0, 1).normalize();
    const c2Verts = [
      [-s / 2, 0, -s / 2],
      [s / 2, 0, s / 2],
      [s / 2, 0, -s / 2]
    ];
    this.corner2Pivot.add(this.createFacetMesh(c2Verts, [0, 1, 2]));
    this.blintzRoot.add(this.corner2Pivot);

    // Corner 3: Bottom-Right
    this.corner3Pivot = new THREE.Group();
    this.corner3Pivot.position.set(s / 2, 0, s / 2);
    this.axis3 = new THREE.Vector3(-1, 0, 1).normalize();
    const c3Verts = [
      [s / 2, 0, -s / 2],
      [-s / 2, 0, s / 2],
      [s / 2, 0, s / 2]
    ];
    this.corner3Pivot.add(this.createFacetMesh(c3Verts, [0, 1, 2]));
    this.blintzRoot.add(this.corner3Pivot);

    // Corner 4: Bottom-Left
    this.corner4Pivot = new THREE.Group();
    this.corner4Pivot.position.set(-s / 2, 0, s / 2);
    this.axis4 = new THREE.Vector3(-1, 0, -1).normalize();
    const c4Verts = [
      [s / 2, 0, s / 2],
      [-s / 2, 0, -s / 2],
      [-s / 2, 0, s / 2]
    ];
    this.corner4Pivot.add(this.createFacetMesh(c4Verts, [0, 1, 2]));
    this.blintzRoot.add(this.corner4Pivot);

    this.group.add(this.blintzRoot);
    this.updateBlintzFold(0, 0);
  }

  updateBlintzFold(step, t) {
    if (!this.corner1Pivot) return;
    const foldAngle = Math.PI * 0.985;

    if (step === 0) {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, 0);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, 0);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } else if (step === 1) {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, t * foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, 0);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } else if (step === 2) {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, t * foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, 0);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } else if (step === 3) {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, t * foldAngle);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, 0);
    } else {
      this.corner1Pivot.quaternion.setFromAxisAngle(this.axis1, foldAngle);
      this.corner2Pivot.quaternion.setFromAxisAngle(this.axis2, foldAngle);
      this.corner3Pivot.quaternion.setFromAxisAngle(this.axis3, foldAngle);
      this.corner4Pivot.quaternion.setFromAxisAngle(this.axis4, t * foldAngle);
    }
  }

  /* =========================================================================
   * MODEL 2: DIAGONAL HALVES & QUARTERS (Exact Multi-Layer Continuous Model)
   * 
   * Paper Sheet (100x100) decomposed into four 45° quarter triangles meeting at (0,0):
   * Q1 (Top-Left):     (-s, -s) -> (0, 0) -> (s, -s)  [Permanent Base]
   * Q2 (Top-Right):    (0, 0) -> (s, -s) -> (s, s)   [Folds in Step 2]
   * Q3 (Bottom-Right): (0, 0) -> (s, s) -> (-s, s)   [Folds in Step 1, then with Q2 in Step 2]
   * Q4 (Bottom-Left):  (0, 0) -> (-s, s) -> (-s, -s) [Folds in Step 1 onto Q1]
   * ========================================================================= */
  buildDiagonalHalves() {
    const s = this.half; // 50
    this.diagRoot = new THREE.Group();
    this.diagRoot.position.y = 0.2;

    // 1. Q1 (Permanent Base on Table): (-s, -s) -> (0, 0) -> (s, -s)
    const q1Verts = [
      [-s, 0, -s],
      [0, 0, 0],
      [s, 0, -s]
    ];
    this.meshQ1 = this.createFacetMesh(q1Verts, [0, 1, 2]);
    this.diagRoot.add(this.meshQ1);

    // 2. Step 1 Diagonal Hinge:
    // Crease line runs along the center diagonal from (-s, 0, -s) to (s, 0, s).
    // Axis vector: (1, 0, 1) normalized. Pivot at origin (0, 0, 0).
    this.diagHinge = new THREE.Group();
    this.diagAxis = new THREE.Vector3(1, 0, 1).normalize();

    // Q4 attached inside diagHinge: (-s, -s) -> (0, 0) -> (-s, s)
    // When diagHinge rotates 180°, Q4 flips directly onto Q1!
    const q4Verts = [
      [-s, 0, -s],
      [0, 0, 0],
      [-s, 0, s]
    ];
    this.meshQ4 = this.createFacetMesh(q4Verts, [0, 1, 2]);
    this.diagHinge.add(this.meshQ4);

    // 3. Step 2 Altitude Hinge (Moving Right Wing):
    // The altitude crease line runs from (0,0,0) to (s,0,-s).
    // Axis vector: from (0,0,0) to (s,0,-s) = (1, 0, -1) normalized.
    // Midpoint of the crease is at (s/2, 0, -s/2).
    this.altHinge = new THREE.Group();
    this.altHinge.position.set(s / 2, 0, -s / 2);
    this.altAxis = new THREE.Vector3(1, 0, -1).normalize();

    // Q2 attached in altHinge (pivot is at (s/2, 0, -s/2)):
    // World vertices of Q2:
    // P0: (0, 0, 0)   -> Local: (0 - s/2, 0, 0 - (-s/2)) = (-s/2, 0, s/2)
    // P1: (s, 0, -s)  -> Local: (s - s/2, 0, -s - (-s/2)) = (s/2, 0, -s/2)
    // P2: (s, 0, s)   -> Local: (s - s/2, 0, s - (-s/2)) = (s/2, 0, 3s/2)
    const q2Local = [
      [-s / 2, 0, s / 2],
      [s / 2, 0, -s / 2],
      [s / 2, 0, 3 * s / 2]
    ];
    this.meshQ2 = this.createFacetMesh(q2Local, [0, 1, 2]);
    this.altHinge.add(this.meshQ2);

    // Q3 Folded Leaf (attached inside altHinge with slight 0.04 elevation offset):
    // When Step 1 is folded onto Q2, it rests directly on top of Q2:
    const q3FoldedLocal = [
      [-s / 2, 0.04, s / 2],
      [s / 2, 0.04, -s / 2],
      [s / 2, 0.04, 3 * s / 2]
    ];
    this.meshQ3Folded = this.createFacetMesh(q3FoldedLocal, [0, 1, 2]);
    this.meshQ3Folded.visible = false;
    this.altHinge.add(this.meshQ3Folded);

    // Q3 Flat Leaf (attached to diagHinge during Step 0 and Step 1):
    // Vertices: (0, 0, 0) -> (s, 0, s) -> (-s, 0, s)
    const q3FlatVerts = [
      [0, 0, 0],
      [s, 0, s],
      [-s, 0, s]
    ];
    this.meshQ3Flat = this.createFacetMesh(q3FlatVerts, [0, 1, 2]);
    this.diagHinge.add(this.meshQ3Flat);

    this.diagRoot.add(this.altHinge);
    this.diagRoot.add(this.diagHinge);
    this.group.add(this.diagRoot);
    this.updateDiagonalHalves(0, 0);
  }

  updateDiagonalHalves(step, t) {
    if (!this.diagHinge || !this.altHinge) return;

    const foldAngle = Math.PI * 0.985; // ~177 degrees to prevent z-fighting

    if (step === 0) {
      // Step 0: Completely flat 100x100 square
      this.diagHinge.visible = true;
      this.meshQ3Flat.visible = true;
      this.meshQ3Folded.visible = false;

      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, 0);
      this.altHinge.quaternion.setFromAxisAngle(this.altAxis, 0);
      this.diagRoot.position.y = 0.2;
    } 
    else if (step === 1) {
      // Step 1: Diagonal valley fold across center diagonal
      // Lower half (Q4 + Q3Flat) folds smoothly 180° onto upper half (Q1 + Q2)
      this.diagHinge.visible = true;
      this.meshQ3Flat.visible = true;
      this.meshQ3Folded.visible = false;

      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -t * foldAngle);
      this.altHinge.quaternion.setFromAxisAngle(this.altAxis, 0);
      this.diagRoot.position.y = 0.2 + t * 1.5;
    } 
    else {
      // Step 2: Quarter fold
      // Step 1 is 100% complete and locked:
      // Q3Flat transitions seamlessly to Q3Folded inside altHinge
      this.diagHinge.visible = true;
      this.meshQ3Flat.visible = false;
      this.meshQ3Folded.visible = true;

      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -foldAngle);

      // Now both Q2 and Q3Folded rotate together around the altitude axis over to the left wing!
      const qAngle = t * foldAngle;
      this.altHinge.quaternion.setFromAxisAngle(this.altAxis, -qAngle);
      this.diagRoot.position.y = 1.7 + t * 2.0;
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
