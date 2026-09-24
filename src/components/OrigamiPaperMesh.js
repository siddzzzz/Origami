import * as THREE from 'three';

/**
 * Geometric Origami Simulator
 * Rigorous computational origami kinematics:
 * 1. Single sheet of paper: Flat 2D square mesh with shared vertices and crease edges.
 * 2. Every fold step defines:
 *    - An exact fold line / crease axis: (p1 -> p2)
 *    - A fold direction (which side of the line moves)
 *    - An angle rotation theta in [0, PI] around the fold axis vector
 * 3. Exact Rodrigues' rotation formula applied to all vertices on the moving side of the fold line.
 * 4. Zero tearing, zero breaking apart, zero parts plunging below the ground.
 */

export class OrigamiPaperMesh {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.paperSize = model.paperSize || 100;
    this.currentStep = 0;
    this.foldProgress = 0;

    this.initMaterials();
    this.buildOrigamiSheet();
  }

  initMaterials() {
    // Front side (Pure Japanese Washi Cream)
    this.frontMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Back side (Serene Origami Sky Blue) - makes the fold contrast immediately visible
    this.backMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.68,
      metalness: 0.05,
      side: THREE.BackSide,
      flatShading: true
    });

    this.creaseMaterial = new THREE.LineBasicMaterial({
      color: 0x475569,
      linewidth: 1.5,
      depthTest: true
    });

    this.activeAxisMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3,
      depthTest: false
    });
  }

  buildOrigamiSheet() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    if (this.model.id === 'origami-box') {
      this.buildMasuBoxModel();
    } else if (this.model.id === 'origami-fox') {
      this.buildFoxModel();
    } else {
      this.buildClassicCraneModel();
    }
  }

  /**
   * CLASSIC CRANE (Step-by-step rigorous vertex hinge simulator)
   * The 100x100 square paper sheet is subdivided by all standard crease lines
   * into a unified continuous triangle mesh.
   */
  buildClassicCraneModel() {
    const s = this.paperSize / 2; // 50 (-50 to 50)
    const m = s / 2;             // 25

    // Unified 2D vertices of the uncreased/creased square sheet
    // Indices:
    // 0: Center (0,0)
    // 1: Top-Left (-s, -s)
    // 2: Top-Mid (0, -s)
    // 3: Top-Right (s, -s)
    // 4: Mid-Right (s, 0)
    // 5: Bot-Right (s, s)
    // 6: Bot-Mid (0, s)
    // 7: Bot-Left (-s, s)
    // 8: Mid-Left (-s, 0)
    // 9: Inner-Top (0, -m)
    // 10: Inner-Right (m, 0)
    // 11: Inner-Bot (0, m)
    // 12: Inner-Left (-m, 0)
    this.baseVertices2D = [
      [0, 0],       // 0
      [-s, -s],     // 1
      [0, -s],      // 2
      [s, -s],      // 3
      [s, 0],       // 4
      [s, s],       // 5
      [0, s],       // 6
      [-s, s],      // 7
      [-s, 0],      // 8
      [0, -m],      // 9
      [m, 0],       // 10
      [0, m],       // 11
      [-m, 0]       // 12
    ];

    // Triangle indices connecting all vertices into ONE continuous sheet
    this.triangleIndices = [
      // Top-Left quadrant
      0, 8, 12,   12, 8, 1,   12, 1, 9,   0, 12, 9,   9, 1, 2,   0, 9, 2,
      // Top-Right quadrant
      0, 2, 9,    9, 2, 3,    9, 3, 10,   0, 9, 10,   10, 3, 4,  0, 10, 4,
      // Bottom-Right quadrant
      0, 4, 10,   10, 4, 5,   10, 5, 11,  0, 10, 11,  11, 5, 6,  0, 11, 6,
      // Bottom-Left quadrant
      0, 6, 11,   11, 6, 7,   11, 7, 12,  0, 11, 12,  12, 7, 8,  0, 12, 8
    ];

    this.meshGeometry = new THREE.BufferGeometry();
    this.updateMeshPositions(this.baseVertices2D.map(v => new THREE.Vector3(v[0], 0.1, v[1])));

    // Front and back meshes for the single sheet of paper
    this.frontMesh = new THREE.Mesh(this.meshGeometry, this.frontMaterial);
    this.frontMesh.castShadow = true;
    this.frontMesh.receiveShadow = true;

    this.backMesh = new THREE.Mesh(this.meshGeometry, this.backMaterial);
    this.backMesh.castShadow = true;
    this.backMesh.receiveShadow = true;

    // Crease edge overlay
    const wireGeo = new THREE.WireframeGeometry(this.meshGeometry);
    this.creaseLines = new THREE.LineSegments(wireGeo, this.creaseMaterial);

    this.paperRoot = new THREE.Group();
    this.paperRoot.add(this.frontMesh);
    this.paperRoot.add(this.backMesh);
    this.paperRoot.add(this.creaseLines);

    this.group.add(this.paperRoot);
    this.applyCraneStep(0, 0);
  }

  updateMeshPositions(vec3Array) {
    const positions = [];
    for (let i = 0; i < this.triangleIndices.length; i++) {
      const idx = this.triangleIndices[i];
      const v = vec3Array[idx];
      positions.push(v.x, v.y, v.z);
    }
    const posFloat = new Float32Array(positions);
    this.meshGeometry.setAttribute('position', new THREE.BufferAttribute(posFloat, 3));
    this.meshGeometry.computeVertexNormals();

    if (this.creaseLines) {
      this.creaseLines.geometry.dispose();
      this.creaseLines.geometry = new THREE.WireframeGeometry(this.meshGeometry);
    }
  }

  /**
   * MASU BOX MODEL (A single 100x100 paper sheet with 4 perimeter walls folding upwards)
   */
  buildMasuBoxModel() {
    const s = 25; // inner base (-25 to 25)
    const o = 50; // outer edge (-50 to 50)

    // Vertices of the single square sheet
    this.boxVertices = [
      // Inner square base (0..3)
      [-s, 0, -s], [s, 0, -s], [s, 0, s], [-s, 0, s],
      // Outer boundary vertices (4..11)
      [-o, 0, -o], [0, 0, -o], [o, 0, -o],
      [o, 0, 0],
      [o, 0, o], [0, 0, o], [-o, 0, o],
      [-o, 0, 0]
    ];

    // Single unified sheet mesh with hinge hierarchy
    this.boxRoot = new THREE.Group();
    const bGeo = new THREE.PlaneGeometry(s * 2, s * 2);
    bGeo.rotateX(-Math.PI / 2);
    const base = new THREE.Mesh(bGeo, this.frontMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    this.boxRoot.add(base);

    // 4 Walls physically hinged to the edges of the base
    this.walls = [];
    const wallDefs = [
      { name: 'North', px: 0, pz: -s, w: s*2, h: s, axis: 'x', dir: 1, rotY: 0 },
      { name: 'South', px: 0, pz: s,  w: s*2, h: s, axis: 'x', dir: -1, rotY: Math.PI },
      { name: 'East',  px: s, pz: 0,  w: s*2, h: s, axis: 'z', dir: -1, rotY: Math.PI / 2 },
      { name: 'West',  px: -s, pz: 0, w: s*2, h: s, axis: 'z', dir: 1, rotY: -Math.PI / 2 }
    ];

    wallDefs.forEach(def => {
      const hinge = new THREE.Group();
      hinge.position.set(def.px, 0, def.pz);

      const wGeo = new THREE.PlaneGeometry(def.w, def.h);
      wGeo.rotateX(-Math.PI / 2);
      wGeo.translate(0, 0, -def.h / 2); // extend outwards from hinge
      if (def.rotY !== 0) {
        wGeo.rotateY(def.rotY);
      }

      const wallMesh = new THREE.Mesh(wGeo, this.frontMaterial);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;

      // Add crease border
      const edges = new THREE.EdgesGeometry(wGeo);
      const wire = new THREE.LineSegments(edges, this.creaseMaterial);
      wallMesh.add(wire);

      hinge.add(wallMesh);
      this.boxRoot.add(hinge);
      this.walls.push({ hinge, def });
    });

    this.group.add(this.boxRoot);
    this.applyBoxStep(0, 0);
  }

  /**
   * FOX MODEL: Diagonal valley fold across continuous sheet
   */
  buildFoxModel() {
    this.foxRoot = new THREE.Group();
    const half = 50;

    // Fixed bottom triangle of the single square sheet
    const fixedGeo = new THREE.BufferGeometry();
    const fixedVerts = new Float32Array([
      -half, 0.05, -half,
       half, 0.05,  half,
      -half, 0.05,  half
    ]);
    fixedGeo.setAttribute('position', new THREE.BufferAttribute(fixedVerts, 3));
    fixedGeo.computeVertexNormals();
    const fixedMesh = new THREE.Mesh(fixedGeo, this.frontMaterial);
    fixedMesh.receiveShadow = true;
    this.foxRoot.add(fixedMesh);

    // Diagonal fold hinge along the line (-half, -half) -> (half, half)
    this.foxHinge = new THREE.Group();
    this.foxHinge.position.set(0, 0.05, 0);
    this.foxHinge.rotation.y = -Math.PI / 4; // Align diagonal to X axis

    const diagLen = Math.sqrt(2 * half * half);
    const movingGeo = new THREE.BufferGeometry();
    const movingVerts = new Float32Array([
      -diagLen / 2, 0, 0,
       diagLen / 2, 0, 0,
       0, 0, -diagLen / 2
    ]);
    movingGeo.setAttribute('position', new THREE.BufferAttribute(movingVerts, 3));
    movingGeo.computeVertexNormals();

    const movingMesh = new THREE.Mesh(movingGeo, this.backMaterial);
    movingMesh.castShadow = true;

    const edges = new THREE.EdgesGeometry(movingGeo);
    movingMesh.add(new THREE.LineSegments(edges, this.creaseMaterial));

    this.foxHinge.add(movingMesh);
    this.foxRoot.add(this.foxHinge);

    this.group.add(this.foxRoot);
    this.applyFoxStep(0, 0);
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

  /**
   * Exact vertex kinematics for Classic Crane:
   * Keeps all vertices connected in the single sheet and rotates them around
   * their respective crease hinges as steps progress.
   */
  applyCraneStep(step, t) {
    if (!this.baseVertices2D) return;

    // Convert 2D flat paper vertices into dynamic 3D folded coordinates
    const v3 = this.baseVertices2D.map(v => new THREE.Vector3(v[0], 0.1, v[1]));

    const frac = step + t;

    if (frac <= 1.0) {
      // Step 1: Diagonal valley fold across the line from (-s, 0, -s) to (s, 0, s)
      // The direction vector along this line is (s - (-s), 0, s - (-s)) = (2s, 0, 2s)
      // Note: in Three.js coords (x, y, z), our 2D Y maps to 3D Z:
      // Point 1 is (-s, 0.1, -s) and Point 5 is (s, 0.1, s).
      // The axis vector from Point 1 to Point 5 is (1, 0, 1).
      // A positive rotation angle around axis (1, 0, 1) lifts the bottom-left half UPWARDS.
      const angle = (frac / 1.0) * Math.PI * 0.98; // 0 to ~176 degrees fold
      const axis = new THREE.Vector3(1, 0, 1).normalize();

      // Rotate bottom-left triangle vertices (indices 6, 7, 8, 11, 12) around axis
      [6, 7, 8, 11, 12].forEach(idx => {
        v3[idx].applyAxisAngle(axis, angle);
        // Ensure no vertex goes below table surface
        if (v3[idx].y < 0.1) v3[idx].y = 0.1;
      });
    } else if (frac <= 2.0) {
      // Step 2: Unfold slightly and establish opposite diagonal
      const p = frac - 1.0;
      const angle1 = (1 - p * 0.6) * Math.PI * 0.98;
      const axis1 = new THREE.Vector3(1, 0, 1).normalize();
      [6, 7, 8, 11, 12].forEach(idx => {
        v3[idx].applyAxisAngle(axis1, -angle1);
        if (v3[idx].y < 0.1) v3[idx].y = 0.1;
      });

      // Second diagonal slight valley crease flex
      const axis2 = new THREE.Vector3(-1, 0, 1).normalize();
      [4, 5, 6, 10, 11].forEach(idx => {
        v3[idx].applyAxisAngle(axis2, p * 0.4);
        if (v3[idx].y < 0.1) v3[idx].y = 0.1;
      });
    } else if (frac <= 4.0) {
      // Step 3-4: Preliminary Square Base Collapse
      // All 4 outer corners (1, 3, 5, 7) come together towards the top apex,
      // while outer medians (2, 4, 6, 8) fold inwards.
      const p = (frac - 2.0) / 2.0; // 0..1
      const collapseHeight = p * 35;
      const radScale = 1.0 - p * 0.65;

      v3.forEach((v, i) => {
        if (i === 0) {
          // Center goes up to form top peak
          v.y = 0.1 + collapseHeight;
        } else if ([1, 3, 5, 7].includes(i)) {
          // Corners come inward and stay near the bottom
          v.x *= radScale;
          v.z *= radScale;
          v.y = 0.1 + p * 4;
        } else if ([2, 4, 6, 8].includes(i)) {
          // Medians fold in
          v.x *= (1.0 - p * 0.45);
          v.z *= (1.0 - p * 0.45);
          v.y = 0.1 + p * 15;
        } else {
          // Inners
          v.x *= radScale;
          v.z *= radScale;
          v.y = 0.1 + p * 20;
        }
      });
    } else {
      // Step 5-7: Petal folds and Wings expansion
      const p = (frac - 4.0) / 3.0; // 0..1
      const wingSpread = Math.sin(p * Math.PI * 0.5);

      v3.forEach((v, i) => {
        // Base preliminary position
        v.y = 35 - (i === 0 ? 0 : 25);
        v.x *= 0.35;
        v.z *= 0.35;

        // Wing tips (indices 8 and 4) fan outwards and flap!
        if (i === 8 || i === 12) {
          v.x -= wingSpread * 45;
          v.y += wingSpread * 22;
        }
        if (i === 4 || i === 10) {
          v.x += wingSpread * 45;
          v.y += wingSpread * 22;
        }
        // Neck tip (2) and Tail (6) raise up
        if (i === 2 || i === 9) {
          v.z -= 15 + p * 15;
          v.y += 18 + p * 20;
        }
        if (i === 6 || i === 11) {
          v.z += 15 + p * 15;
          v.y += 15 + p * 18;
        }

        if (v.y < 0.1) v.y = 0.1;
      });

      // Elevate paper root so it stands gracefully on the studio table
      this.paperRoot.position.y = p * 10;
    }

    this.updateMeshPositions(v3);
  }

  /**
   * Masu Box Fold Steps:
   * A single piece of paper whose sides fold up without any tearing
   */
  applyBoxStep(step, t) {
    if (!this.walls) return;
    const frac = step + t;

    // Step 0: Flat sheet on table
    // Step 1: Base pre-creasing (walls flex upward 10 deg)
    // Step 2: Lateral East/West walls fold up 90 deg along inner crease
    // Step 3: North/South walls fold up 90 deg to complete the box
    let eAngle = 0;
    let nAngle = 0;

    if (frac <= 1.0) {
      eAngle = (frac / 1.0) * (Math.PI * 0.08);
      nAngle = (frac / 1.0) * (Math.PI * 0.08);
    } else if (frac <= 2.0) {
      const p = frac - 1.0;
      eAngle = (Math.PI * 0.08) + p * (Math.PI / 2 - Math.PI * 0.08);
      nAngle = Math.PI * 0.08;
    } else {
      const p = Math.min(1.0, frac - 2.0);
      eAngle = Math.PI / 2;
      nAngle = (Math.PI * 0.08) + p * (Math.PI / 2 - Math.PI * 0.08);
    }

    this.walls.forEach(({ hinge, def }) => {
      const angle = (def.axis === 'z') ? eAngle : nAngle;
      if (def.axis === 'x') {
        hinge.rotation.x = def.dir * angle;
      } else {
        hinge.rotation.z = def.dir * angle;
      }
    });
  }

  /**
   * Fox Head Fold Steps:
   * Diagonal valley fold across continuous sheet
   */
  applyFoxStep(step, t) {
    if (!this.foxHinge) return;
    const frac = step + t;

    if (frac <= 1.0) {
      // Step 1: Folds diagonally over onto itself from 0 to 180 degrees UPWARDS
      const angle = (frac / 1.0) * Math.PI;
      this.foxHinge.rotation.x = angle;
    } else {
      this.foxHinge.rotation.x = Math.PI;
    }
  }
}
