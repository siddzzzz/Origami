import { RIGID_ORIGAMI_MODELS } from './data/rigidOrigamiModels.js';
import { CreasePatternViewer } from './components/CreasePatternViewer.js';
import { ThreeDSceneManager } from './components/ThreeDSceneManager.js';

// DOM elements
const modelSelect = document.getElementById('model-select');
const creaseCanvas = document.getElementById('crease-canvas');
const threeContainer = document.getElementById('three-container');
const btnPrevStep = document.getElementById('btn-prev-step');
const btnNextStep = document.getElementById('btn-next-step');
const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const playBtnText = document.getElementById('play-btn-text');
const stepSlider = document.getElementById('step-slider');
const progressPercent = document.getElementById('progress-percent');
const speedSelect = document.getElementById('speed-select');
const stepCounter = document.getElementById('step-counter');
const stepTitle = document.getElementById('step-title');
const stepInstruction = document.getElementById('step-instruction');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnReset2D = document.getElementById('btn-reset-2d');
const btnReset3D = document.getElementById('btn-reset-3d');
const btnImportMesh = document.getElementById('btn-import-mesh');
const modalImport = document.getElementById('modal-import');
const btnCloseModal = document.getElementById('btn-close-modal');
const dropzone = document.getElementById('dropzone');
const fileMeshInput = document.getElementById('file-mesh-input');

// Initialize 2D Crease Pattern Viewer & 3D Scene
const creaseViewer = new CreasePatternViewer(creaseCanvas);
const sceneManager = new ThreeDSceneManager(threeContainer);

let currentModel = RIGID_ORIGAMI_MODELS[0];

function loadModel(model) {
  currentModel = model;
  creaseViewer.setModel(model, 0);
  sceneManager.loadModel(model);

  const totalSteps = model.steps.length;
  stepSlider.max = (totalSteps - 1).toString();
  stepSlider.value = '0';
  updateStepUI(0);
}

function updateStepUI(stepIndex) {
  const steps = currentModel.steps;
  const current = steps[stepIndex] || steps[0];
  stepCounter.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
  stepTitle.textContent = current.title;
  stepInstruction.textContent = current.instruction;
  creaseViewer.setStep(stepIndex);
}

// Scene callbacks
sceneManager.onStepChangeCallback = (step) => {
  updateStepUI(step);
};

sceneManager.onProgressCallback = (step, t) => {
  const total = currentModel.steps.length - 1;
  const currentFractional = step + t;
  stepSlider.value = currentFractional.toString();
  const pct = Math.round((currentFractional / total) * 100);
  progressPercent.textContent = `${pct}%`;
};

// UI Listeners
modelSelect.addEventListener('change', (e) => {
  const selected = RIGID_ORIGAMI_MODELS.find(m => m.id === e.target.value);
  if (selected) {
    loadModel(selected);
  }
});

btnPlayPause.addEventListener('click', () => {
  const playing = sceneManager.togglePlay();
  if (playing) {
    playBtnText.textContent = 'Pause';
    playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    playBtnText.textContent = 'Animate Fold';
    playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
  }
});

btnPrevStep.addEventListener('click', () => {
  sceneManager.pause();
  sceneManager.prevStep();
  playBtnText.textContent = 'Animate Fold';
  playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
});

btnNextStep.addEventListener('click', () => {
  sceneManager.pause();
  sceneManager.nextStep();
  playBtnText.textContent = 'Animate Fold';
  playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
});

stepSlider.addEventListener('input', (e) => {
  sceneManager.pause();
  playBtnText.textContent = 'Animate Fold';
  playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';

  const val = parseFloat(e.target.value);
  const step = Math.floor(val);
  const t = val - step;
  sceneManager.setStep(step, t);
  updateStepUI(step);
});

speedSelect.addEventListener('change', (e) => {
  sceneManager.playbackSpeed = parseFloat(e.target.value);
});

btnReset2D.addEventListener('click', () => {
  creaseViewer.resetView();
});

btnReset3D.addEventListener('click', () => {
  sceneManager.resetCamera();
});

// SVG Crease Pattern Exporter
btnExportSvg.addEventListener('click', () => {
  const svgData = creaseViewer.exportToSVG();
  if (!svgData) return;
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentModel.id}-crease-pattern.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Modal handlers
btnImportMesh.addEventListener('click', () => {
  modalImport.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => {
  modalImport.classList.add('hidden');
});

modalImport.addEventListener('click', (e) => {
  if (e.target === modalImport) {
    modalImport.classList.add('hidden');
  }
});

dropzone.addEventListener('click', () => {
  fileMeshInput.click();
});

fileMeshInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    alert(`File "${file.name}" received. Origami computational solver will parse the 3D geometry mesh!`);
    modalImport.classList.add('hidden');
  }
});

// Initial boot
loadModel(RIGID_ORIGAMI_MODELS[0]);
