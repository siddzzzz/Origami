import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * TargetMeshViewer
 * Interactive Three.js viewer dedicated to displaying the uploaded 3D Target Mesh (.OBJ) So that the uses can verify their uploaded model
 * Features:
 * - Solid matte clay / metal material rendering
 * - Wireframe overlay
 * - Bounding box and vertex count inspection
 * - Auto-rotation toggle
 * - Orbit controls with smooth damping
 */
export class TargetMeshViewer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.meshGroup = new THREE.Group();
    this.targetMesh = null;
    this.wireframeMesh = null;
    this.autoRotate = true;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || 300;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.setupLighting();
    this.scene.add(this.meshGroup);

    window.addEventListener('resize', () => this.onResize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(40, 60, 40);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-40, -20, -40);
    this.scene.add(dirLight2);

    // Subtle grid on the ground
    const gridHelper = new THREE.GridHelper(60, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -15;
    this.scene.add(gridHelper);
  }

  loadMesh(meshData) {
    // Clear previous mesh
    while (this.meshGroup.children.length > 0) {
      const obj = this.meshGroup.children[0];
      this.meshGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    if (!meshData || !meshData.vertices || meshData.vertices.length === 0) return;

    const geom = new THREE.BufferGeometry();
    const positions = [];

    if (meshData.faces && meshData.faces.length > 0) {
      meshData.faces.forEach(f => {
        if (f.length >= 3) {
          const v0 = meshData.vertices[f[0]];
          const v1 = meshData.vertices[f[1]];
          const v2 = meshData.vertices[f[2]];
          if (v0 && v1 && v2) {
            positions.push(v0.x, v0.y, v0.z);
            positions.push(v1.x, v1.y, v1.z);
            positions.push(v2.x, v2.y, v2.z);
          }
          if (f.length === 4) {
            const v3 = meshData.vertices[f[3]];
            if (v0 && v2 && v3) {
              positions.push(v0.x, v0.y, v0.z);
              positions.push(v2.x, v2.y, v2.z);
              positions.push(v3.x, v3.y, v3.z);
            }
          }
        }
      });
    }

    if (positions.length === 0) {
      meshData.vertices.forEach(v => positions.push(v.x, v.y, v.z));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    geom.center();

    // Scale to fit viewing volume
    const radius = geom.boundingSphere ? geom.boundingSphere.radius : 1;
    const targetScale = 20 / Math.max(0.001, radius);
    geom.scale(targetScale, targetScale, targetScale);

    // Solid matte clay material
    const solidMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.2,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.targetMesh = new THREE.Mesh(geom, solidMat);
    this.meshGroup.add(this.targetMesh);

    // Wireframe overlay for architectural inspection
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    this.wireframeMesh = new THREE.Mesh(geom, wireMat);
    this.meshGroup.add(this.wireframeMesh);

    this.controls.reset();
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (this.autoRotate && this.meshGroup) {
      this.meshGroup.rotation.y += 0.008;
    }
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
