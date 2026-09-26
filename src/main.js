import { CLEAN_ORIGAMI_MODELS } from './data/cleanOrigamiModels.js';
import { CreasePatternViewer } from './components/CreasePatternViewer.js';
import { MeshSkeletonizer } from './algorithms/MeshSkeletonizer.js';
import { OrigamiUniversalSolver } from './algorithms/OrigamiUniversalSolver.js';

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
const presetButtons = document.querySelectorAll('.btn-preset-model');

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
  if (win && win.globals) {
    try {
      if (model.svgData && win.globals.pattern) {
        // Pass SVG data URI to pattern.loadSVG which executes full FOLD conversion and triangulation pipeline
        const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(model.svgData);
        win.globals.pattern.loadSVG(svgUri);
      } else if (model.foldData && win.globals.pattern) {
        win.globals.pattern.setFoldData(model.foldData, true);
      } else if (model.simUrl && win.globals.importer) {
        win.globals.importer.importDemoFile(model.simUrl);
      } else if (win.$ && model.simUrl) {
        win.$(`.demo[data-url='${model.simUrl}']`).click();
      }
    } catch (e) {
      console.warn('Error loading model into origami simulator:', e);
    }
  }
}

/**
 * Solves 3D OBJ mesh and loads synthesized crease pattern into 2D viewer and 3D GPU simulator
 */
async function process3DMesh(objText, modelName = 'Synthesized 3D Model') {
  try {
    const meshData = MeshSkeletonizer.parseOBJ(objText);
    const skeleton = MeshSkeletonizer.extractSkeleton(meshData);
    const foldData = OrigamiUniversalSolver.synthesizeFoldPattern(skeleton);
    const svgData = OrigamiUniversalSolver.foldToSVG(foldData);

    // Build model structure for CreasePatternViewer
    const customModel = {
      id: `mesh-${Date.now()}`,
      name: modelName,
      paperSize: 1000,
      foldData,
      svgData,
      steps: [
        {
          step: 1,
          description: `Extremity tree with ${skeleton.extremities.length} flaps solved`,
          creases: foldData.edges_vertices.map((e, idx) => {
            const v1 = foldData.vertices_coords[e[0]];
            const v2 = foldData.vertices_coords[e[1]];
            const assign = foldData.edges_assignment[idx];
            return {
              x1: v1[0],
              y1: v1[1],
              x2: v2[0],
              y2: v2[1],
              type: assign === 'M' ? 'mountain' : assign === 'V' ? 'valley' : 'facet'
            };
          })
        }
      ]
    };

    // Add option in select dropdown if not present
    let opt = document.querySelector(`option[value="${customModel.id}"]`);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = customModel.id;
      opt.textContent = `✨ ${modelName} (Generated)`;
      modelSelect.appendChild(opt);
    }
    modelSelect.value = customModel.id;

    loadModelInSim(customModel);
    modalImport.classList.add('hidden');
  } catch (err) {
    console.error('Failed to solve 3D mesh into origami:', err);
    alert('Solver Error: ' + err.message);
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

// Drag and drop handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = 'var(--accent-primary)';
});

dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '';
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.obj')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      process3DMesh(ev.target.result, file.name.replace(/\.obj$/i, ''));
    };
    reader.readAsText(file);
  }
});

fileMeshInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      process3DMesh(ev.target.result, file.name.replace(/\.obj$/i, ''));
    };
    reader.readAsText(file);
  }
});

// Sample 3D test model preset buttons
presetButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const objUrl = btn.getAttribute('data-obj');
    const modelName = btn.textContent.trim();
    try {
      const resp = await fetch(objUrl);
      const text = await resp.text();
      await process3DMesh(text, modelName);
    } catch (err) {
      console.error('Failed to load preset OBJ:', err);
      alert('Error loading sample model: ' + err.message);
    }
  });
});

// Initial boot
loadModelInSim(CLEAN_ORIGAMI_MODELS[0]);


