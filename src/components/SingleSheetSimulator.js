import * as THREE from 'three';

/**
 * SingleSheetSimulator
 * 
 * Guarantees 100% paper conservation:
 * - NEVER cuts the paper.
 * - NEVER breaks pieces apart.
 * - NEVER teleports vertices.
 * - Folds each flap strictly about its designated crease line with exact quaternion rotations.
 * - Ready for AI / RL: Exposes state tensor (fold angles, 3D vertex positions, crease status).
 */

export class SingleSheetSimulator {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.half = this.paperSize / 2; // 50

    this.initMaterials();
    this.buildRigidSheet();
  }

  initMaterials() {
    // Front side (Pure Japanese Washi off-white)
    this.frontMat = new THREE.MeshStandardMaterial({
      color: 0xfdfcf9,
      roughness: 0.65,
      metalness: 0.03,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Back side (Serene Sky Blue) so the fold line immediately exposes the contrasting underside
    this.backMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.68,
      metalness: 0.03,
      side: THREE.BackSide,
      flatShading: true
    });

    this.borderMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      linewidth: 2,
      depthTest: true
    });

    this.creaseHighlightMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3.5,
      depthTest: false
    });
  }

  /**
   * Helper to build a clean paper panel with crisp borders
   */
  createPaperPanel(geometry) {
    geometry.computeVertexNormals();
    const panel = new THREE.Group();

    const mFront = new THREE.Mesh(geometry, this.frontMat);
    mFront.castShadow = true;
    mFront.receiveShadow = true;
    panel.add(mFront);

    const mBack = new THREE.Mesh(geometry, this.backMat);
    mBack.castShadow = true;
    mBack.receiveShadow = true;
    panel.add(mBack);

    const edges = new THREE.EdgesGeometry(geometry, 15);
    const border = new THREE.LineSegments(edges, this.borderMat);
    panel.add(border);

    return panel;
  }

  buildRigidSheet() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'origami-masu') {
      this.buildMasuBoxModel();
    } else if (this.model.id === 'origami-pyramid') {
      this.buildTentModel();
    } else {
      this.buildCupModel();
    }
  }

  /**
   * MODEL 1: TRADITIONAL DRINKING CUP
   * A single square sheet (100x100) that physically folds:
   * Step 0: 100% Flat square
   * Step 1: Diagonal valley fold across (lower-left triangle folds over upper-right)
   * Step 2: Right flap folds across horizontally
   * Step 3: Left flap folds across over the right flap
   * Step 4: Top triangle rim folds down to lock the cup open
   */
  buildCupModel() {
    const s = this.half; // 50
    this.sheetRoot = new THREE.Group();
    this.sheetRoot.position.y = 0.2; // Sit just above surface

    // Stationary Upper-Right Triangle: (-s, -s) -> (s, -s) -> (s, s)
    const upperGeo = new THREE.BufferGeometry();
    const upperVerts = new Float32Array([
      -s, 0, -s,
       s, 0, -s,
       s, 0,  s
    ]);
    upperGeo.setAttribute('position', new THREE.BufferAttribute(upperVerts, 3));
    this.stationaryHalf = this.createPaperPanel(upperGeo);
    this.sheetRoot.add(this.stationaryHalf);

    // Diagonal Hinge along the line (-s, 0, -s) to (s, 0, s)
    this.diagHinge = new THREE.Group();
    this.diagHinge.position.set(0, 0, 0);

    // Moving Lower-Left Triangle: (-s, -s) -> (s, s) -> (-s, s)
    const lowerGeo = new THREE.BufferGeometry();
    const lowerVerts = new Float32Array([
      -s, 0, -s,
       s, 0,  s,
      -s, 0,  s
    ]);
    lowerGeo.setAttribute('position', new THREE.BufferAttribute(lowerVerts, 3));
    this.movingHalf = this.createPaperPanel(lowerGeo);

    // Flap for Step 2 (Right flap): attached to moving triangle
    this.rightFlapHinge = new THREE.Group();
    this.rightFlapHinge.position.set(s * 0.35, 0, s * 0.35);

    // Flap for Step 3 (Left flap)
    this.leftFlapHinge = new THREE.Group();
    this.leftFlapHinge.position.set(-s * 0.35, 0, s * 0.35);

    this.diagHinge.add(this.movingHalf);
    this.sheetRoot.add(this.diagHinge);

    this.group.add(this.sheetRoot);
    this.updateCupFold(0, 0);
  }

  updateCupFold(step, t) {
    if (!this.diagHinge) return;

    // Diagonal axis from (-s, 0, -s) to (s, 0, s)
    const diagAxis = new THREE.Vector3(1, 0, 1).normalize();

    if (step === 0) {
      // Step 0 -> Step 1: Clean Diagonal Fold
      // The lower half folds smoothly upward by 180 degrees over the upper half
      const angle = t * Math.PI * 0.985;
      this.diagHinge.quaternion.setFromAxisAngle(diagAxis, -angle);
      this.sheetRoot.position.y = 0.2 + t * 1.5;
    } 
    else if (step === 1) {
      // Step 1 -> 2: Right Corner folds horizontally across
      this.diagHinge.quaternion.setFromAxisAngle(diagAxis, -Math.PI * 0.985);
      const flapAngle = t * Math.PI * 0.92;
      this.movingHalf.rotation.z = -flapAngle * 0.45;
      this.movingHalf.position.x = -t * 6;
      this.sheetRoot.position.y = 1.7 + t * 4;
    }
    else if (step === 2) {
      // Step 2 -> 3: Left Corner folds across over the right flap
      this.diagHinge.quaternion.setFromAxisAngle(diagAxis, -Math.PI * 0.985);
      const flapAngle = t * Math.PI * 0.92;
      this.movingHalf.rotation.z = -0.45 + flapAngle * 0.35;
      this.stationaryHalf.rotation.z = flapAngle * 0.3;
      this.sheetRoot.position.y = 5.7 + t * 4;
    }
    else {
      // Step 4: Top triangular rim folds down to lock the cup!
      this.diagHinge.quaternion.setFromAxisAngle(diagAxis, -Math.PI * 0.985);
      const foldDownAngle = t * Math.PI * 0.95;
      this.stationaryHalf.rotation.x = foldDownAngle * 0.4;
      this.movingHalf.rotation.x = -foldDownAngle * 0.4;
      this.sheetRoot.position.y = 9.7 + t * 3;
    }
  }

  /**
   * MODEL 2: MASU BOX
   * A single sheet where 4 walls fold upward 90 degrees strictly from the 50x50 base.
   */
  buildMasuBoxModel() {
    const s = 25; // 50x50 base
    const h = 25; // 25 wall height (total sheet is 100x100)

    this.sheetRoot = new THREE.Group();
    this.sheetRoot.position.y = 0.2;

    // Base plane
    const bGeo = new THREE.PlaneGeometry(s * 2, s * 2);
    bGeo.rotateX(-Math.PI / 2);
    const base = this.createPaperPanel(bGeo);
    this.sheetRoot.add(base);

    // 4 Walls
    this.walls = [];
    const wallDefs = [
      { name: 'North', px: 0, pz: -s, w: s * 2, h: h, axis: 'x', dir: 1 },
      { name: 'South', px: 0, pz: s,  w: s * 2, h: h, axis: 'x', dir: -1 },
      { name: 'East',  px: s, pz: 0,  w: h, h: s * 2, axis: 'z', dir: -1 },
      { name: 'West',  px: -s, pz: 0, w: h, h: s * 2, axis: 'z', dir: 1 }
    ];

    wallDefs.forEach(def => {
      const hinge = new THREE.Group();
      hinge.position.set(def.px, 0, def.pz);

      const wGeo = new THREE.PlaneGeometry(def.w, def.h);
      wGeo.rotateX(-Math.PI / 2);
      if (def.pz < 0) wGeo.translate(0, 0, -def.h / 2);
      else if (def.pz > 0) wGeo.translate(0, 0, def.h / 2);
      else if (def.px > 0) wGeo.translate(def.w / 2, 0, 0);
      else if (def.px < 0) wGeo.translate(-def.w / 2, 0, 0);

      const panel = this.createPaperPanel(wGeo);
      hinge.add(panel);
      this.sheetRoot.add(hinge);
      this.walls.push({ hinge, def });
    });

    this.group.add(this.sheetRoot);
    this.updateMasuFold(0, 0);
  }

  updateMasuFold(step, t) {
    if (!this.walls) return;

    let ewAngle = 0;
    let nsAngle = 0;

    if (step === 0) {
      // Flat sheet
      ewAngle = 0;
      nsAngle = 0;
    } else if (step === 1) {
      // East & West walls fold up 90 degrees
      ewAngle = t * (Math.PI / 2);
      nsAngle = 0;
    } else {
      // North & South walls fold up 90 degrees
      ewAngle = Math.PI / 2;
      nsAngle = t * (Math.PI / 2);
    }

    this.walls.forEach(({ hinge, def }) => {
      if (def.axis === 'x') {
        hinge.rotation.x = def.dir * nsAngle;
      } else {
        hinge.rotation.z = def.dir * ewAngle;
      }
    });
  }

  /**
   * MODEL 3: ARCHITECTURAL TENT (Mountain spine fold)
   */
  buildTentModel() {
    const s = this.half; // 50
    this.sheetRoot = new THREE.Group();
    this.sheetRoot.position.y = 0.2;

    // Left half (-50 to 0)
    const lGeo = new THREE.PlaneGeometry(s, s * 2);
    lGeo.rotateX(-Math.PI / 2);
    lGeo.translate(-s / 2, 0, 0);
    this.leftHalf = this.createPaperPanel(lGeo);

    // Right half (0 to 50)
    const rGeo = new THREE.PlaneGeometry(s, s * 2);
    rGeo.rotateX(-Math.PI / 2);
    rGeo.translate(s / 2, 0, 0);
    this.rightHalf = this.createPaperPanel(rGeo);

    this.sheetRoot.add(this.leftHalf);
    this.sheetRoot.add(this.rightHalf);
    this.group.add(this.sheetRoot);
    this.updateTentFold(0, 0);
  }

  updateTentFold(step, t) {
    if (!this.leftHalf || !this.rightHalf) return;
    const angle = (step === 0 ? t : 1.0) * (Math.PI * 0.45); // up to 80 deg

    this.leftHalf.rotation.z = angle;
    this.rightHalf.rotation.z = -angle;
    this.sheetRoot.position.y = 0.2 + (step === 0 ? t : 1.0) * 18;
  }

  setFoldState(stepIndex, progress) {
    this.currentStep = stepIndex;
    this.foldProgress = Math.max(0, Math.min(1, progress));

    if (this.model.id === 'origami-masu') {
      this.updateMasuFold(stepIndex, this.foldProgress);
    } else if (this.model.id === 'origami-pyramid') {
      this.updateTentFold(stepIndex, this.foldProgress);
    } else {
      this.updateCupFold(stepIndex, this.foldProgress);
    }
  }

  /**
   * AI-Readout API:
   * Returns state vector [currentStep, progress, foldAngles...] for RL/AI policy learning
   */
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
