import { CLEAN_ORIGAMI_MODELS } from './data/cleanOrigamiModels.js';
import { CreasePatternViewer } from './components/CreasePatternViewer.js';
import { MeshSkeletonizer } from './algorithms/MeshSkeletonizer.js';
import { OrigamiUniversalSolver } from './algorithms/OrigamiUniversalSolver.js';
import { OrigamiFitnessEvaluator } from './algorithms/OrigamiFitnessEvaluator.js';
import { OrigamiAIOptimizer } from './algorithms/OrigamiAIOptimizer.js';
import { TargetMeshViewer } from './components/TargetMeshViewer.js';

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

// AI HUD and Ghost Mesh elements
const btnToggleGhost = document.getElementById('btn-toggle-ghost');
const btnOptimizeAi = document.getElementById('btn-optimize-ai');
const aiHud = document.getElementById('ai-hud');
const hudStatus = document.getElementById('hud-status');
const hudGen = document.getElementById('hud-gen');
const hudLoss = document.getElementById('hud-loss');
const hudScore = document.getElementById('hud-score');
const btnStepAi = document.getElementById('btn-step-ai');
const btnRunAiLoop = document.getElementById('btn-run-ai-loop');
const detailSelect = document.getElementById('detail-select');
const minCreaseSlider = document.getElementById('min-crease-slider');
const minCreaseLabel = document.getElementById('min-crease-label');
const morphologySelect = document.getElementById('morphology-select');

let currentDetailLevel = 2; // Level 3: Micro-Sculpted by default
let currentMinCreaseLength = 35; // 35mm physical limit by default
let currentMorphology = 'auto'; // Auto-detect by default

// Target Mesh Inspector elements
const targetMeshInspector = document.getElementById('target-mesh-inspector');
const targetMeshContainer = document.getElementById('target-mesh-container');
const btnRotateTarget = document.getElementById('btn-rotate-target');
const btnMinimizeTarget = document.getElementById('btn-minimize-target');
const targetStatsVerts = document.getElementById('target-stats-verts');
const targetStatsFaces = document.getElementById('target-stats-faces');

// Initialize 3D Target Mesh Viewer
const targetViewer = new TargetMeshViewer(targetMeshContainer);

// Active AI and 3D Target State
let activeMeshTarget = null;
let activeSkeleton = null;
let activeOptimizer = null;
let isGhostVisible = true;
let isAiLoopRunning = false;

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
  creaseViewer.setModel(model);

  stepSlider.min = '0';
  stepSlider.max = '100';
  stepSlider.value = '0';
  setSimFoldPercent(0);

  const applyToSim = (retries = 5) => {
    const win = getSimWindow();
    if (win && win.globals && win.globals.pattern) {
      try {
        if (model.svgData && typeof win.globals.pattern.loadSVGText === 'function') {
          win.globals.pattern.loadSVGText(model.svgData);
        } else if (model.foldData) {
          win.globals.pattern.setFoldData(JSON.parse(JSON.stringify(model.foldData)), true);
        } else if (model.svgData) {
          const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(model.svgData);
          win.globals.pattern.loadSVG(svgUri);
        } else if (model.simUrl && win.globals.importer) {
          win.globals.importer.importDemoFile(model.simUrl);
        } else if (win.$ && model.simUrl) {
          win.$(`.demo[data-url='${model.simUrl}']`).click();
        }

        if (typeof win.globals.setCreasePercent === 'function') {
          win.globals.setCreasePercent(0);
        }
      } catch (e) {
        console.warn('Error loading model into origami simulator:', e);
      }
    } else if (retries > 0) {
      setTimeout(() => applyToSim(retries - 1), 200);
    }
  };

  applyToSim();
}

/**
 * Solves 3D OBJ mesh and loads synthesized crease pattern into 2D viewer and 3D GPU simulator
 */
async function process3DMesh(objText, modelName = 'Synthesized 3D Model') {
  try {
    const meshData = MeshSkeletonizer.parseOBJ(objText);
    const skeleton = MeshSkeletonizer.extractSkeleton(meshData);
    
    activeMeshTarget = meshData;
    activeSkeleton = skeleton;

    const baseMorphology = currentMorphology !== 'auto' ? currentMorphology : skeleton.morphology;
    if (morphologySelect) {
      if (currentMorphology === 'auto') {
        morphologySelect.options[0].textContent = `🤖 Auto: ${skeleton.morphology.toUpperCase()}`;
      }
    }

    activeOptimizer = new OrigamiAIOptimizer(skeleton, meshData.vertices, {
      morphologyOverride: baseMorphology,
      detailLevel: currentDetailLevel,
      minCreaseLength: currentMinCreaseLength
    });

    const foldData = OrigamiUniversalSolver.synthesizeFoldPattern(skeleton, {
      morphologyOverride: baseMorphology,
      detailLevel: currentDetailLevel,
      minCreaseLength: currentMinCreaseLength
    });
    const svgData = OrigamiUniversalSolver.foldToSVG(foldData);

    // Initial loss evaluation
    const initialPaperPoints = foldData.vertices_coords.map(v => ({ x: v[0], y: v[1], z: v[2] }));
    const initialEval = OrigamiFitnessEvaluator.evaluateFitness(initialPaperPoints, meshData.vertices);

    // Update AI HUD
    aiHud.classList.remove('hidden');
    hudStatus.textContent = `Solved (${baseMorphology.toUpperCase()})`;
    hudGen.textContent = '0';
    hudLoss.textContent = initialEval.totalLoss.toFixed(3);
    hudScore.textContent = `${initialEval.scorePercent}%`;

    // Build model structure for CreasePatternViewer
    const customModel = {
      id: `mesh-${Date.now()}`,
      name: `${modelName} (${baseMorphology.toUpperCase()})`,
      paperSize: 1000,
      foldData,
      svgData,
      morphology: baseMorphology,
      steps: [
        {
          step: 1,
          description: `${baseMorphology.toUpperCase()} origami base synthesized (${foldData.faces_vertices ? foldData.faces_vertices.length : 0} faces)`,
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

    customModelsMap.set(customModel.id, customModel);

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
    
    // Load target mesh into dedicated 3D Target Inspector
    targetMeshInspector.classList.remove('hidden');
    targetViewer.loadMesh(meshData);
    targetViewer.onResize();
    targetStatsVerts.textContent = `${meshData.vertices ? meshData.vertices.length : 0} Vertices`;
    targetStatsFaces.textContent = `${meshData.faces ? meshData.faces.length : 0} Faces`;

    // Set 3D ghost mesh in simulator
    const win = getSimWindow();
    if (win && win.globals && win.globals.threeView) {
      if (isGhostVisible) {
        win.globals.threeView.setGhostMesh(meshData);
      } else {
        win.globals.threeView.removeGhostMesh();
      }
    }

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

// Registry of all models (default presets + custom synthesized meshes)
const customModelsMap = new Map();

// UI Listeners
modelSelect.addEventListener('change', (e) => {
  pause();
  const val = e.target.value;
  const selected = customModelsMap.get(val) || CLEAN_ORIGAMI_MODELS.find(m => m.id === val);
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

// Target Mesh Inspector Controls
btnRotateTarget.addEventListener('click', () => {
  targetViewer.toggleAutoRotate();
  btnRotateTarget.style.opacity = targetViewer.autoRotate ? '1' : '0.5';
});

btnMinimizeTarget.addEventListener('click', () => {
  targetMeshInspector.classList.toggle('hidden');
});

// Ghost target mesh toggle
btnToggleGhost.addEventListener('click', () => {
  isGhostVisible = !isGhostVisible;
  // Also keep inspector open when ghost is active
  if (isGhostVisible && activeMeshTarget) {
    targetMeshInspector.classList.remove('hidden');
    targetViewer.onResize();
  }
  const win = getSimWindow();
  if (win && win.globals && win.globals.threeView) {
    if (isGhostVisible && activeMeshTarget) {
      win.globals.threeView.setGhostMesh(activeMeshTarget);
      btnToggleGhost.style.borderColor = '#38bdf8';
      btnToggleGhost.style.color = '#38bdf8';
    } else {
      win.globals.threeView.removeGhostMesh();
      btnToggleGhost.style.borderColor = '';
      btnToggleGhost.style.color = '';
    }
  }
});

// Single Step AI Generation
btnStepAi.addEventListener('click', () => {
  if (!activeOptimizer) return;
  runAiStep();
});

function runAiStep() {
  if (!activeOptimizer) return;
  hudStatus.textContent = 'Optimizing...';
  const result = activeOptimizer.stepGeneration();
  hudGen.textContent = result.generation;
  hudLoss.textContent = result.bestLoss.toFixed(3);
  hudScore.textContent = `${result.bestScore}%`;
  hudStatus.textContent = 'Active';

  // Update 2D and 3D with best candidate
  const optimizedModel = {
    id: currentModel.id,
    name: currentModel.name,
    paperSize: 1000,
    foldData: result.bestPattern.foldData,
    svgData: result.bestPattern.svgData,
    steps: [
      {
        step: 1,
        description: `Gen ${result.generation} (Fit: ${result.bestScore}%)`,
        creases: result.bestPattern.foldData.edges_vertices.map((e, idx) => {
          const v1 = result.bestPattern.foldData.vertices_coords[e[0]];
          const v2 = result.bestPattern.foldData.vertices_coords[e[1]];
          const assign = result.bestPattern.foldData.edges_assignment[idx];
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

  customModelsMap.set(optimizedModel.id, optimizedModel);
  loadModelInSim(optimizedModel);
}

// Run 25 Generations Loop
btnRunAiLoop.addEventListener('click', async () => {
  if (!activeOptimizer) return;
  if (isAiLoopRunning) {
    isAiLoopRunning = false;
    btnRunAiLoop.textContent = 'Run 25 Gens';
    hudStatus.textContent = 'Paused';
    return;
  }

  isAiLoopRunning = true;
  btnRunAiLoop.textContent = 'Pause AI';
  hudStatus.textContent = 'Running Loop...';

  for (let i = 0; i < 25; i++) {
    if (!isAiLoopRunning) break;
    runAiStep();
    await new Promise(r => setTimeout(r, 60));
  }

  isAiLoopRunning = false;
  btnRunAiLoop.textContent = 'Run 25 Gens';
  hudStatus.textContent = 'Finished';
});

// Detail Level and Min Crease Limit UI listeners
if (detailSelect) {
  detailSelect.addEventListener('change', (e) => {
    currentDetailLevel = parseInt(e.target.value, 10);
    rebuildActiveModel();
  });
}

if (minCreaseSlider) {
  minCreaseSlider.addEventListener('input', (e) => {
    currentMinCreaseLength = parseInt(e.target.value, 10);
    if (minCreaseLabel) minCreaseLabel.textContent = `${currentMinCreaseLength}mm`;
    rebuildActiveModel();
  });
}

if (morphologySelect) {
  morphologySelect.addEventListener('change', (e) => {
    currentMorphology = e.target.value;
    if (activeSkeleton && activeMeshTarget) {
      const baseMorphology = currentMorphology !== 'auto' ? currentMorphology : activeSkeleton.morphology;
      activeOptimizer = new OrigamiAIOptimizer(activeSkeleton, activeMeshTarget.vertices, {
        morphologyOverride: baseMorphology,
        detailLevel: currentDetailLevel,
        minCreaseLength: currentMinCreaseLength
      });
      rebuildActiveModel();
    }
  });
}

function rebuildActiveModel() {
  if (!activeSkeleton || !activeMeshTarget) return;

  const baseMorphology = currentMorphology !== 'auto' ? currentMorphology : activeSkeleton.morphology;

  const foldData = OrigamiUniversalSolver.synthesizeFoldPattern(activeSkeleton, {
    morphologyOverride: baseMorphology,
    detailLevel: currentDetailLevel,
    minCreaseLength: currentMinCreaseLength,
    insetRatios: activeOptimizer ? activeOptimizer.bestGenome?.insetRatios : undefined,
    microOffsets: activeOptimizer ? activeOptimizer.bestGenome?.microOffsets : undefined
  });
  const svgData = OrigamiUniversalSolver.foldToSVG(foldData);

  const initialPaperPoints = foldData.vertices_coords.map(v => ({ x: v[0], y: v[1], z: v[2] }));
  const evalResult = OrigamiFitnessEvaluator.evaluateFitness(initialPaperPoints, activeMeshTarget.vertices);
  if (hudLoss) hudLoss.textContent = evalResult.totalLoss.toFixed(3);
  if (hudScore) hudScore.textContent = `${evalResult.scorePercent}%`;
  if (hudStatus) hudStatus.textContent = `Active (${baseMorphology.toUpperCase()})`;

  const levelName = currentDetailLevel === 0 ? 'Macro' : currentDetailLevel === 1 ? 'Articulated' : 'Micro-Sculpted';
  currentModel.foldData = foldData;
  currentModel.svgData = svgData;
  currentModel.steps = [
    {
      step: 1,
      description: `${baseMorphology.toUpperCase()} (${levelName}, Min ${currentMinCreaseLength}mm)`,
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
  ];

  customModelsMap.set(currentModel.id, currentModel);
  loadModelInSim(currentModel);
}

// Initial boot
loadModelInSim(CLEAN_ORIGAMI_MODELS[0]);

// Global debug and test bindings
window.setSimFoldPercent = setSimFoldPercent;
window.loadModelInSim = loadModelInSim;
window.process3DMesh = process3DMesh;
window.getCurrentModel = () => currentModel;



