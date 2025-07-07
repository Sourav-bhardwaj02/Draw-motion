// Global variables
let canvas, ctx, previewCanvas, previewCtx;
let isDrawing = false;
let startX = 0, startY = 0;
let currentTool = 'brush';
let currentFrame = 1;
let totalFrames = 1;
let frames = {};
let isPlaying = false;
let animationInterval;
let brushSize = 5;
let brushColor = '#000000';
let brushOpacity = 1;
let currentProjectName = "Untitled";
let undoStack = [];
let redoStack = [];
let onionSkinEnabled = false;


document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('jumpStartBtn').addEventListener('click', () => selectFrame(1));
  document.getElementById('jumpEndBtn').addEventListener('click', () => selectFrame(totalFrames));
  document.getElementById('deleteDrawingBtn').addEventListener('click', () => {
    if (ctx && canvas) {
      saveStateForUndo(); // Save state before clearing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames[currentFrame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
      alert(`Drawing deleted on frame ${currentFrame}`);
    }
  });
  
  function saveStateForUndo() {
    if (!ctx || !canvas) return;
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  
  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const imageData = undoStack.pop();
    ctx.putImageData(imageData, 0, 0);
    frames[currentFrame] = imageData;
  }
  
  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const imageData = redoStack.pop();
    ctx.putImageData(imageData, 0, 0);
    frames[currentFrame] = imageData;
  }
  
  document.getElementById('newProjectBtn').addEventListener('click', showProjectModal);
  document.getElementById('cancelBtn').addEventListener('click', hideProjectModal);
  document.getElementById('okBtn').addEventListener('click', createProject);
  document.getElementById('homeBtn').addEventListener('click', goHome);
  document.getElementById('width').addEventListener('input', updateCanvasSize);
  document.getElementById('height').addEventListener('input', updateCanvasSize);
  document.getElementById('marginX').addEventListener('input', updateCanvasSize);
  document.getElementById('marginY').addEventListener('input', updateCanvasSize);
  updateCanvasSize();

  document.getElementById('undoBtn')?.addEventListener('click', undo);
  document.getElementById('redoBtn')?.addEventListener('click', redo);
  document.getElementById('onionToggle')?.addEventListener('click', () => onionSkinEnabled = !onionSkinEnabled);
  
  // Make functions available globally
  window.saveStateForUndo = saveStateForUndo;
  window.undo = undo;
  window.redo = redo;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      window.redo();
    } else {
      window.undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    window.redo();
  }
});

function selectFrame(frame) {
  currentFrame = frame;
  document.getElementById('currentFrame').textContent = currentFrame;
  document.querySelectorAll('.frame-cell').forEach(cell => cell.classList.remove('active'));
  const active = document.querySelector(`.frame-cell[data-frame="${frame}"]`);
  if (active) active.classList.add('active');
  if (frames[frame]) {
    ctx.putImageData(frames[frame], 0, 0);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frames[frame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  if (onionSkinEnabled && frames[frame - 1]) {
    previewCtx.clearRect(0, 0, canvas.width, canvas.height);
    previewCtx.globalAlpha = 0.3;
    previewCtx.putImageData(frames[frame - 1], 0, 0);
    previewCtx.globalAlpha = 1.0;
  }
  
  // Clear undo/redo stacks when switching frames
  undoStack = [];
  redoStack = [];
}

function checkOrientation() {
  const rotateMessage = document.getElementById('rotateDevice');
  rotateMessage.style.display = window.innerHeight > window.innerWidth ? 'flex' : 'none';
}

window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);

function showProjectModal() {
  document.getElementById('projectModal').classList.add('show');
}

function hideProjectModal() {
  document.getElementById('projectModal').classList.remove('show');
}

function updateCanvasSize() {
  const width = parseInt(document.getElementById('width').value) || 1280;
  const height = parseInt(document.getElementById('height').value) || 720;
  const marginX = parseInt(document.getElementById('marginX').value) || 0;
  const marginY = parseInt(document.getElementById('marginY').value) || 0;
  const canvasWidth = width + 2 * marginX;
  const canvasHeight = height + 2 * marginY;
  document.getElementById('canvasWidth').textContent = canvasWidth;
  document.getElementById('canvasHeight').textContent = canvasHeight;
}

function createProject() {
  hideProjectModal();
  currentProjectName = document.getElementById('projectName').value.trim() || "Untitled";
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('animationInterface').style.display = 'block';
  const titleElement = document.getElementById('projectTitle');
  if (titleElement) titleElement.textContent = currentProjectName;
  initCanvas();
  canvas = document.getElementById('animationCanvas');
  ctx = canvas.getContext('2d');
  previewCanvas = document.getElementById('previewCanvas');
  previewCtx = previewCanvas.getContext('2d');
  currentFrame = 1;
  totalFrames = 10;
  document.getElementById('currentFrame').textContent = currentFrame;
  document.getElementById('totalFrames').textContent = totalFrames;
}

function initCanvas() {
  canvas = document.getElementById('animationCanvas');
  ctx = canvas.getContext('2d');
  previewCanvas = document.getElementById('previewCanvas');
  previewCtx = previewCanvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  canvas.addEventListener('mousedown', function (e) {
    const x = getX(e);
    const y = getY(e);
    if (currentTool === 'fill') {
      window.saveStateForUndo(); // Save state before fill
      fillAt(x, y);
      return;
    }
    if (currentTool === 'eyedropper') {
      pickColor(x, y);
      return;
    }
    if (currentTool === 'text') {
      window.saveStateForUndo(); // Save state before adding text
      addText(x, y);
      return;
    }
    startDrawing(e);
  });

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  canvas.addEventListener('touchstart', handleTouch);
  canvas.addEventListener('touchmove', handleTouch);
  canvas.addEventListener('touchend', stopDrawing);

  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });

  document.getElementById('brushSize').addEventListener('input', updateBrushSize);
  document.getElementById('opacity').addEventListener('input', updateOpacity);
  document.getElementById('brushColor').addEventListener('input', e => brushColor = e.target.value);
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => setBrushColor(swatch.dataset.color));
  });

  document.querySelectorAll('.frame-cell').forEach(cell => {
    cell.addEventListener('click', () => selectFrame(parseInt(cell.dataset.frame)));
  });
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  frames[1] = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function fillAt(x, y) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const targetColor = getPixelColor(imageData, x, y);
  const fillColor = hexToRgba(brushColor, brushOpacity);
  if (!colorMatch(targetColor, fillColor)) {
    floodFill(imageData, x, y, targetColor, fillColor);
    ctx.putImageData(imageData, 0, 0);
    frames[currentFrame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

function pickColor(x, y) {
  const data = ctx.getImageData(x, y, 1, 1).data;
  const hex = `#${((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)}`;
  setBrushColor(hex);
}

function addText(x, y) {
  const text = prompt("Enter your text:");
  if (text) {
    ctx.font = `${brushSize * 5}px Arial`;
    ctx.fillStyle = brushColor;
    ctx.globalAlpha = brushOpacity;
    ctx.fillText(text, x, y);
    frames[currentFrame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

function getPixelColor(imageData, x, y) {
  const index = (y * imageData.width + x) * 4;
  return imageData.data.slice(index, index + 4);
}

function hexToRgba(hex, alpha = 1) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b, alpha * 255];
}

function colorMatch(a, b) {
  return a.every((val, i) => Math.abs(val - b[i]) < 32);
}

function floodFill(imageData, x, y, targetColor, fillColor) {
  const stack = [[x, y]];
  const width = imageData.width;
  const height = imageData.height;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const index = (cy * width + cx) * 4;
    const currentColor = imageData.data.slice(index, index + 4);
    if (!colorMatch(currentColor, targetColor)) continue;
    imageData.data.set(fillColor, index);
    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < height - 1) stack.push([cx, cy + 1]);
  }
}

function startDrawing(e) {
  isDrawing = true;
  startX = getX(e);
  startY = getY(e);
  
  // Save state before starting to draw
  if (currentTool === 'brush' || currentTool === 'eraser') {
    window.saveStateForUndo();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  } else if (['line', 'rectangle', 'circle'].includes(currentTool)) {
    window.saveStateForUndo();
  }
}
function drawInterpolatedLine(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist / 1.5);  // adjust 1.5 to control smoothness
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function draw(e) {
  if (!isDrawing || ['text', 'eyedropper', 'fill'].includes(currentTool)) return;
  const x = getX(e);
  const y = getY(e);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.strokeStyle = brushColor;
  previewCtx.lineWidth = brushSize;
  previewCtx.globalAlpha = brushOpacity;

  if (['brush', 'eraser'].includes(currentTool)) {
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = brushOpacity;
    drawInterpolatedLine(startX, startY, x, y);
    startX = x;  // Update start point for next segment
    startY = y;
  }
  else if (currentTool === 'line') {
    previewCtx.beginPath();
    previewCtx.moveTo(startX, startY);
    previewCtx.lineTo(x, y);
    previewCtx.stroke();
  } else if (currentTool === 'rectangle') {
    previewCtx.strokeRect(startX, startY, x - startX, y - startY);
  } else if (currentTool === 'circle') {
    const radius = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
    previewCtx.beginPath();
    previewCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
    previewCtx.stroke();
  }
}

function stopDrawing(e) {
  if (!isDrawing) return;
  isDrawing = false;
  const x = getX(e);
  const y = getY(e);
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.globalAlpha = brushOpacity;
  if (['line', 'rectangle', 'circle'].includes(currentTool)) {
    switch (currentTool) {
      case 'line': ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(x, y); ctx.stroke(); break;
      case 'rectangle': ctx.strokeRect(startX, startY, x - startX, y - startY); break;
      case 'circle':
        const radius = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
    }
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }
  ctx.closePath();
  frames[currentFrame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

function getX(e) {
  if (!e) return 0;
  return (e.clientX || e.touches?.[0]?.clientX || 0) - canvas.getBoundingClientRect().left;
}

function getY(e) {
  if (!e) return 0;
  return (e.clientY || e.touches?.[0]?.clientY || 0) - canvas.getBoundingClientRect().top;
}

function selectTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function updateBrushSize(e) {
  brushSize = parseInt(e.target.value);
  document.getElementById('brushSizeValue').textContent = `${brushSize}px`;
}

function updateOpacity(e) {
  brushOpacity = parseInt(e.target.value) / 100;
  document.getElementById('opacityValue').textContent = `${e.target.value}%`;
}

function setBrushColor(color) {
  brushColor = color;
  document.getElementById('brushColor').value = color;
}

function selectFrame(frame) {
  currentFrame = frame;
  document.getElementById('currentFrame').textContent = currentFrame;
  document.querySelectorAll('.frame-cell').forEach(cell => cell.classList.remove('active'));
  const active = document.querySelector(`.frame-cell[data-frame="${frame}"]`);
  if (active) active.classList.add('active');
  if (frames[frame]) {
    ctx.putImageData(frames[frame], 0, 0);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frames[frame] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  
  // Clear undo/redo stacks when switching frames
  undoStack = [];
  redoStack = [];
}

function togglePlay() {
  isPlaying = !isPlaying;
  const playBtn = document.getElementById('playBtn');
  playBtn.textContent = isPlaying ? '⏸' : '▶';
  if (isPlaying) {
    animationInterval = setInterval(() => {
      currentFrame++;
      if (currentFrame > totalFrames) currentFrame = 1;
      selectFrame(currentFrame);
    }, 1000 / parseInt(document.getElementById('fps').value));
  } else {
    clearInterval(animationInterval);
  }
}

function goHome() {
  document.getElementById('animationInterface').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const projectName = document.getElementById('projectName').value || 'Untitled';
  const savedList = document.getElementById('savedProjects');

  const canvas = document.getElementById('animationCanvas');
  const thumbnailURL = canvas.toDataURL('image/png');

  // Collect all frames as base64
  const frameData = {};
  for (let i = 1; i <= totalFrames; i++) {
    if (frames[i]) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(frames[i], 0, 0);
      frameData[i] = tempCanvas.toDataURL('image/png');
    }
  }

  // Store in localStorage
  const project = {
    name: projectName,
    width: canvas.width,
    height: canvas.height,
    totalFrames,
    frames: frameData,
  };
  localStorage.setItem(`project_${projectName}`, JSON.stringify(project));

  // Render thumbnail on home screen
  const projectBox = document.createElement('div');
  projectBox.classList.add('project-thumbnail');
  projectBox.style.background = '#7f8c8d';
  projectBox.style.padding = '10px';
  projectBox.style.borderRadius = '6px';
  projectBox.style.marginTop = '10px';
  projectBox.style.color = '#ecf0f1';
  projectBox.style.fontSize = '14px';
  projectBox.style.display = 'flex';
  projectBox.style.alignItems = 'center';
  projectBox.style.cursor = 'pointer';
  projectBox.style.gap = '10px';

  const thumbnail = document.createElement('img');
  thumbnail.src = thumbnailURL;
  thumbnail.style.width = '60px';
  thumbnail.style.height = '45px';
  thumbnail.style.objectFit = 'cover';
  thumbnail.style.borderRadius = '4px';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = projectName;

  projectBox.appendChild(thumbnail);
  projectBox.appendChild(nameSpan);
  savedList.appendChild(projectBox);

  // Add event to load project on click
  projectBox.addEventListener('click', () => loadProject(projectName));

  alert('Project saved to home screen!');
});
async function loadProject(name) {
  const saved = localStorage.getItem(`project_${name}`);
  if (!saved) {
    alert('Project not found!');
    return;
  }

  const data = JSON.parse(saved);

  // Switch to canvas view
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('animationInterface').style.display = 'block';

  // Update project title
  currentProjectName = name;
  document.getElementById('projectTitle').textContent = currentProjectName;

  // Resize canvas
  canvas.width = data.width;
  canvas.height = data.height;
  previewCanvas.width = data.width;
  previewCanvas.height = data.height;

  // Restore frames
  frames = {};
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  for (let i = 1; i <= data.totalFrames; i++) {
    const img = new Image();
    img.src = data.frames[i];
    await new Promise(resolve => {
      img.onload = () => {
        tempCtx.clearRect(0, 0, canvas.width, canvas.height);
        tempCtx.drawImage(img, 0, 0);
        frames[i] = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        resolve();
      };
    });
  }

  totalFrames = data.totalFrames;
  currentFrame = 1;

  document.getElementById('currentFrame').textContent = currentFrame;
  document.getElementById('totalFrames').textContent = totalFrames;

  if (typeof updateFrameTimeline === 'function') updateFrameTimeline();
  selectFrame(currentFrame);

  alert(`Project "${name}" loaded!`);
}
