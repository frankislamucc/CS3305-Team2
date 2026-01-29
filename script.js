/***********************
 * One Euro Filter
 ***********************/
function smoothingFactor(t_e, cutoff) {
  const r = 2 * Math.PI * cutoff * t_e
  return r / (r + 1)
}

function exponentialSmoothing(a, x, xPrev) {
  return a * x + (1 - a) * xPrev
}

function isArray(x) {
  return Array.isArray(x)
}

function sub(a, b) {
  if (isArray(a)) return a.map((v, i) => v - b[i])
  return a - b
}

function div(a, b) {
  if (isArray(a)) return a.map(v => v / b)
  return a / b
}

class OneEuroFilter {
  constructor(t0, x0, dx0 = 0.0, minCutoff = 1.0, beta = 0.03, dCutoff = 1.0) {
    // NOTE: I set practical webcam defaults:
    // minCutoff ~ 0.8–2.0, beta ~ 0.02–0.08, dCutoff ~ 1.0
    if (isArray(x0)) {
      this.minCutoff = x0.map(() => minCutoff)
      this.beta = x0.map(() => beta)
      this.dCutoff = x0.map(() => dCutoff)

      this.xPrev = [...x0]
      this.dxPrev = x0.map(() => dx0)
    } else {
      this.minCutoff = minCutoff
      this.beta = beta
      this.dCutoff = dCutoff

      this.xPrev = x0
      this.dxPrev = dx0
    }

    this.tPrev = t0
  }

  filter(t, x) {
    const t_e = t - this.tPrev
    if (t_e <= 0) return this.xPrev

    const a_d = isArray(this.dCutoff)
      ? this.dCutoff.map(dc => smoothingFactor(t_e, dc))
      : smoothingFactor(t_e, this.dCutoff)

    const dx = div(sub(x, this.xPrev), t_e)

    const dxHat = isArray(dx)
      ? dx.map((v, i) => exponentialSmoothing(a_d[i], v, this.dxPrev[i]))
      : exponentialSmoothing(a_d, dx, this.dxPrev)

    const cutoff = isArray(dxHat)
      ? dxHat.map((v, i) => this.minCutoff[i] + this.beta[i] * Math.abs(v))
      : this.minCutoff + this.beta * Math.abs(dxHat)

    const a = isArray(cutoff)
      ? cutoff.map(c => smoothingFactor(t_e, c))
      : smoothingFactor(t_e, cutoff)

    const xHat = isArray(x)
      ? x.map((v, i) => exponentialSmoothing(a[i], v, this.xPrev[i]))
      : exponentialSmoothing(a, x, this.xPrev)

    this.xPrev = isArray(xHat) ? [...xHat] : xHat
    this.dxPrev = isArray(dxHat) ? [...dxHat] : dxHat
    this.tPrev = t

    return xHat
  }
}

// finger tip display code
function drawPinchLandmarks(landmarks, ctx, width, height, connected) {
  ctx.clearRect(0, 0, width, height)

  const thumb = landmarks[4]
  const index = landmarks[8]

  const tx = thumb.x * width
  const ty = thumb.y * height

  const ix = index.x * width
  const iy = index.y * height

  if (!connected) {
    // faint two points
    ctx.beginPath()
    ctx.arc(tx, ty, 6, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
    ctx.fill()

    ctx.beginPath()
    ctx.arc(ix, iy, 6, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
    ctx.fill()
  } else {
    // one darker merged point (midpoint)
    const mx = (tx + ix) / 2
    const my = (ty + iy) / 2

    ctx.beginPath()
    ctx.arc(mx, my, 8, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 0, 0, 0.95)"
    ctx.fill()
  }
}


function resizeCanvasToDisplaySize(c) {
  const rect = c.getBoundingClientRect()
  c.width = Math.round(rect.width)
  c.height = Math.round(rect.height)
}

function resizeAllCanvases() {
  resizeCanvasToDisplaySize(canvas)    // your drawing canvas
  resizeCanvasToDisplaySize(uiCanvas)  // your dot canvas
}


/***********************
 * Your app code
 ***********************/
const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const videoOverlay = document.getElementById("videoOverlay")
const ctx = canvas.getContext("2d")
const videoCtx = videoOverlay.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight
videoOverlay.width = 200
videoOverlay.height = 150

let prevX = null
let prevY = null

/******* Cursor setup */
const uiCanvas = document.getElementById("uiCanvas")
const uiCtx = uiCanvas.getContext("2d")

uiCanvas.width = window.innerWidth
uiCanvas.height = window.innerHeight

window.addEventListener("resize",() => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  uiCanvas.width = window.innerWidth
  uiCanvas.height = window.innerHeight
}) 

/*******/

// Pinch indices + threshold
const THUMB_TIP_INDEX = 4
const INDEX_FINGER_TIP_INDEX = 8
const PINCH_THRESHOLD_PX = 50 // good webcam starting point

// Fist detection
let clearedThisFist = false
let lastClearTime = 0
const clearDelay = 1000

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function isFist(landmarks) {
  const palmCenter = {
    x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
    y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
  }

  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const ringTip = landmarks[16]
  const pinkyTip = landmarks[20]

  const threshold = 0.12

  return (
    distance(thumbTip, palmCenter) < threshold &&
    distance(indexTip, palmCenter) < threshold &&
    distance(middleTip, palmCenter) < threshold &&
    distance(ringTip, palmCenter) < threshold &&
    distance(pinkyTip, palmCenter) < threshold
  )
}

// ---- One Euro filters ----
// Smooth the DRAW point (index tip x/y)
const t0 = performance.now() / 1000
const indexFilterXY = new OneEuroFilter(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)

// Smooth pinch endpoints too (helps avoid flicker)
const thumbFilterXY = new OneEuroFilter(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)
const pinchIndexFilterXY = new OneEuroFilter(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)


function isPinching(thumbXY, indexXY, width, height) {
  const dx = (thumbXY[0] - indexXY[0]) * width
  const dy = (thumbXY[1] - indexXY[1]) * height
  return Math.abs(dx) < PINCH_THRESHOLD_PX && Math.abs(dy) < PINCH_THRESHOLD_PX
}

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
})

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.65
})

hands.onResults(results => {
  videoCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height)

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const t = performance.now() / 1000

    // Mirror for drawing coords
    const landmarks = results.multiHandLandmarks[0].map(lm => ({
      x: 1 - lm.x,
      y: lm.y,
      z: lm.z
    }))

    // 1) Fist clears canvas
    if (isFist(landmarks)) {
      if (!clearedThisFist) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        prevX = null
        prevY = null
        lastClearTime = Date.now()
        clearedThisFist = true
      }
      return
    } else {
      clearedThisFist = false
    }

    // 2) Delay after clearing
    if (Date.now() - lastClearTime < clearDelay) return

    // 3) Get raw thumb+index, then filter for stable pinch detection
    const rawThumb = landmarks[THUMB_TIP_INDEX]
    const rawIndex = landmarks[INDEX_FINGER_TIP_INDEX]

    const thumbXY = thumbFilterXY.filter(t, [rawThumb.x, rawThumb.y])
    const pinchIndexXY = pinchIndexFilterXY.filter(t, [rawIndex.x, rawIndex.y])

    const connected = isPinching(thumbXY, pinchIndexXY, canvas.width, canvas.height)
    const connectedOverlay = isPinching(thumbXY, pinchIndexXY, videoOverlay.width, videoOverlay.height)

    // 4) Filter draw point (index tip), then draw only while pinching
    const drawXY = indexFilterXY.filter(t, [rawIndex.x, rawIndex.y])
    const currentX = drawXY[0] * canvas.width
    const currentY = drawXY[1] * canvas.height

    if (connected) {
      if (prevX !== null && prevY !== null) {
        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(currentX, currentY)
        ctx.strokeStyle = "black"
        ctx.lineWidth = 5
        ctx.stroke()
      }
      prevX = currentX
      prevY = currentY
    } else {
      // pen up
      prevX = null
      prevY = null
    }

    // Overlay (not mirrored, just visual)
    const scaledLandmarks = results.multiHandLandmarks[0].map(lm => ({
      x: lm.x * videoOverlay.width,
      y: lm.y * videoOverlay.height,
      z: lm.z
    }))
    // drawConnectors(videoCtx, scaledLandmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 })
    // drawLandmarks(videoCtx, scaledLandmarks, { color: "#FF0000", lineWidth: 1 })

    //cursor almost losing track of where the writing would restart from

  drawPinchLandmarks(
    landmarks,
    uiCtx,
    uiCanvas.width,
    uiCanvas.height,
    connected
  )

    
  } else {
    prevX = null
    prevY = null
    clearedThisFist = false
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
