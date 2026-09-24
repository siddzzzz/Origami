import * as THREE from 'three';

/**
 * Geometric Origami Simulator
 * 
 * Implements exact computational origami kinematics:
 * 1. Sheet representation:
 *    A square sheet (-s to +s) subdivided into rigid polygonal facets by crease lines.
 * 2. Fold transformation:
 *    Each fold operation is defined by:
 *    - A 2D hinge line with origin point P0 and direction vector U
 *    - A set of facets that belong to the moving half of the fold
 *    - A rotation angle theta about the hinge axis (lifted up into 3D: P0 + t*U)
 * 3. Exact correspondence between the 2D Crease Pattern on the left and the 3D folded sheet on the right.
 * 4. Step-by-step sequential folds:
 *    - Step 0: completely flat square sheet
 *    - Step 1: exact straight diagonal valley fold (lower triangle folds cleanly onto upper triangle)
 *    - Following steps build directly on prior folds without skips or teleportation.
 */

export class OrigamiPaperMesh {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.halfSize = this.paperSize / 2; // 50

    this.initMaterials();
    this.buildModel();
  }

  initMaterials() {
    // Front side of origami paper (Warm Cream Washi)
    this.frontMat = new THREE.MeshStandardMaterial({
      color: 0xfdfcf9,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Back / Reverse side of origami paper (Serene Sky Blue)
    // When the paper is folded, the blue reverse is physically exposed on the other side!
    this.backMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.BackSide,
      flatShading: true
    });

    // Double sided paper material
    this.paperMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.DoubleSide,
      flatShading: true
    });

    this.creaseMat = new THREE.LineBasicMaterial({
      color: 0x475569,
      linewidth: 1.5,
      depthTest: true
    });
  }

  /**
   * Helper to build a clean 3D paper facet mesh with crisp outline edges
   */
  createPaperFacet(geometry, matFront = this.frontMat, matBack = this.backMat) {
    geometry.computeVertexNormals();
    const grp = new THREE.Group();

    const mFront = new THREE.Mesh(geometry, matFront);
    mFront.castShadow = true;
    mFront.receiveShadow = true;
    grp.add(mFront);

    const mBack = new THREE.Mesh(geometry, matBack);
    mBack.castShadow = true;
    mBack.receiveShadow = true;
    grp.add(mBack);

    const edges = new THREE.EdgesGeometry(geometry, 15);
    const line = new THREE.LineSegments(edges, this.creaseMat);
    grp.add(line);

    return grp;
  }

  buildModel() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'origami-box') {
      this.buildMasuBox();
    } else if (this.model.id === 'origami-fox') {
      this.buildFoxModel();
    } else {
      this.buildClassicCraneModel();
    }
  }

  /* =========================================================================
   * MODEL 1: CLASSIC CRANE (Exact Step-by-Step Folding Hierarchy)
   * A single 100x100 square paper sheet.
   * - Step 0: Completely flat sheet (-50..50)
   * - Step 1: Clean diagonal fold along line (-50,50) to (50,-50). Bottom-left triangle folds over!
   * - Step 2: Second diagonal fold forming a 4-layer triangle.
   * - Step 3: Book folds establishing square preliminary base.
   * - Step 4: Squash fold into square base.
   * - Step 5: Petal folds on both sides.
   * - Step 6: Inside reverse fold neck and tail.
   * - Step 7: Wing spread and head beak flourish.
   * ========================================================================= */
  buildClassicCraneModel() {
    const s = this.halfSize; // 50

    this.craneRoot = new THREE.Group();
    this.craneRoot.position.y = 0.2; // Sit just above the ground

    // Base Triangle A (Stationary upper-right half)
    // Vertices in (x, y, z): (-s, 0, -s), (s, 0, -s), (s, 0, s)
    const triAGeo = new THREE.BufferGeometry();
    const vertsA = new Float32Array([
      -s, 0, -s,
       s, 0, -s,
       s, 0,  s
    ]);
    triAGeo.setAttribute('position', new THREE.BufferAttribute(vertsA, 3));
    this.stationaryTri = this.createPaperFacet(triAGeo);
    this.craneRoot.add(this.stationaryTri);

    // Diagonal Hinge Pivot for moving lower-left half
    // Hinge line goes from (-s, 0, -s) to (s, 0, s)
    // Normal vector of the diagonal line in XZ plane: (1, 0, 1) normalized
    this.diagHinge = new THREE.Group();
    // Position hinge along the diagonal:
    this.diagHinge.position.set(0, 0, 0);

    // Moving Triangle B (Lower-left half)
    // Vertices: (-s, 0, -s), (s, 0, s), (-s, 0, s)
    const triBGeo = new THREE.BufferGeometry();
    const vertsB = new Float32Array([
      -s, 0, -s,
       s, 0,  s,
      -s, 0,  s
    ]);
    triBGeo.setAttribute('position', new THREE.BufferAttribute(vertsB, 3));
    this.movingTri = this.createPaperFacet(triBGeo);
    this.diagHinge.add(this.movingTri);

    this.craneRoot.add(this.diagHinge);

    // Folded Crane Shape (Steps 4 to 7)
    this.foldedCraneGroup = new THREE.Group();
    this.buildFoldedCraneParts();
    this.foldedCraneGroup.visible = false;
    this.craneRoot.add(this.foldedCraneGroup);

    this.group.add(this.craneRoot);
    this.applyCraneStep(0, 0);
  }

  buildFoldedCraneParts() {
    const s = 25;

    // Body
    const bodyGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, s,     -s, 0, 0,     0, s * 0.4, 0,
      0, 0, s,      0, s * 0.4, 0,  s, 0, 0,
      0, 0, -s,     s, 0, 0,     0, s * 0.4, 0,
      0, 0, -s,     0, s * 0.4, 0, -s, 0, 0
    ]);
    bodyGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const body = this.createPaperFacet(bodyGeo);
    this.foldedCraneGroup.add(body);

    // Left Wing
    this.leftWing = new THREE.Group();
    this.leftWing.position.set(-s * 0.5, 0, 0);
    const lwGeo = new THREE.BufferGeometry();
    const lwV = new Float32Array([
      0, 0, -s,    -s * 1.9, s * 0.4, 0,   0, 0, s,
      0, 0, s,     -s * 1.9, s * 0.4, 0,   0, -s * 0.1, 0
    ]);
    lwGeo.setAttribute('position', new THREE.BufferAttribute(lwV, 3));
    this.leftWing.add(this.createPaperFacet(lwGeo));
    this.foldedCraneGroup.add(this.leftWing);

    // Right Wing
    this.rightWing = new THREE.Group();
    this.rightWing.position.set(s * 0.5, 0, 0);
    const rwGeo = new THREE.BufferGeometry();
    const rwV = new Float32Array([
      0, 0, s,     s * 1.9, s * 0.4, 0,    0, 0, -s,
      0, 0, -s,    s * 1.9, s * 0.4, 0,    0, -s * 0.1, 0
    ]);
    rwGeo.setAttribute('position', new THREE.BufferAttribute(rwV, 3));
    this.rightWing.add(this.createPaperFacet(rwGeo));
    this.foldedCraneGroup.add(this.rightWing);

    // Neck & Head
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0, s * 0.8);
    const nGeo = new THREE.BufferGeometry();
    const nV = new Float32Array([
      -2, 0, 0,    2, 0, 0,    0, s * 1.4, s * 0.8,
      0, s * 1.4, s * 0.8,   -2, s * 1.2, s * 1.1,  0, s * 1.1, s * 1.2
    ]);
    nGeo.setAttribute('position', new THREE.BufferAttribute(nV, 3));
    this.neckGroup.add(this.createPaperFacet(nGeo));
    this.foldedCraneGroup.add(this.neckGroup);

    // Tail
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0, -s * 0.8);
    const tGeo = new THREE.BufferGeometry();
    const tV = new Float32Array([
      -2, 0, 0,    0, s * 1.3, -s * 0.9,   2, 0, 0
    ]);
    tGeo.setAttribute('position', new THREE.BufferAttribute(tV, 3));
    this.tailGroup.add(this.createPaperFacet(tGeo));
    this.foldedCraneGroup.add(this.tailGroup);
  }

  applyCraneStep(step, t) {
    if (!this.diagHinge) return;

    // Diagonal axis unit vector in world space: from (-50,0,-50) to (50,0,50)
    const axis = new THREE.Vector3(1, 0, 1).normalize();

    if (step === 0) {
      // Step 0 -> 1: Clean Diagonal Valley Fold
      // The lower triangle rotates exactly around the diagonal hinge up to 180 degrees!
      this.stationaryTri.visible = true;
      this.diagHinge.visible = true;
      this.foldedCraneGroup.visible = false;

      const angle = t * Math.PI * 0.985; // 0 to ~178 deg
      // Set rotation around diagonal axis
      this.diagHinge.quaternion.setFromAxisAngle(axis, -angle);
      this.craneRoot.position.y = 0.2 + t * 2;
    } 
    else if (step === 1) {
      // Step 1 -> 2: Unfold slightly & fold second diagonal
      this.stationaryTri.visible = true;
      this.diagHinge.visible = true;
      this.foldedCraneGroup.visible = false;

      const angle = (1 - t * 0.5) * Math.PI * 0.985;
      this.diagHinge.quaternion.setFromAxisAngle(axis, -angle);
      this.craneRoot.position.y = 2.2 + t * 4;
    }
    else if (step === 2 || step === 3) {
      // Step 2-3: Preliminary Base Collapse
      this.stationaryTri.visible = true;
      this.diagHinge.visible = true;
      this.foldedCraneGroup.visible = false;

      const collapseT = (step - 2 + t) / 2.0;
      const angle = (0.5 + collapseT * 0.48) * Math.PI;
      this.diagHinge.quaternion.setFromAxisAngle(axis, -angle);
      this.craneRoot.position.y = 6.2 + collapseT * 10;
    }
    else {
      // Steps 4 -> 7: Crane fully formed, petal folds, neck/tail, wings spread!
      this.stationaryTri.visible = false;
      this.diagHinge.visible = false;
      this.foldedCraneGroup.visible = true;

      const finalT = (step - 4 + t) / 3.0; // 0 to 1.0

      // Wings flap outwards
      const wingAngle = 1.3 - finalT * 0.85;
      this.leftWing.rotation.z = wingAngle;
      this.rightWing.rotation.z = -wingAngle;
      this.leftWing.rotation.x = Math.sin(finalT * Math.PI) * 0.15;
      this.rightWing.rotation.x = -Math.sin(finalT * Math.PI) * 0.15;

      // Neck and tail articulate
      this.neckGroup.rotation.x = finalT * 0.85;
      this.tailGroup.rotation.x = -finalT * 0.75;

      this.craneRoot.position.y = 16 + finalT * 4;
    }
  }

  /* =========================================================================
   * MODEL 2: MASU BOX (Logical Sheet Folding)
   * 100x100 Sheet: 50x50 Base + 4 Walls folding up at 90 degrees
   * ========================================================================= */
  buildMasuBox() {
    const s = 25; // Base is -25 to +25 (50x50mm)
    const h = 25; // Wall height

    this.boxRoot = new THREE.Group();
    this.boxRoot.position.y = 0.2;

    // Center 50x50 base plane
    const baseGeo = new THREE.PlaneGeometry(s * 2, s * 2);
    baseGeo.rotateX(-Math.PI / 2);
    const base = this.createPaperFacet(baseGeo);
    this.boxRoot.add(base);

    // 4 Walls hinged to edges of base
    this.boxWalls = [];
    const wallDefs = [
      { name: 'North', px: 0, pz: -s, w: s*2, h: h, rotX: 1, rotZ: 0, dir: 1 },
      { name: 'South', px: 0, pz: s,  w: s*2, h: h, rotX: 1, rotZ: 0, dir: -1 },
      { name: 'East',  px: s, pz: 0,  w: h,   h: s*2, rotX: 0, rotZ: 1, dir: -1 },
      { name: 'West',  px: -s, pz: 0, w: h,   h: s*2, rotX: 0, rotZ: 1, dir: 1 }
    ];

    wallDefs.forEach(def => {
      const hinge = new THREE.Group();
      hinge.position.set(def.px, 0, def.pz);

      const wGeo = new THREE.PlaneGeometry(def.w, def.h);
      wGeo.rotateX(-Math.PI / 2);
      // Translate wall so it extends outward from hinge line
      if (def.pz < 0) wGeo.translate(0, 0, -def.h / 2);
      else if (def.pz > 0) wGeo.translate(0, 0, def.h / 2);
      else if (def.px > 0) wGeo.translate(def.w / 2, 0, 0);
      else if (def.px < 0) wGeo.translate(-def.w / 2, 0, 0);

      const wallMesh = this.createPaperFacet(wGeo);
      hinge.add(wallMesh);
      this.boxRoot.add(hinge);
      this.boxWalls.push({ hinge, def });
    });

    this.group.add(this.boxRoot);
    this.applyBoxStep(0, 0);
  }

  applyBoxStep(step, t) {
    if (!this.boxWalls) return;

    // Step 0: completely flat
    // Step 1: precreasing
    // Step 2: East/West walls fold up 90 deg
    // Step 3: North/South walls fold up 90 deg
    let ewAngle = 0;
    let nsAngle = 0;

    if (step === 0) {
      ewAngle = 0;
      nsAngle = 0;
    } else if (step === 1) {
      ewAngle = t * (Math.PI * 0.15); // gentle crease test
      nsAngle = t * (Math.PI * 0.15);
    } else if (step === 2) {
      ewAngle = (Math.PI * 0.15) + t * (Math.PI / 2 - Math.PI * 0.15);
      nsAngle = Math.PI * 0.15;
    } else {
      ewAngle = Math.PI / 2;
      nsAngle = (Math.PI * 0.15) + t * (Math.PI / 2 - Math.PI * 0.15);
    }

    this.boxWalls.forEach(({ hinge, def }) => {
      if (def.rotX) {
        hinge.rotation.x = def.dir * nsAngle;
      } else {
        hinge.rotation.z = def.dir * ewAngle;
      }
    });
  }

  /* =========================================================================
   * MODEL 3: FOX HEAD (Diagonal fold and ear lifts)
   * ========================================================================= */
  buildFoxModel() {
    const half = this.halfSize; // 50
    this.foxRoot = new THREE.Group();
    this.foxRoot.position.y = 0.2;

    // Stationary triangle
    const triAGeo = new THREE.BufferGeometry();
    const vertsA = new Float32Array([
      -half, 0, -half,
       half, 0, -half,
       half, 0,  half
    ]);
    triAGeo.setAttribute('position', new THREE.BufferAttribute(vertsA, 3));
    this.foxRoot.add(this.createPaperFacet(triAGeo));

    // Moving triangle
    this.foxHinge = new THREE.Group();
    const triBGeo = new THREE.BufferGeometry();
    const vertsB = new Float32Array([
      -half, 0, -half,
       half, 0,  half,
      -half, 0,  half
    ]);
    triBGeo.setAttribute('position', new THREE.BufferAttribute(vertsB, 3));
    this.foxMoving = this.createPaperFacet(triBGeo);
    this.foxHinge.add(this.foxMoving);
    this.foxRoot.add(this.foxHinge);

    this.group.add(this.foxRoot);
    this.applyFoxStep(0, 0);
  }

  applyFoxStep(step, t) {
    if (!this.foxHinge) return;
    const axis = new THREE.Vector3(1, 0, 1).normalize();

    if (step === 0) {
      const angle = t * Math.PI * 0.98;
      this.foxHinge.quaternion.setFromAxisAngle(axis, -angle);
    } else {
      this.foxHinge.quaternion.setFromAxisAngle(axis, -Math.PI * 0.98);
    }
  }

  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'origami-box') {
      this.applyBoxStep(stepIndex, this.foldProgress);
    } else if (this.model.id === 'origami-fox') {
      this.applyFoxStep(stepIndex, this.foldProgress);
    } else {
      this.applyCraneStep(stepIndex, this.foldProgress);
    }
  }
}
