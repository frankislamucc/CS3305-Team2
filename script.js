 // One Euro Filter Implementation
function smoothingFactor(time_elapsed, cutoff) {
  // Calculate smoothing factor based on time elapsed and cutoff frequency
  const rate = 2 * Math.PI * cutoff * time_elapsed
  return rate / (rate + 1)
}

function exponentialSmoothing(a, newValue, prevValue) {
  // Apply exponential smoothing: blends new value with previous value
  // lower a is, more smoothing
  return a * newValue + (1 - a) * prevValue
}

function isArray(newValue) {
  return Array.isArray(newValue)
}

function sub(a, b) {
  if (isArray(a)) return a.map((value, index) => value - b[index])
  return a - b
}

function div(a, b) {
  if (isArray(a)) return a.map(value => value / b)
  return a / b
}

class OneEuroFilter {
  constructor(initTime, initValue, initDeriv = 0.0, minCutoff = 1.0, beta = 0.05, dCutoff = 1.0) {
    // Initialize filter with starting values
    // initTime: initial timestamp (seconds)
    // initValue: initial value(s) - can be scalar or [x,y] array
    // initDeriv: initial derivative (velocity) - defaults to 0
    // minCutoff: minimum cutoff frequency (Hz) - controls base smoothing
    // beta: speed coefficient - higher = more responsive to fast movements
    // dCutoff: cutoff for derivative filtering - smooths velocity estimates
    
    if (isArray(initValue)) {
      // Array mode: track multiple dimensions (like x,y coordinates)
      this.minCutoff = initValue.map(() => minCutoff)
      this.beta = initValue.map(() => beta)
      this.dCutoff = initValue.map(() => dCutoff)
      
      this.prevValue = [...initValue] // Store previous filtered position
      this.dxPrev = initValue.map(() => initDeriv) // Store previous derivative
    } else {
      // Scalar mode: track single value
      this.minCutoff = minCutoff
      this.beta = beta
      this.dCutoff = dCutoff
      
      this.prevValue = initValue
      this.dxPrev = initDeriv
    }
    
    this.tPrev = initTime // Store previous timestamp
  }

  filter(time, newValue) {
    // Apply filter to new measurement
    // time: current timestamp (seconds)
    // newValue: new measurement value(s)
    // Returns: filtered value(s)
    
    const time_elapsed = time - this.tPrev // Time elapsed since last update
    if (time_elapsed <= 0) return this.prevValue
    
    const a_d = isArray(this.dCutoff)
      ? this.dCutoff.map(dc => smoothingFactor(time_elapsed, dc))
      : smoothingFactor(time_elapsed, this.dCutoff)
    
    // Calculate raw derivative: (new - old) / time
    const dx = div(sub(newValue, this.prevValue), time_elapsed)
    
    // Apply smoothing to derivative
    const dxHat = isArray(dx)
      ? dx.map((value, index) => exponentialSmoothing(a_d[index], value, this.dxPrev[index]))
      : exponentialSmoothing(a_d, dx, this.dxPrev)
    
    const cutoff = isArray(dxHat)
      ? dxHat.map((value, index) => this.minCutoff[index] + this.beta[index] * Math.abs(value))
      : this.minCutoff + this.beta * Math.abs(dxHat)

    const a = isArray(cutoff)
      ? cutoff.map(c => smoothingFactor(time_elapsed, c))
      : smoothingFactor(time_elapsed, cutoff)
    
    // Apply smoothing to position
    const xHat = isArray(newValue)
      ? newValue.map((value, index) => exponentialSmoothing(a[index], value, this.prevValue[index]))
      : exponentialSmoothing(a, newValue, this.prevValue)

    this.prevValue = isArray(xHat) ? [...xHat] : xHat
    this.dxPrev = isArray(dxHat) ? [...dxHat] : dxHat
    this.tPrev = time
    
    return xHat
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

function resizeCanvases() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  uiCanvas.width = window.innerWidth
  uiCanvas.height = window.innerHeight
  videoOverlay.width = 160
  videoOverlay.height = 120
}

let prevX = null
let prevY = null

resizeCanvases()

window.addEventListener("resize", resizeCanvases)

const THUMB_TIP_INDEX = 4      
const INDEX_FINGER_TIP_INDEX = 8 
const PINCH_THRESHOLD_PX = 50  

// Variables for fist detection
let clearedThisFist = false
let lastClearTime = 0 // Timestamp of last canvas clear
const clearDelay = 1000 // 1 second delay before allowing drawing again


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
      if (!clearedThisFist) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        prevX = null
        prevY = null
        lastClearTime = Date.now() // Record when canvas was cleared
        clearedThisFist = true
      }
      lastFilteredPos = null
      return // Skip drawing when fist is detected
    } else {
      clearedThisFist = false
    }

    // Check if we're still in the delay period after clearing
    const timeSinceClear = Date.now() - lastClearTime
    if (timeSinceClear < clearDelay) {
      // Still in delay period, don't draw yet
      return
    }
    const rawThumb = landmarks[THUMB_TIP_INDEX]
    const rawIndex = landmarks[INDEX_FINGER_TIP_INDEX]

    const thumbXY = thumbFilterXY.filter(time, [rawThumb.x, rawThumb.y])
    const pinchIndexXY = pinchIndexFilterXY.filter(time, [rawIndex.x, rawIndex.y])

    const connected = isPinching(thumbXY, pinchIndexXY, canvas.width, canvas.height)

    const drawXY = indexFilterXY.filter(time, [rawIndex.x, rawIndex.y])
    const drawSmoothed = drawEMA.filter(drawXY)
    
    const currentX = drawSmoothed[0] * canvas.width
    const currentY = drawSmoothed[1] * canvas.height

    if (connected) {
      const time = performance.now()
      
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
        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(drawX, drawY)
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.stroke()
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
  } else {
    // No hand detected: reset drawing state
    prevX = null
    prevY = null
    clearedThisFist = false
    lastFilteredPos = null
  }
})

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video })
  },
  width: 640,
  height: 480
})

camera.start()