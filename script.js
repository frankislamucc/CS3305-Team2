import { OneEuroFilter, smoothingFactor, exponentialSmoothing } from './OneEuro.js';

class ViewTransform {
  constructor() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.minScale = 0.5;
    this.maxScale = 3.0;
    this.panSpeed = 1.5;
    this.onChangeCallback = null;
  }

  setOnChangeCallback(callback) {
    this.onChangeCallback = callback;
  }

  notifyChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  screenToCanvas(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.scale + this.offsetX,
      y: canvasY * this.scale + this.offsetY
    };
  }

  zoomAtPoint(factor, pointX, pointY) {
    const oldScale = this.scale;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));

    if (oldScale !== newScale) {
      this.offsetX = pointX - (pointX - this.offsetX) * (newScale / oldScale);
      this.offsetY = pointY - (pointY - this.offsetY) * (newScale / oldScale);
      this.scale = newScale;
      this.notifyChange();
    }
  }

  pan(deltaX, deltaY) {
    this.offsetX += deltaX * this.panSpeed;
    this.offsetY += deltaY * this.panSpeed;
    this.notifyChange();
  }

  reset() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.notifyChange();
  }
}

function drawPinchLandmarks(landmarks, ctx, width, height, connected) {
  // Draw thumb and index finger tips with visual feedback

  ctx.clearRect(0, 0, width, height) // Clear previous frame
  
  const thumb = landmarks[4]  // Thumb tip landmark
  const index = landmarks[8]  // Index finger tip landmark
  
  // Convert normalized coordinates to pixel coordinates
  const tx = thumb.x * width
  const ty = thumb.y * height
  const ix = index.x * width
  const iy = index.y * height
  
  if (!connected) {
    // Not pinching: show two separate faint points
    ctx.beginPath()
    ctx.arc(tx, ty, 6, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)" // Faint red
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(ix, iy, 6, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
    ctx.fill()
  } else {
    // Pinching: show single merged point at midpoint
    const mx = (tx + ix) / 2
    const my = (ty + iy) / 2
    
    ctx.beginPath()
    ctx.arc(mx, my, 8, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.95)" // Solid red
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(ix, iy)
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const videoOverlay = document.getElementById("videoOverlay")
const uiCanvas = document.getElementById("uiCanvas") // For cursor/feedback

const ctx = canvas.getContext("2d")
const videoCtx = videoOverlay.getContext("2d")
const uiCtx = uiCanvas.getContext("2d")

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

const INITIAL_CANVAS_SIZE = 4000;
offscreenCanvas.width = INITIAL_CANVAS_SIZE;
offscreenCanvas.height = INITIAL_CANVAS_SIZE;
offscreenCtx.fillStyle = 'white';
offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

const view = new ViewTransform();

let needsViewRedraw = true;
let needsUIRedraw = true;

view.setOnChangeCallback(() => {
  needsViewRedraw = true;
});

function resizeCanvases() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  uiCanvas.width = window.innerWidth
  uiCanvas.height = window.innerHeight
  videoOverlay.width = 160
  videoOverlay.height = 120
  needsViewRedraw = true;
}

let prevX = null
let prevY = null

resizeCanvases()

window.addEventListener("resize", resizeCanvases)

const THUMB_TIP_INDEX = 4      
const INDEX_FINGER_TIP_INDEX = 8 
const PINCH_THRESHOLD_PX = 50  

let isPanning = false
let lastPanPosition = null

document.getElementById('clearBtn').addEventListener('click', () => {
  offscreenCtx.fillStyle = 'white';
  offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  prevX = null;
  prevY = null;
  lastFilteredPos = null;
  needsViewRedraw = true;
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  view.zoomAtPoint(1.2, window.innerWidth / 2, window.innerHeight / 2);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
  view.zoomAtPoint(0.8, window.innerWidth / 2, window.innerHeight / 2);
});

document.getElementById('resetViewBtn').addEventListener('click', () => {
  view.reset();
});

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function isFist(landmarks) {
  // Calculate palm center as average of wrist and finger bases
  const palmCenter = {
    x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
    y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
  }


  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const ringTip = landmarks[16]
  const pinkyTip = landmarks[20]

  const threshold = 0.12 // Tighter threshold for stricter fist detection
  
  // Check if all finger tips are close to the palm center (indicating a fist)
  if (distance(thumbTip, palmCenter) < threshold &&
      distance(indexTip, palmCenter) < threshold &&
      distance(middleTip, palmCenter) < threshold &&
      distance(ringTip, palmCenter) < threshold &&
      distance(pinkyTip, palmCenter) < threshold) {
    return true
  }
  return false
}

function isPinching(thumbXY, indexXY, width, height) {
  // Check if thumb and index are close enough to be considered "pinching"
  
  // Convert normalized distance to pixel distance
  const dx = (thumbXY[0] - indexXY[0]) * width
  const dy = (thumbXY[1] - indexXY[1]) * height
  
  // Check if both X and Y distances are below threshold
  return Math.abs(dx) < PINCH_THRESHOLD_PX && Math.abs(dy) < PINCH_THRESHOLD_PX
}


const initTime = performance.now() / 1000 // Initial timestamp in seconds

const indexFilterXY = new OneEuroFilter(initTime, [0, 0], 0.0, 1.0, 0.05, 0.8)
const thumbFilterXY = new OneEuroFilter(initTime, [0, 0], 0.0, 1.0, 0.05, 0.8)
const pinchIndexFilterXY = new OneEuroFilter(initTime, [0, 0], 0.0, 1.0, 0.05, 0.8)

class SimpleEMA {
  constructor(alpha = 0.3) {
    this.alpha = alpha
    this.value = null
  }

  filter(newValue) {
    if (this.value === null) {
      this.value = Array.isArray(newValue) ? [...newValue] : newValue
      return this.value
    }

    if (Array.isArray(newValue)) {
      this.value = this.value.map((value, index) =>
        this.alpha * newValue[index] + (1 - this.alpha) * value
      )
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * value
    }

    return this.value
  }
}

const drawEMA = new SimpleEMA(0.4)

let lastFilteredPos = null
let lastUpdateTime = 0

const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
})

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6
})

function renderView() {
  if (!needsViewRedraw) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const topLeft = view.screenToCanvas(0, 0);
  const bottomRight = view.screenToCanvas(canvas.width, canvas.height);

  const visibleWidth = bottomRight.x - topLeft.x;
  const visibleHeight = bottomRight.y - topLeft.y;

  ctx.drawImage(
    offscreenCanvas,
    topLeft.x, topLeft.y, visibleWidth, visibleHeight,
    0, 0, canvas.width, canvas.height
  );

  needsViewRedraw = false;
}


function animationLoop() {
  if (needsViewRedraw) renderView();
  if (needsUIRedraw) needsUIRedraw = false;

  requestAnimationFrame(animationLoop)
}

animationLoop();


hands.onResults(results => {
  // Clear video overlay each frame
  videoCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height)
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {// Hand detected - get current timestamp for filters
    const time = performance.now() / 1000
    const currentTimeMs = performance.now()
    const landmarks = results.multiHandLandmarks[0].map(landmark => ({
      x: 1 - landmark.x, // Mirror horizontally
      y: landmark.y,
      z: landmark.z
    }))

    // Check if fist gesture detected
    if (isFist(landmarks)) {
        const palmCenter = {
          x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
          y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
      };

      const screenX = palmCenter.x * uiCanvas.width;
      const screenY = palmCenter.y * uiCanvas.height;

      if (!isPanning) {
        isPanning = true;
        lastPanPosition = { x: screenX, y: screenY };
      } else if (lastPanPosition) {
        const deltaX = lastPanPosition.x - screenX;
        const deltaY = lastPanPosition.y - screenY;

        view.pan(deltaX, deltaY);

        lastPanPosition = { x: screenX, y: screenY };
      }

      prevX = null;
      prevY = null;
      lastFilteredPos = null;

      drawPinchLandmarks(
        landmarks,
        uiCtx,
        uiCanvas.width,
        uiCanvas.height,
        false
      );

  } else {
    // Not a fist
    isPanning = false;
    lastPanPosition = null;

    const rawThumb = landmarks[THUMB_TIP_INDEX]
    const rawIndex = landmarks[INDEX_FINGER_TIP_INDEX]

    const thumbXY = thumbFilterXY.filter(time, [rawThumb.x, rawThumb.y])
    const pinchIndexXY = pinchIndexFilterXY.filter(time, [rawIndex.x, rawIndex.y])

    const connected = isPinching(thumbXY, pinchIndexXY, canvas.width, canvas.height)

    const drawXY = indexFilterXY.filter(time, [rawIndex.x, rawIndex.y])
    const drawSmoothed = drawEMA.filter(drawXY)

    const screenX = drawSmoothed[0] * canvas.width
    const screenY = drawSmoothed[1] * canvas.height
      
    // Convert screen coordinates to world coordinates for drawing on offscreen canvas
    const worldPos = view.screenToCanvas(screenX, screenY)
    const currentX = worldPos.x
    const currentY = worldPos.y

    if (connected) {
      let drawX = currentX
      let drawY = currentY

      // Interpolate
      if (lastFilteredPos && (currentTimeMs - lastUpdateTime < 50)) { // Only interpolate if recent
        const timeDiff = currentTimeMs - lastUpdateTime
        const interpolationFactor = Math.min(0.3, timeDiff / 50) // 30 FPS Interpolation

        drawX = lastFilteredPos.x + (currentX - lastFilteredPos.x) * interpolationFactor
        drawY = lastFilteredPos.y + (currentY - lastFilteredPos.y) * interpolationFactor
      }
      if (prevX !== null && prevY !== null) {
          offscreenCtx.beginPath()
          offscreenCtx.moveTo(prevX, prevY)
          offscreenCtx.lineTo(drawX, drawY)
          offscreenCtx.strokeStyle = 'black'
          offscreenCtx.lineWidth = 5
          offscreenCtx.lineCap = 'round'
          offscreenCtx.stroke()

          needsViewRedraw = true;
        }
    
      prevX = drawX
      prevY = drawY

      lastFilteredPos = {x: drawX, y: drawY}
      lastUpdateTime = currentTimeMs

      } else {
      // NOT PINCHING: "Lift pen" - break the line
      prevX = null
      prevY = null
      lastFilteredPos = null
    }


    drawPinchLandmarks(
      landmarks,
      uiCtx,
      uiCanvas.width,
      uiCanvas.height,
      connected
    )
  }
  } else {
    // No hand detected: reset drawing state
    prevX = null
    prevY = null
    lastPanPosition = null
    lastFilteredPos = null
  }

  renderView();
})

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video })
  },
  width: 1280,
  height: 720
})

camera.start()