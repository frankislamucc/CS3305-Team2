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

const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
})

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
})

hands.onResults(results => {
  // Clear video overlay each frame
  videoCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height)

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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
    
    // Get index finger tip position (landmark 8)
    const indexTip = landmarks[8]
    const currentX = indexTip.x * canvas.width
    const currentY = indexTip.y * canvas.height

    // Draw continuous line from previous position to current position
    if (prevX !== null && prevY !== null) {
      ctx.beginPath()
      ctx.moveTo(prevX, prevY)
      ctx.lineTo(currentX, currentY)
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 5
      ctx.stroke()
    }

    // Update previous position (for swipe detection)
    prevX = currentX
    prevY = currentY

    // Draw hand landmarks on video overlay (scaled to video size)
    const scaledLandmarks = results.multiHandLandmarks[0].map(landmark => ({
      x: landmark.x * videoOverlay.width,
      y: landmark.y * videoOverlay.height,
      z: landmark.z
    }))
    
    drawConnectors(videoCtx, scaledLandmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2})
    drawLandmarks(videoCtx, scaledLandmarks, {color: '#FF0000', lineWidth: 1})
  } else {
    // Reset previous position when no hand detected
    prevX = null
    prevY = null
    clearedThisFist = false // Reset fist flag
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