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

// Variables for swipe detection
let handPositions = []
const maxPositions = 10 // Track last 10 positions
const swipeThreshold = 0.15 // Minimum distance for swipe (normalized 0-1) - more sensitive
const minSwipeSpeed = 0.08 // Minimum speed for swipe detection - more sensitive
let lastClearTime = 0 // Timestamp of last canvas clear
const clearDelay = 1000 // 1 second delay before allowing drawing again

function isSwipe(landmarks) {
  const wrist = landmarks[0] // Use wrist for whole hand/palm swipe detection
  const currentPos = { x: wrist.x, y: wrist.y, timestamp: Date.now() }
  
  // Add current position to history
  handPositions.push(currentPos)
  
  // Keep only recent positions
  if (handPositions.length > maxPositions) {
    handPositions.shift()
  }
  
  // Need at least 5 positions to detect swipe
  if (handPositions.length < 5) {
    return false
  }
  
  // Calculate movement over the last few frames
  const recentPositions = handPositions.slice(-5)
  const firstPos = recentPositions[0]
  const lastPos = recentPositions[recentPositions.length - 1]
  
  // Calculate distance and time
  const distanceX = Math.abs(lastPos.x - firstPos.x)
  const distanceY = Math.abs(lastPos.y - firstPos.y)
  const timeDiff = lastPos.timestamp - firstPos.timestamp
  
  // Check for significant movement
  const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
  const speed = totalDistance / (timeDiff / 1000) // pixels per second (normalized)
  
  // Detect swipe if movement is fast and covers minimum distance
  if (speed > minSwipeSpeed && totalDistance > swipeThreshold) {
    // Clear position history after detecting swipe
    handPositions = []
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
    
    // Check if swipe gesture detected
    if (isSwipe(landmarks)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      prevX = null
      prevY = null
      lastClearTime = Date.now() // Record when canvas was cleared
      return // Skip drawing when clearing
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
    handPositions = [] // Also clear swipe history
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