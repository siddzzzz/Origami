import { CLEAN_ORIGAMI_MODELS } from './data/cleanOrigamiModels.js';
import { CreasePatternViewer } from './components/CreasePatternViewer.js';

// DOM elements
const modelSelect = document.getElementById('model-select');
const creaseCanvas = document.getElementById('crease-canvas');
const origamiFrame = document.getElementById('origami-frame');
const btnPrevStep = document.getElementById('btn-prev-step');
const btnNextStep = document.getElementById('btn-next-step');
const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const playBtnText = document.getElementById('play-btn-text');
const stepSlider = document.getElementById('step-slider');
const progressPercent = document.getElementById('progress-percent');
const speedSelect = document.getElementById('speed-select');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnReset2D = document.getElementById('btn-reset-2d');
const btnImportMesh = document.getElementById('btn-import-mesh');
const modalImport = document.getElementById('modal-import');
const btnCloseModal = document.getElementById('btn-close-modal');
const dropzone = document.getElementById('dropzone');
const fileMeshInput = document.getElementById('file-mesh-input');

// Initialize 2D Crease Pattern Viewer
const creaseViewer = new CreasePatternViewer(creaseCanvas);

let currentModel = CLEAN_ORIGAMI_MODELS[0];
let isPlaying = false;
let playAnimFrame = null;
let currentPercent = 0; // 0.0 to 1.0
let playSpeed = 1.0;

function getSimWindow() {
  try {
    return origamiFrame && origamiFrame.contentWindow ? origamiFrame.contentWindow : null;
  } catch (err) {
    return null;
  }
}

function getSimGlobals() {
  const win = getSimWindow();
  return win && win.globals ? win.globals : null;
}

function setSimFoldPercent(percent) {
  currentPercent = Math.max(0, Math.min(1, percent));
  const sim = getSimGlobals();
  if (sim) {
    sim.creasePercent = currentPercent;
    sim.shouldChangeCreasePercent = true;
    if (typeof sim.setCreasePercent === 'function') {
      try { sim.setCreasePercent(currentPercent); } catch (e) {}
    }
  }

  // Update outer UI
  stepSlider.value = (currentPercent * 100).toString();
  progressPercent.textContent = `${Math.round(currentPercent * 100)}%`;

  // Step index for 2D diagram
  if (currentModel.steps && currentModel.steps.length > 1) {
    const stepIdx = Math.min(
      currentModel.steps.length - 1,
      Math.floor(currentPercent * currentModel.steps.length)
    );
    creaseViewer.setStep(stepIdx);
  }
}

function loadModelInSim(model) {
  currentModel = model;
  creaseViewer.setModel(model, 0);

  stepSlider.min = '0';
  stepSlider.max = '100';
  stepSlider.value = '0';
  setSimFoldPercent(0);

  const win = getSimWindow();
  if (win && win.globals && model.simUrl) {
    try {
      if (win.globals.importer) {
        win.globals.importer.importDemoFile(model.simUrl);
      } else if (win.$) {
        win.$(`.demo[data-url='${model.simUrl}']`).click();
      }
    } catch (e) {
      console.warn('Error loading model into origami simulator:', e);
    }
  }
}

// When iframe finishes loading, sync default model
origamiFrame.addEventListener('load', () => {
  setTimeout(() => {
    loadModelInSim(currentModel);
  }, 400);
});

// Animation loop
let lastTime = performance.now();
function animLoop(now) {
  if (!isPlaying) return;
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  const duration = 4.0 / playSpeed; // 4 seconds full fold at 1.0x
  let newPct = currentPercent + delta / duration;

  if (newPct >= 1.0) {
    newPct = 1.0;
    setSimFoldPercent(1.0);
    pause();
    return;
  }

  setSimFoldPercent(newPct);
  playAnimFrame = requestAnimationFrame(animLoop);
}

function play() {
  if (currentPercent >= 1.0) {
    setSimFoldPercent(0.0);
  }
  isPlaying = true;
  lastTime = performance.now();
  playBtnText.textContent = 'Pause';
  playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  playAnimFrame = requestAnimationFrame(animLoop);
}

function pause() {
  isPlaying = false;
  if (playAnimFrame) {
    cancelAnimationFrame(playAnimFrame);
    playAnimFrame = null;
  }
  playBtnText.textContent = 'Animate Fold';
  playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
}

function togglePlay() {
  if (isPlaying) pause();
  else play();
}

// UI Listeners
modelSelect.addEventListener('change', (e) => {
  pause();
  const selected = CLEAN_ORIGAMI_MODELS.find(m => m.id === e.target.value);
  if (selected) {
    loadModelInSim(selected);
  }
});

btnPlayPause.addEventListener('click', () => {
  togglePlay();
});

btnPrevStep.addEventListener('click', () => {
  pause();
  const totalSteps = (currentModel.steps && currentModel.steps.length) || 4;
  const stepSize = 1.0 / (totalSteps - 1 || 1);
  const currentStep = Math.round(currentPercent / stepSize);
  const prevStep = Math.max(0, currentStep - 1);
  setSimFoldPercent(prevStep * stepSize);
});

btnNextStep.addEventListener('click', () => {
  pause();
  const totalSteps = (currentModel.steps && currentModel.steps.length) || 4;
  const stepSize = 1.0 / (totalSteps - 1 || 1);
  const currentStep = Math.round(currentPercent / stepSize);
  const nextStep = Math.min(totalSteps - 1, currentStep + 1);
  setSimFoldPercent(nextStep * stepSize);
});

stepSlider.addEventListener('input', (e) => {
  pause();
  const val = parseFloat(e.target.value);
  setSimFoldPercent(val / 100);
});

speedSelect.addEventListener('change', (e) => {
  playSpeed = parseFloat(e.target.value) || 1.0;
});

const btnToggleView = document.getElementById('btn-toggle-view');
const viewModeLabel = document.getElementById('view-mode-label');

if (btnToggleView) {
  btnToggleView.addEventListener('click', () => {
    const newMode = creaseViewer.toggleViewMode();
    viewModeLabel.textContent = newMode === 'folded' ? 'Mode: Step Diagram' : 'Mode: Unfolded Flat Sheet';
  });
}

btnReset2D.addEventListener('click', () => {
  creaseViewer.resetView();
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
loadModelInSim(CLEAN_ORIGAMI_MODELS[0]);

