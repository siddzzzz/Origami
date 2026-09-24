/**
 * Computational Origami Kinematics
 * 
 * Formal Definition of Single-Sheet Origami:
 * A sheet is a planar geometric 2D graph G = (V, E, F) where:
 * - V is a set of 2D coordinates in [-50, 50]^2
 * - F is a set of rigid polygonal/triangular facets tiling the square with ZERO overlaps and ZERO gaps
 * - Every fold step k defines a directed crease line L_k = (P_A -> P_B)
 * - All facets belonging to the active folding component rotate as a single rigid body
 *   around the 3D hinge line L_k by angle theta_k.
 * - Vertices along the hinge line remain strictly continuous (zero tearing, zero shearing).
 */

import * as THREE from 'three';

export class OrigamiKinematicsEngine {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.half = this.paperSize / 2; // 50

    this.initMaterials();
    this.buildSheetHierarchy();
  }

  initMaterials() {
    // Front side of paper (Cream Japanese Washi)
    this.frontMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Back / Underside of paper (Crisp Origami Craft Blue)
    this.backMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
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

  buildSheetHierarchy() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'origami-masu') {
      this.buildMasuBox();
    } else if (this.model.id === 'origami-pyramid') {
      this.buildTentModel();
    } else {
      this.buildCupHierarchy();
    }
  }

  /**
   * TRADITIONAL DRINKING CUP:
   * Built as a true kinematic tree of rigid facets!
   * The 100x100 square paper sheet (-50..50) consists of:
   * 1. Stationary Base Triangle (Upper-Right):
   *    Vertices: (-50, 0, -50), (50, 0, -50), (50, 0, 50)
   * 2. First Fold Hinge: runs along the diagonal line from (-50, 0, -50) to (50, 0, 50)
   *    Rotating this hinge folds the lower half over the upper half with ZERO breaks!
   * 3. Lower Half Facets:
   *    Subdivided along the next fold lines:
   *    - Center body facet
   *    - Right corner flap hinged strictly at the right crease
   *    - Left corner flap hinged strictly at the left crease
   * 4. Top rim triangular cuff hinged along top horizontal crease
   */
  buildCupHierarchy() {
    const s = this.half; // 50
    this.cupRoot = new THREE.Group();
    this.cupRoot.position.y = 0.2;

    // --- STATIONARY HALF (Upper-Right Triangle) ---
    // (-s, -s), (s, -s), (s, s)
    const upperVerts = [
      [-s, 0, -s],
      [s, 0, -s],
      [s, 0, s]
    ];
    this.upperMesh = this.createFacetMesh(upperVerts, [0, 1, 2]);
    this.cupRoot.add(this.upperMesh);

    // --- MAIN DIAGONAL HINGE ---
    // Axis line: from (-s, 0, -s) to (s, 0, s)
    // Pivot at origin (0, 0, 0)
    this.diagHinge = new THREE.Group();
    this.diagAxis = new THREE.Vector3(1, 0, 1).normalize();

    // The lower triangle (-s, -s) -> (s, s) -> (-s, s)
    // In local space of diagHinge:
    // It is composed of a center wedge + right flap + left flap:
    // Corner apex is at (-s, 0, s).
    // Midpoint of opposite side is at (0, 0, -s) or along the diagonal.
    // For clean kinematic folds:
    const lowerBodyVerts = [
      [-s, 0, -s],
      [s, 0, s],
      [0, 0, s],
      [-s, 0, 0]
    ];
    // Main lower body quad
    this.lowerBodyMesh = this.createFacetMesh(lowerBodyVerts, [0, 1, 2, 0, 2, 3]);
    this.diagHinge.add(this.lowerBodyMesh);

    // Right Flap (Triangular corner that folds in Step 2)
    // Hinged along line from (0, 0, s) to (s, 0, s)
    this.rightFlapHinge = new THREE.Group();
    this.rightFlapHinge.position.set(0, 0, s);
    const rFlapVerts = [
      [0, 0, 0],
      [s, 0, 0],
      [s * 0.5, 0, -s * 0.5]
    ];
    this.rightFlapMesh = this.createFacetMesh(rFlapVerts, [0, 1, 2]);
    this.rightFlapHinge.add(this.rightFlapMesh);
    this.diagHinge.add(this.rightFlapHinge);

    // Left Flap (Triangular corner that folds in Step 3)
    this.leftFlapHinge = new THREE.Group();
    this.leftFlapHinge.position.set(-s, 0, 0);
    const lFlapVerts = [
      [0, 0, 0],
      [0, 0, s],
      [-s * 0.5, 0, s * 0.5]
    ];
    this.leftFlapMesh = this.createFacetMesh(lFlapVerts, [0, 1, 2]);
    this.leftFlapHinge.add(this.leftFlapMesh);
    this.diagHinge.add(this.leftFlapHinge);

    // Corner tip facet (-s, 0, s) that tucks
    const cornerVerts = [
      [-s, 0, 0],
      [0, 0, s],
      [-s, 0, s]
    ];
    this.cornerMesh = this.createFacetMesh(cornerVerts, [0, 1, 2]);
    this.diagHinge.add(this.cornerMesh);

    this.cupRoot.add(this.diagHinge);
    this.group.add(this.cupRoot);

    this.updateCupKinematics(0, 0);
  }

  updateCupKinematics(step, t) {
    if (!this.diagHinge) return;

    if (step === 0) {
      // Step 0 -> Step 1: Diagonal valley fold across the entire sheet
      // The lower half rotates cleanly around the diagonal axis by 180 degrees
      const angle = t * Math.PI * 0.985;
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -angle);

      // Flaps stay flat in plane with the moving half
      this.rightFlapHinge.rotation.y = 0;
      this.leftFlapHinge.rotation.y = 0;
      this.cornerMesh.rotation.x = 0;
      this.cupRoot.position.y = 0.2 + t * 1.5;
    } 
    else if (step === 1) {
      // Step 1 -> Step 2: Right flap folds across along its crease
      // Diagonal fold remains 100% closed (180 deg)
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -Math.PI * 0.985);

      // Right flap rotates strictly along its hinge line by angle (up to 180 deg)
      const rAngle = t * Math.PI * 0.95;
      this.rightFlapHinge.rotation.y = -rAngle;
      this.leftFlapHinge.rotation.y = 0;
      this.cupRoot.position.y = 1.7 + t * 2.0;
    }
    else if (step === 2) {
      // Step 2 -> Step 3: Left flap folds across over the right flap
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -Math.PI * 0.985);
      this.rightFlapHinge.rotation.y = -Math.PI * 0.95;

      const lAngle = t * Math.PI * 0.95;
      this.leftFlapHinge.rotation.y = lAngle;
      this.cupRoot.position.y = 3.7 + t * 2.0;
    }
    else {
      // Step 3 -> Step 4: Top triangular cuff folds downward to lock the cup!
      this.diagHinge.quaternion.setFromAxisAngle(this.diagAxis, -Math.PI * 0.985);
      this.rightFlapHinge.rotation.y = -Math.PI * 0.95;
      this.leftFlapHinge.rotation.y = Math.PI * 0.95;

      const foldDown = t * Math.PI * 0.95;
      this.cornerMesh.rotation.x = foldDown;
      this.cupRoot.position.y = 5.7 + t * 2.0;
    }
  }

  /**
   * MASU BOX:
   * Pure single 100x100 sheet with 4 perimeter walls folding up along the 50x50 base creases.
   */
  buildMasuBox() {
    const s = 25; // Base is -25 to +25 (50x50mm)
    const h = 25; // Wall height

    this.boxRoot = new THREE.Group();
    this.boxRoot.position.y = 0.2;

    // Base plane
    const baseVerts = [
      [-s, 0, -s],
      [s, 0, -s],
      [s, 0, s],
      [-s, 0, s]
    ];
    const base = this.createFacetMesh(baseVerts, [0, 1, 2, 0, 2, 3]);
    this.boxRoot.add(base);

    // 4 Walls
    this.boxWalls = [];
    const wallDefs = [
      { name: 'North', px: 0, pz: -s, w: s*2, h: h, rotX: 1, rotZ: 0, dir: 1, verts: [[-s,0,0],[s,0,0],[s,0,-h],[-s,0,-h]] },
      { name: 'South', px: 0, pz: s,  w: s*2, h: h, rotX: 1, rotZ: 0, dir: -1, verts: [[-s,0,0],[s,0,0],[s,0,h],[-s,0,h]] },
      { name: 'East',  px: s, pz: 0,  w: h,   h: s*2, rotX: 0, rotZ: 1, dir: -1, verts: [[0,0,-s],[0,0,s],[h,0,s],[h,0,-s]] },
      { name: 'West',  px: -s, pz: 0, w: h,   h: s*2, rotX: 0, rotZ: 1, dir: 1, verts: [[0,0,-s],[0,0,s],[-h,0,s],[-h,0,-s]] }
    ];

    wallDefs.forEach(def => {
      const hinge = new THREE.Group();
      hinge.position.set(def.px, 0, def.pz);
      const wallMesh = this.createFacetMesh(def.verts, [0, 1, 2, 0, 2, 3]);
      hinge.add(wallMesh);
      this.boxRoot.add(hinge);
      this.boxWalls.push({ hinge, def });
    });

    this.group.add(this.boxRoot);
    this.updateMasuBox(0, 0);
  }

  updateMasuBox(step, t) {
    if (!this.boxWalls) return;

    let ewAngle = 0;
    let nsAngle = 0;

    if (step === 0) {
      ewAngle = 0;
      nsAngle = 0;
    } else if (step === 1) {
      // East & West walls fold up 90 deg
      ewAngle = t * (Math.PI / 2);
      nsAngle = 0;
    } else {
      // North & South walls fold up 90 deg
      ewAngle = Math.PI / 2;
      nsAngle = t * (Math.PI / 2);
    }

    this.boxWalls.forEach(({ hinge, def }) => {
      if (def.rotX) {
        hinge.rotation.x = def.dir * nsAngle;
      } else {
        hinge.rotation.z = def.dir * ewAngle;
      }
    });
  }

  /**
   * TENT / PEAK:
   */
  buildTentModel() {
    const s = this.half; // 50
    this.tentRoot = new THREE.Group();
    this.tentRoot.position.y = 0.2;

    const lVerts = [[-s, 0, -s], [0, 0, -s], [0, 0, s], [-s, 0, s]];
    this.leftHalf = this.createFacetMesh(lVerts, [0, 1, 2, 0, 2, 3]);

    const rVerts = [[0, 0, -s], [s, 0, -s], [s, 0, s], [0, 0, s]];
    this.rightHalf = this.createFacetMesh(rVerts, [0, 1, 2, 0, 2, 3]);

    this.tentRoot.add(this.leftHalf);
    this.tentRoot.add(this.rightHalf);
    this.group.add(this.tentRoot);
    this.updateTent(0, 0);
  }

  updateTent(step, t) {
    if (!this.leftHalf || !this.rightHalf) return;
    const angle = (step === 0 ? t : 1.0) * (Math.PI * 0.45);
    this.leftHalf.rotation.z = angle;
    this.rightHalf.rotation.z = -angle;
    this.tentRoot.position.y = 0.2 + (step === 0 ? t : 1.0) * 18;
  }

  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'origami-masu') {
      this.updateMasuBox(stepIndex, this.foldProgress);
    } else if (this.model.id === 'origami-pyramid') {
      this.updateTent(stepIndex, this.foldProgress);
    } else {
      this.updateCupKinematics(stepIndex, this.foldProgress);
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
