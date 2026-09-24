import * as THREE from 'three';

/**
 * Procedural mesh generator for simulated origami paper.
 * It builds a dual-sided segmented paper mesh with visible crease lines
 * and articulates facets along designated fold hinges.
 */

export class OrigamiPaperMesh {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.currentStep = 0;
    this.foldProgress = 0; // 0.0 to 1.0 within the step

    this.initMaterials();
    this.buildFoldStructure();
  }

  initMaterials() {
    // Elegant washi-paper texture simulation with subtle warm off-white and reverse color
    this.frontMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbf9f5,
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.FrontSide,
      flatShading: true
    });

    this.backMaterial = new THREE.MeshStandardMaterial({
      color: 0x93c5fd, // Light serene blue for reverse side of origami paper
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.BackSide,
      flatShading: true
    });

    this.creaseLineMaterial = new THREE.LineBasicMaterial({
      color: 0x334155,
      linewidth: 2,
      depthTest: true
    });

    this.highlightCreaseMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // Amber highlight
      linewidth: 4,
      depthTest: false
    });
  }

  buildFoldStructure() {
    // Clear previous objects
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
    }

    if (this.model.id === 'crane-classic') {
      this.buildCraneMesh();
    } else if (this.model.id === 'origami-box') {
      this.buildBoxMesh();
    } else {
      this.buildFoxMesh();
    }
  }

  /**
   * Generates articulated faceted wings, neck, tail, and body
   * for the Crane model based on fold progress.
   */
  buildCraneMesh() {
    this.facetsGroup = new THREE.Group();
    const half = this.paperSize / 2;

    // Flat paper sheet visible during step 0 and cross-fading smoothly
    const flatGeo = new THREE.PlaneGeometry(this.paperSize, this.paperSize, 2, 2);
    flatGeo.rotateX(-Math.PI / 2);
    this.flatSheet = new THREE.Mesh(flatGeo, this.frontMaterial);
    this.flatSheet.receiveShadow = true;
    this.flatSheet.castShadow = true;

    // Crease lines overlay on 3D sheet
    const lineCoords = [
      -half, 0.05, -half,  half, 0.05, half,
      -half, 0.05, half,   half, 0.05, -half,
      0, 0.05, -half,      0, 0.05, half,
      -half, 0.05, 0,      half, 0.05, 0
    ];
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    this.creaseLines3D = new THREE.LineSegments(lineGeo, this.creaseLineMaterial);
    this.flatSheet.add(this.creaseLines3D);

    this.group.add(this.flatSheet);

    // Folded Crane parts group
    this.cranePartsGroup = new THREE.Group();

    // Central body spine
    const spineGeo = new THREE.BufferGeometry();
    const s = 25;
    const verts = new Float32Array([
      0, 0, s,     -s, 0, 0,     0, s*0.3, 0,
      0, 0, s,      0, s*0.3, 0,  s, 0, 0,
      0, 0, -s,     s, 0, 0,     0, s*0.3, 0,
      0, 0, -s,     0, s*0.3, 0, -s, 0, 0
    ]);
    spineGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    spineGeo.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(spineGeo, this.frontMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;

    // Wing Left
    this.leftWing = new THREE.Group();
    this.leftWing.position.set(-s * 0.5, 0, 0);
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0, 0, -s,    -s * 1.8, s * 0.4, 0,   0, 0, s,
      0, 0, s,     -s * 1.8, s * 0.4, 0,   0, -s*0.1, 0
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    const wingMesh = new THREE.Mesh(wingGeo, this.frontMaterial);
    wingMesh.castShadow = true;
    this.leftWing.add(wingMesh);

    // Wing Right
    this.rightWing = new THREE.Group();
    this.rightWing.position.set(s * 0.5, 0, 0);
    const rWingGeo = new THREE.BufferGeometry();
    const rWingVerts = new Float32Array([
      0, 0, s,     s * 1.8, s * 0.4, 0,    0, 0, -s,
      0, 0, -s,    s * 1.8, s * 0.4, 0,    0, -s*0.1, 0
    ]);
    rWingGeo.setAttribute('position', new THREE.BufferAttribute(rWingVerts, 3));
    rWingGeo.computeVertexNormals();
    const rWingMesh = new THREE.Mesh(rWingGeo, this.frontMaterial);
    rWingMesh.castShadow = true;
    this.rightWing.add(rWingMesh);

    // Neck + Head
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0, s * 0.8);
    const neckGeo = new THREE.BufferGeometry();
    const neckVerts = new Float32Array([
      -2, 0, 0,    2, 0, 0,    0, s * 1.4, s * 0.8,
      0, s * 1.4, s * 0.8,   -2, s * 1.2, s * 1.1,  0, s * 1.1, s * 1.2
    ]);
    neckGeo.setAttribute('position', new THREE.BufferAttribute(neckVerts, 3));
    neckGeo.computeVertexNormals();
    const neckMesh = new THREE.Mesh(neckGeo, this.frontMaterial);
    neckMesh.castShadow = true;
    this.neckGroup.add(neckMesh);

    // Tail
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0, -s * 0.8);
    const tailGeo = new THREE.BufferGeometry();
    const tailVerts = new Float32Array([
      -2, 0, 0,    0, s * 1.3, -s * 0.9,   2, 0, 0
    ]);
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    tailGeo.computeVertexNormals();
    const tailMesh = new THREE.Mesh(tailGeo, this.frontMaterial);
    tailMesh.castShadow = true;
    this.tailGroup.add(tailMesh);

    this.cranePartsGroup.add(bodyMesh);
    this.cranePartsGroup.add(this.leftWing);
    this.cranePartsGroup.add(this.rightWing);
    this.cranePartsGroup.add(this.neckGroup);
    this.cranePartsGroup.add(this.tailGroup);

    this.facetsGroup.add(this.cranePartsGroup);
    this.group.add(this.facetsGroup);
    this.updateCraneStep(0, 0);
  }

  buildBoxMesh() {
    this.facetsGroup = new THREE.Group();
    const b = 25; // base half-width
    const h = 25; // wall height

    // Bottom Base
    const baseGeo = new THREE.PlaneGeometry(b * 2, b * 2);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, this.frontMaterial);
    baseMesh.receiveShadow = true;
    this.facetsGroup.add(baseMesh);

    // 4 Walls
    this.boxWalls = [];
    const wallConfigs = [
      { pos: [0, 0, b], rotAxis: 'x', dir: 1 },
      { pos: [0, 0, -b], rotAxis: 'x', dir: -1 },
      { pos: [b, 0, 0], rotAxis: 'z', dir: -1 },
      { pos: [-b, 0, 0], rotAxis: 'z', dir: 1 }
    ];

    wallConfigs.forEach(cfg => {
      const pivot = new THREE.Group();
      pivot.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

      const wallGeo = new THREE.PlaneGeometry(b * 2, h);
      wallGeo.translate(0, h / 2, 0);
      if (cfg.rotAxis === 'z') {
        wallGeo.rotateY(Math.PI / 2);
      }
      const wallMesh = new THREE.Mesh(wallGeo, this.frontMaterial);
      wallMesh.castShadow = true;
      pivot.add(wallMesh);

      this.facetsGroup.add(pivot);
      this.boxWalls.push({ pivot, cfg });
    });

    this.group.add(this.facetsGroup);
  }

  buildFoxMesh() {
    this.facetsGroup = new THREE.Group();
    const s = 30;

    // Diamond face
    const faceGeo = new THREE.BufferGeometry();
    const fVerts = new Float32Array([
      0, s, 0,    -s, 0, 0,    0, -s, 0,
      0, s, 0,     0, -s, 0,   s, 0, 0
    ]);
    faceGeo.setAttribute('position', new THREE.BufferAttribute(fVerts, 3));
    faceGeo.computeVertexNormals();
    const faceMesh = new THREE.Mesh(faceGeo, this.frontMaterial);

    // Left Ear
    this.leftEar = new THREE.Group();
    this.leftEar.position.set(-s * 0.5, s * 0.5, 0);
    const earGeo = new THREE.BufferGeometry();
    const eVerts = new Float32Array([
      0, 0, 0,   -s * 0.8, s * 0.8, s * 0.2,   0, s * 0.8, 0
    ]);
    earGeo.setAttribute('position', new THREE.BufferAttribute(eVerts, 3));
    earGeo.computeVertexNormals();
    const earMesh = new THREE.Mesh(earGeo, this.frontMaterial);
    this.leftEar.add(earMesh);

    // Right Ear
    this.rightEar = new THREE.Group();
    this.rightEar.position.set(s * 0.5, s * 0.5, 0);
    const rEarGeo = new THREE.BufferGeometry();
    const reVerts = new Float32Array([
      0, 0, 0,   0, s * 0.8, 0,   s * 0.8, s * 0.8, s * 0.2
    ]);
    rEarGeo.setAttribute('position', new THREE.BufferAttribute(reVerts, 3));
    rEarGeo.computeVertexNormals();
    const rEarMesh = new THREE.Mesh(rEarGeo, this.frontMaterial);
    this.rightEar.add(rEarMesh);

    this.facetsGroup.add(faceMesh);
    this.facetsGroup.add(this.leftEar);
    this.facetsGroup.add(this.rightEar);

    this.group.add(this.facetsGroup);
  }

  /**
   * Set the exact progress of the animation:
   * stepIndex: current step (0 to steps.length - 1)
   * progress: 0.0 to 1.0 interpolation for that step
   */
  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'crane-classic') {
      this.updateCraneStep(stepIndex, this.foldProgress);
    } else if (this.model.id === 'origami-box') {
      this.updateBoxStep(stepIndex, this.foldProgress);
    } else {
      this.updateFoxStep(stepIndex, this.foldProgress);
    }
  }

  updateCraneStep(step, t) {
    const totalSteps = this.model.steps.length;
    // Calculate global fold ratio (0 = flat sheet, 1 = fully folded crane)
    const globalT = (step + t) / (totalSteps - 1);

    if (this.flatSheet && this.cranePartsGroup) {
      if (step === 0 && t < 0.1) {
        this.flatSheet.visible = true;
        this.cranePartsGroup.visible = false;
      } else {
        this.flatSheet.visible = false;
        this.cranePartsGroup.visible = true;
      }
    }

    // Wings fold from flat (step 0..3) into compact (step 4..6), then expand outwards (step 7)
    if (this.leftWing && this.rightWing) {
      if (step < 4) {
        const angle = (step + t) * 0.18;
        this.leftWing.rotation.z = angle;
        this.rightWing.rotation.z = -angle;
        this.leftWing.rotation.y = 0;
        this.rightWing.rotation.y = 0;
      } else if (step < 7) {
        this.leftWing.rotation.z = 0.72 + (step - 4 + t) * 0.22;
        this.rightWing.rotation.z = -0.72 - (step - 4 + t) * 0.22;
      } else {
        // Step 7: Wing unfolding flourish!
        const wingFlourish = 1.38 - t * 0.95;
        this.leftWing.rotation.z = wingFlourish;
        this.rightWing.rotation.z = -wingFlourish;
        this.leftWing.rotation.x = Math.sin(t * Math.PI) * 0.2;
        this.rightWing.rotation.x = -Math.sin(t * Math.PI) * 0.2;
      }
    }

    if (this.neckGroup && this.tailGroup) {
      const neckAngle = Math.min(1, Math.max(0, (step - 3 + t) / 3)) * 0.95;
      this.neckGroup.rotation.x = neckAngle;
      this.tailGroup.rotation.x = -neckAngle * 0.85;
    }

    // Dynamic paper elevation
    this.facetsGroup.position.y = (1 - Math.cos(globalT * Math.PI * 0.5)) * 14;
  }

  updateBoxStep(step, t) {
    if (!this.boxWalls) return;
    const wallAngle = Math.min(Math.PI / 2, ((step + t) / (this.model.steps.length - 1)) * (Math.PI / 2));

    this.boxWalls.forEach(({ pivot, cfg }) => {
      if (cfg.rotAxis === 'x') {
        pivot.rotation.x = -cfg.dir * wallAngle;
      } else {
        pivot.rotation.z = cfg.dir * wallAngle;
      }
    });
  }

  updateFoxStep(step, t) {
    if (!this.leftEar || !this.rightEar) return;
    const earAngle = ((step + t) / (this.model.steps.length - 1)) * (Math.PI * 0.4);
    this.leftEar.rotation.z = earAngle;
    this.rightEar.rotation.z = -earAngle;
    this.leftEar.rotation.y = earAngle * 0.3;
    this.rightEar.rotation.y = -earAngle * 0.3;
  }
}
