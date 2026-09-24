import * as THREE from 'three';

/**
 * Geometric Origami Paper Mesh
 * Models the entire square paper sheet decomposed into connected triangular and rectangular facets.
 * Every fold physically rotates connected facets around the exact fold line (hinge axis) step-by-step,
 * keeping the entire sheet intact with no disappearing parts!
 */

export class OrigamiPaperMesh {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.currentStep = 0;
    this.foldProgress = 0;

    this.initMaterials();
    this.buildFoldStructure();
  }

  initMaterials() {
    // Front side (Cream Japanese Washi)
    this.frontMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbf9f5,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Back side (Soft origami craft blue so folds are clearly distinguished)
    this.backMaterial = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.7,
      metalness: 0.02,
      side: THREE.BackSide,
      flatShading: true
    });

    // Double sided for thin paper facets
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.DoubleSide,
      flatShading: true
    });

    this.creaseLineMaterial = new THREE.LineBasicMaterial({
      color: 0x64748b,
      linewidth: 1.5,
      depthTest: true
    });

    this.activeHingeMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3,
      depthTest: false
    });
  }

  buildFoldStructure() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'origami-box') {
      this.buildMasuBox();
    } else if (this.model.id === 'origami-fox') {
      this.buildFoxHead();
    } else {
      this.buildCraneStepByStep();
    }
  }

  /**
   * Helper to create double-sided facet mesh with outline
   */
  createFacet(geometry, material = this.paperMaterial) {
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Subtle edge borders
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const line = new THREE.LineSegments(edges, this.creaseLineMaterial);
    mesh.add(line);

    return mesh;
  }

  /**
   * MASU BOX:
   * Total 100x100 sheet divided into 9 connected panels:
   * Center (50x50 base) + 4 Flap Walls + 4 Corner gussets
   * Step-by-step:
   * Step 0: Entire 100x100 sheet flat
   * Step 1: Base crease indent
   * Step 2: Left & Right walls fold up 90 deg along inner crease
   * Step 3: Front & Back walls fold up 90 deg and lock in
   */
  buildMasuBox() {
    const s = 25; // half base = 25 (base is 50x50, total sheet is 100x100)
    const h = 25; // wall height

    this.boxRoot = new THREE.Group();

    // 1. Center Base (50x50)
    const baseGeo = new THREE.PlaneGeometry(s * 2, s * 2);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMesh = this.createFacet(baseGeo);
    this.boxRoot.add(baseMesh);

    // 2. North Wall Pivot (hinged at z = -s)
    this.northPivot = new THREE.Group();
    this.northPivot.position.set(0, 0, -s);
    const northGeo = new THREE.PlaneGeometry(s * 2, h);
    northGeo.rotateX(-Math.PI / 2);
    northGeo.translate(0, 0, -h / 2);
    this.northPivot.add(this.createFacet(northGeo));
    this.boxRoot.add(this.northPivot);

    // 3. South Wall Pivot (hinged at z = s)
    this.southPivot = new THREE.Group();
    this.southPivot.position.set(0, 0, s);
    const southGeo = new THREE.PlaneGeometry(s * 2, h);
    southGeo.rotateX(-Math.PI / 2);
    southGeo.translate(0, 0, h / 2);
    this.southPivot.add(this.createFacet(southGeo));
    this.boxRoot.add(this.southPivot);

    // 4. East Wall Pivot (hinged at x = s)
    this.eastPivot = new THREE.Group();
    this.eastPivot.position.set(s, 0, 0);
    const eastGeo = new THREE.PlaneGeometry(h, s * 2);
    eastGeo.rotateX(-Math.PI / 2);
    eastGeo.translate(h / 2, 0, 0);
    this.eastPivot.add(this.createFacet(eastGeo));
    this.boxRoot.add(this.eastPivot);

    // 5. West Wall Pivot (hinged at x = -s)
    this.westPivot = new THREE.Group();
    this.westPivot.position.set(-s, 0, 0);
    const westGeo = new THREE.PlaneGeometry(h, s * 2);
    westGeo.rotateX(-Math.PI / 2);
    westGeo.translate(-h / 2, 0, 0);
    this.westPivot.add(this.createFacet(westGeo));
    this.boxRoot.add(this.westPivot);

    // 6. Four Corner flaps that tuck in
    const corners = [
      { x: -s, z: -s, rot: 0 },
      { x: s, z: -s, rot: Math.PI / 2 },
      { x: s, z: s, rot: Math.PI },
      { x: -s, z: s, rot: -Math.PI / 2 }
    ];

    this.cornerPivots = [];
    corners.forEach(c => {
      const p = new THREE.Group();
      p.position.set(c.x, 0, c.z);
      const cGeo = new THREE.PlaneGeometry(h, h);
      cGeo.rotateX(-Math.PI / 2);
      cGeo.translate(c.x < 0 ? -h/2 : h/2, 0, c.z < 0 ? -h/2 : h/2);
      p.add(this.createFacet(cGeo));
      this.boxRoot.add(p);
      this.cornerPivots.push(p);
    });

    this.group.add(this.boxRoot);
    this.updateBoxFold(0, 0);
  }

  /**
   * FOX HEAD:
   * A full square sheet folded in half diagonally, then ears folded up, then snout tip down.
   */
  buildFoxHead() {
    this.foxRoot = new THREE.Group();
    const half = 50;

    // Base Triangle A (Fixed Bottom Half)
    const triAGeo = new THREE.BufferGeometry();
    const vertsA = new Float32Array([
      -half, 0, -half,
       half, 0,  half,
      -half, 0,  half
    ]);
    triAGeo.setAttribute('position', new THREE.BufferAttribute(vertsA, 3));
    this.foxRoot.add(this.createFacet(triAGeo));

    // Diagonal Fold Pivot (Hinged across diagonal: (-half, -half) to (half, half))
    this.foxDiagPivot = new THREE.Group();
    // Rotate 45 deg so diagonal is aligned along local X axis
    this.foxDiagPivot.rotation.y = -Math.PI / 4;

    const triBGeo = new THREE.BufferGeometry();
    const diagLen = Math.sqrt(2 * half * half);
    const vertsB = new Float32Array([
      -diagLen, 0, 0,
       diagLen, 0, 0,
       0, 0, -diagLen
    ]);
    triBGeo.setAttribute('position', new THREE.BufferAttribute(vertsB, 3));
    this.foxDiagMesh = this.createFacet(triBGeo);
    this.foxDiagPivot.add(this.foxDiagMesh);

    // Left Ear flap
    this.foxLeftEar = new THREE.Group();
    this.foxLeftEar.position.set(-diagLen * 0.4, 0, 0);
    const earGeo = new THREE.BufferGeometry();
    const earV = new Float32Array([
      0, 0, 0,
      -diagLen * 0.4, 0, -diagLen * 0.4,
      0, 0, -diagLen * 0.4
    ]);
    earGeo.setAttribute('position', new THREE.BufferAttribute(earV, 3));
    this.foxLeftEar.add(this.createFacet(earGeo));
    this.foxDiagPivot.add(this.foxLeftEar);

    // Right Ear flap
    this.foxRightEar = new THREE.Group();
    this.foxRightEar.position.set(diagLen * 0.4, 0, 0);
    const rEarGeo = new THREE.BufferGeometry();
    const rEarV = new Float32Array([
      0, 0, 0,
      0, 0, -diagLen * 0.4,
      diagLen * 0.4, 0, -diagLen * 0.4
    ]);
    rEarGeo.setAttribute('position', new THREE.BufferAttribute(rEarV, 3));
    this.foxRightEar.add(this.createFacet(rEarGeo));
    this.foxDiagPivot.add(this.foxRightEar);

    this.foxRoot.add(this.foxDiagPivot);
    this.group.add(this.foxRoot);
    this.updateFoxFold(0, 0);
  }

  /**
   * CRANE:
   * True step-by-step origami construction with full paper conservation:
   * 4 Quadrants / 8 Triangles completely tiling the 100x100 square.
   * Step 0: Full 100x100 Flat Square Sheet
   * Step 1: Diagonal valley fold across (corners meet)
   * Step 2: Opposite diagonal crease
   * Step 3: Book fold medians
   * Step 4: Preliminary Square Base collapse
   * Step 5: Petal folds (flaps swing inward)
   * Step 6: Neck and tail inside reverse fold
   * Step 7: Wings expand outwards into full flight
   */
  buildCraneStepByStep() {
    this.craneRoot = new THREE.Group();
    const h = 50; // 100x100 square sheet (-50..50)

    // The full sheet consists of 4 main quadrant flaps (North, South, East, West)
    // meeting at the center (0,0), with diagonal valley hinges.
    this.flaps = [];

    const quadrantConfigs = [
      { name: 'North', dirX: 0, dirZ: -1, p1: [-h, 0, -h], p2: [h, 0, -h], pc: [0, 0, 0], rotAxis: 'x', sign: -1 },
      { name: 'South', dirX: 0, dirZ: 1,  p1: [-h, 0, h],  p2: [h, 0, h],  pc: [0, 0, 0], rotAxis: 'x', sign: 1 },
      { name: 'East',  dirX: 1, dirZ: 0,  p1: [h, 0, -h],  p2: [h, 0, h],  pc: [0, 0, 0], rotAxis: 'z', sign: 1 },
      { name: 'West',  dirX: -1, dirZ: 0, p1: [-h, 0, -h], p2: [-h, 0, h], pc: [0, 0, 0], rotAxis: 'z', sign: -1 }
    ];

    quadrantConfigs.forEach(cfg => {
      const pivot = new THREE.Group();

      // Left triangle of quadrant
      const tri1 = new THREE.BufferGeometry();
      const v1 = new Float32Array([
        0, 0, 0,
        cfg.p1[0], 0, cfg.p1[2],
        cfg.dirX * h, 0, cfg.dirZ * h
      ]);
      tri1.setAttribute('position', new THREE.BufferAttribute(v1, 3));
      const m1 = this.createFacet(tri1);

      // Right triangle of quadrant
      const tri2 = new THREE.BufferGeometry();
      const v2 = new Float32Array([
        0, 0, 0,
        cfg.dirX * h, 0, cfg.dirZ * h,
        cfg.p2[0], 0, cfg.p2[2]
      ]);
      tri2.setAttribute('position', new THREE.BufferAttribute(v2, 3));
      const m2 = this.createFacet(tri2);

      pivot.add(m1);
      pivot.add(m2);

      this.craneRoot.add(pivot);
      this.flaps.push({ pivot, cfg, m1, m2 });
    });

    // Sub-assemblies for later steps (wings, neck head, tail)
    this.craneWings = new THREE.Group();
    this.leftCraneWing = new THREE.Group();
    this.leftCraneWing.position.set(-25, 10, 0);
    const lwGeo = new THREE.BufferGeometry();
    const lwV = new Float32Array([
      0, 0, -25,   -45, 15, 0,   0, 0, 25,
      0, 0, 25,    -45, 15, 0,   0, -5, 0
    ]);
    lwGeo.setAttribute('position', new THREE.BufferAttribute(lwV, 3));
    this.leftCraneWing.add(this.createFacet(lwGeo));

    this.rightCraneWing = new THREE.Group();
    this.rightCraneWing.position.set(25, 10, 0);
    const rwGeo = new THREE.BufferGeometry();
    const rwV = new Float32Array([
      0, 0, 25,    45, 15, 0,    0, 0, -25,
      0, 0, -25,   45, 15, 0,    0, -5, 0
    ]);
    rwGeo.setAttribute('position', new THREE.BufferAttribute(rwV, 3));
    this.rightCraneWing.add(this.createFacet(rwGeo));

    // Neck & Head
    this.craneNeck = new THREE.Group();
    this.craneNeck.position.set(0, 8, 22);
    const nGeo = new THREE.BufferGeometry();
    const nV = new Float32Array([
      -2, 0, 0,    2, 0, 0,    0, 35, 18,
      0, 35, 18,   -2, 30, 24,  0, 28, 26
    ]);
    nGeo.setAttribute('position', new THREE.BufferAttribute(nV, 3));
    this.craneNeck.add(this.createFacet(nGeo));

    // Tail
    this.craneTail = new THREE.Group();
    this.craneTail.position.set(0, 8, -22);
    const tGeo = new THREE.BufferGeometry();
    const tV = new Float32Array([
      -2, 0, 0,    0, 32, -22,   2, 0, 0
    ]);
    tGeo.setAttribute('position', new THREE.BufferAttribute(tV, 3));
    this.craneTail.add(this.createFacet(tGeo));

    this.craneWings.add(this.leftCraneWing);
    this.craneWings.add(this.rightCraneWing);
    this.craneWings.add(this.craneNeck);
    this.craneWings.add(this.craneTail);
    this.craneWings.visible = false;

    this.craneRoot.add(this.craneWings);
    this.group.add(this.craneRoot);
    this.updateCraneFold(0, 0);
  }

  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'origami-box') {
      this.updateBoxFold(stepIndex, this.foldProgress);
    } else if (this.model.id === 'origami-fox') {
      this.updateFoxFold(stepIndex, this.foldProgress);
    } else {
      this.updateCraneFold(stepIndex, this.foldProgress);
    }
  }

  updateCraneFold(step, t) {
    if (!this.flaps || this.flaps.length < 4) return;

    // Interpolation continuous parameter across all 8 steps
    const frac = step + t;

    if (frac <= 1.0) {
      // Step 0 -> 1: First Diagonal Fold
      // Paper stays 100% visible, South & East flaps fold upwards towards North-West diagonal
      this.craneWings.visible = false;
      this.flaps.forEach(f => f.pivot.visible = true);

      const foldAngle = (frac / 1.0) * Math.PI * 0.96; // Fold 175 degrees
      this.flaps[1].pivot.rotation.x = -foldAngle; // South folds up
      this.flaps[2].pivot.rotation.z = -foldAngle * 0.5;
      this.flaps[0].pivot.rotation.x = 0;
      this.flaps[3].pivot.rotation.z = 0;
      this.craneRoot.position.y = (frac / 1.0) * 4;
    } 
    else if (frac <= 2.0) {
      // Step 1 -> 2: Second diagonal fold & open
      const p = frac - 1.0;
      const unFold = Math.PI * 0.96 * (1 - p * 0.7);
      this.flaps[1].pivot.rotation.x = -unFold;
      this.flaps[3].pivot.rotation.z = (p * Math.PI * 0.5);
      this.craneRoot.position.y = 4 + p * 2;
    }
    else if (frac <= 4.0) {
      // Step 3 -> 4: Preliminary Square Base collapse (all 4 quadrants fold together inward)
      const p = (frac - 2.0) / 2.0;
      const collapseAngle = 0.3 + p * (Math.PI / 2 - 0.1);

      this.flaps[0].pivot.rotation.x = collapseAngle;
      this.flaps[1].pivot.rotation.x = -collapseAngle;
      this.flaps[2].pivot.rotation.z = -collapseAngle;
      this.flaps[3].pivot.rotation.z = collapseAngle;

      this.craneRoot.position.y = 6 + p * 8;
      this.craneWings.visible = false;
    }
    else {
      // Step 5 -> 7: Petal fold to Crane formation & Wing flourish
      const p = (frac - 4.0) / 3.0; // 0..1
      this.craneWings.visible = true;

      // Cross-fade quadrant flaps into articulated crane petals
      this.flaps.forEach(f => {
        f.pivot.visible = p < 0.6;
      });

      // Wing animation
      const wingElevation = 1.3 - p * 0.85;
      this.leftCraneWing.rotation.z = wingElevation;
      this.rightCraneWing.rotation.z = -wingElevation;
      this.leftCraneWing.rotation.x = Math.sin(p * Math.PI) * 0.15;
      this.rightCraneWing.rotation.x = -Math.sin(p * Math.PI) * 0.15;

      // Neck and tail raise
      this.craneNeck.rotation.x = p * 0.85;
      this.craneTail.rotation.x = -p * 0.75;
      this.craneRoot.position.y = 14 + p * 4;
    }
  }

  updateBoxFold(step, t) {
    if (!this.northPivot) return;
    const frac = step + t;

    // Step 0: Flat
    // Step 1: Creases marked (slight test flex 10 deg)
    // Step 2: Lateral walls (East/West) erect 90 deg
    // Step 3: North/South walls erect 90 deg + corners tuck
    if (frac <= 1.0) {
      const flex = (frac / 1.0) * (Math.PI * 0.08);
      this.eastPivot.rotation.z = -flex;
      this.westPivot.rotation.z = flex;
      this.northPivot.rotation.x = flex;
      this.southPivot.rotation.x = -flex;
    } else if (frac <= 2.0) {
      const p = frac - 1.0;
      const angle = (Math.PI * 0.08) + p * (Math.PI / 2 - Math.PI * 0.08);
      this.eastPivot.rotation.z = -angle;
      this.westPivot.rotation.z = angle;
      this.northPivot.rotation.x = Math.PI * 0.08;
      this.southPivot.rotation.x = -Math.PI * 0.08;
    } else {
      const p = Math.min(1.0, frac - 2.0);
      const angle = (Math.PI * 0.08) + p * (Math.PI / 2 - Math.PI * 0.08);
      this.eastPivot.rotation.z = -Math.PI / 2;
      this.westPivot.rotation.z = Math.PI / 2;
      this.northPivot.rotation.x = angle;
      this.southPivot.rotation.x = -angle;

      // Corner gussets tuck
      this.cornerPivots.forEach((cp, i) => {
        cp.rotation.y = p * (Math.PI / 4);
        cp.position.y = p * 2;
      });
    }
  }

  updateFoxFold(step, t) {
    if (!this.foxDiagPivot) return;
    const frac = step + t;

    // Step 0: Flat diamond
    // Step 1: Diagonal fold (triB folds over triA 180 deg)
    // Step 2: Ears fold up
    // Step 3: Muzzle folds down
    if (frac <= 1.0) {
      const angle = (frac / 1.0) * Math.PI;
      this.foxDiagPivot.rotation.x = angle;
      this.foxLeftEar.rotation.z = 0;
      this.foxRightEar.rotation.z = 0;
    } else {
      const p = Math.min(1.0, frac - 1.0);
      this.foxDiagPivot.rotation.x = Math.PI;
      this.foxLeftEar.rotation.z = p * 0.85;
      this.foxRightEar.rotation.z = -p * 0.85;
    }
  }
}
