import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrigamiPaperMesh } from './OrigamiPaperMesh.js';

/**
 * ThreeDSceneManager
 * Configures the interactive Three.js 3D viewport:
 * - Studio lighting (Key, fill, ambient, rim, directional shadows)
 * - Ground plane with soft contact shadows
 * - Smooth orbit controls and reset camera
 * - Fold animation loop
 */

export class ThreeDSceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.paperMesh = null;

    this.isPlaying = false;
    this.playbackSpeed = 1.0;
    this.currentStep = 0;
    this.currentT = 0; // 0..1 progress inside step
    this.totalSteps = 1;

    this.onStepChangeCallback = null;
    this.onProgressCallback = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    this.camera.position.set(0, 110, 160);

    // Renderer setup with clean, crisp shadow mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Do not go underneath floor
    this.controls.minDistance = 40;
    this.controls.maxDistance = 450;
    this.controls.target.set(0, 12, 0);

    this.setupLighting();
    this.setupEnvironment();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Main animation loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Subtle ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key directional light with soft shadow
    const mainLight = new THREE.DirectionalLight(0xfffbf0, 1.2);
    mainLight.position.set(80, 140, 90);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 10;
    mainLight.shadow.camera.far = 400;
    const d = 120;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    // Rim/Back light for paper edge definition
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.6);
    rimLight.position.set(-90, 80, -90);
    this.scene.add(rimLight);
  }

  setupEnvironment() {
    // Studio ground with soft shadow reception
    const planeGeo = new THREE.PlaneGeometry(600, 600);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const ground = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Technical grid floor
    const grid = new THREE.GridHelper(300, 30, 0x94a3b8, 0xe2e8f0);
    grid.position.y = -0.4;
    this.scene.add(grid);
  }

  loadModel(modelData) {
    if (this.paperMesh) {
      this.scene.remove(this.paperMesh.group);
    }
    this.paperMesh = new OrigamiPaperMesh(modelData);
    this.scene.add(this.paperMesh.group);

    this.currentStep = 0;
    this.currentT = 0;
    this.totalSteps = modelData.steps ? modelData.steps.length : 1;
    this.paperMesh.setFoldState(0, 0);
  }

  setStep(stepIndex, t = 0) {
    this.currentStep = Math.max(0, Math.min(this.totalSteps - 1, stepIndex));
    this.currentT = Math.max(0, Math.min(1, t));

    if (this.paperMesh) {
      this.paperMesh.setFoldState(this.currentStep, this.currentT);
    }

    if (this.onProgressCallback) {
      this.onProgressCallback(this.currentStep, this.currentT);
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.setStep(this.currentStep + 1, 0);
      if (this.onStepChangeCallback) this.onStepChangeCallback(this.currentStep);
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.setStep(this.currentStep - 1, 0);
      if (this.onStepChangeCallback) this.onStepChangeCallback(this.currentStep);
    }
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  resetCamera() {
    this.camera.position.set(0, 110, 160);
    this.controls.target.set(0, 12, 0);
    this.controls.update();
  }

  onResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (this.isPlaying && this.paperMesh) {
      // Advance step progress
      const stepDuration = 2.0 / this.playbackSpeed; // 2 seconds per step at 1x
      this.currentT += delta / stepDuration;

      if (this.currentT >= 1.0) {
        if (this.currentStep < this.totalSteps - 1) {
          this.currentStep++;
          this.currentT = 0;
          if (this.onStepChangeCallback) this.onStepChangeCallback(this.currentStep);
        } else {
          // Finished all steps
          this.currentT = 1.0;
          this.isPlaying = false;
          if (this.onStepChangeCallback) this.onStepChangeCallback(this.currentStep);
        }
      }

      this.paperMesh.setFoldState(this.currentStep, this.currentT);

      if (this.onProgressCallback) {
        this.onProgressCallback(this.currentStep, this.currentT);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
