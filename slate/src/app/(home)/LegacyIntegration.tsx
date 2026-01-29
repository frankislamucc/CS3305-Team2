"use client"

import React, { useEffect, useRef } from "react"

// Lightweight declarations for MediaPipe globals to silence TS/IDE warnings
declare const Hands: any
declare const Camera: any
declare const drawConnectors: any
declare const drawLandmarks: any

// Minimal OneEuroFilter port (copied from legacy script)
class OneEuroFilter {
  minCutoff: number | number[]
  beta: number | number[]
  dCutoff: number | number[]
  xPrev: any
  dxPrev: any
  tPrev: number

  constructor(t0: number, x0: any, dx0 = 0.0, minCutoff = 1.0, beta = 0.03, dCutoff = 1.0) {
    const isArray = Array.isArray
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

  filter(t: number, x: any): any {
    const isArray = Array.isArray
    const smoothingFactor = (t_e: number, cutoff: number) => {
      const r = 2 * Math.PI * cutoff * t_e
      return r / (r + 1)
    }
    const exponentialSmoothing = (a: number, v: any, prev: any) => a * v + (1 - a) * prev
    const sub = (a: any, b: any) => (isArray(a) ? a.map((v: any, i: number) => v - b[i]) : a - b)
    const div = (a: any, b: number) => (isArray(a) ? a.map((v: any) => v / b) : a / b)

    const t_e = t - this.tPrev
    if (t_e <= 0) return this.xPrev

    const a_d = isArray(this.dCutoff)
      ? (this.dCutoff as number[]).map(dc => smoothingFactor(t_e, dc))
      : smoothingFactor(t_e, this.dCutoff as number)

    const dx = div(sub(x, this.xPrev), t_e)

    const dxHat = isArray(dx)
      ? (dx as any[]).map((v: any, i: number) => exponentialSmoothing((a_d as number[])[i], v, this.dxPrev[i]))
      : exponentialSmoothing(a_d as number, dx, this.dxPrev)

    const cutoff = isArray(dxHat)
      ? (dxHat as number[]).map((v: number, i: number) => (this.minCutoff as number[])[i] + (this.beta as number[])[i] * Math.abs(v))
      : (this.minCutoff as number) + (this.beta as number) * Math.abs(dxHat as number)

    const a = isArray(cutoff)
      ? (cutoff as number[]).map(c => smoothingFactor(t_e, c))
      : smoothingFactor(t_e, cutoff as number)

    const xHat = isArray(x)
      ? (x as any[]).map((v: any, i: number) => exponentialSmoothing((a as number[])[i], v, this.xPrev[i]))
      : exponentialSmoothing(a as number, x, this.xPrev)

    this.xPrev = isArray(xHat) ? [...(xHat as any[])] : xHat
    this.dxPrev = isArray(dxHat) ? [...(dxHat as any[])] : dxHat
    this.tPrev = t
    return xHat
  }
}

export default function LegacyIntegration() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const uiRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let camera: any = null
    let hands: any = null
    let stopped = false

    // load mediapipe scripts sequentially
    const loadScript = (src: string): Promise<void> =>
      new Promise<void>((resolve) => {
        const s = document.createElement("script")
        s.src = src
        s.onload = () => resolve()
        document.head.appendChild(s)
      })

    let resizeAll: () => void

    async function init() {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js")
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js")

      if (stopped) return

      const video = videoRef.current!
      const canvas = canvasRef.current!
      const videoOverlay = overlayRef.current!
      const uiCanvas = uiRef.current!

      const ctx = canvas.getContext("2d")!
      const videoCtx = videoOverlay.getContext("2d")!
      const uiCtx = uiCanvas.getContext("2d")!

      resizeAll = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        uiCanvas.width = window.innerWidth
        uiCanvas.height = window.innerHeight
        videoOverlay.width = 200
        videoOverlay.height = 150
      }

      resizeAll()
      window.addEventListener("resize", resizeAll)

      let prevX: number | null = null
      let prevY: number | null = null
      const PINCH_THRESHOLD_PX: number = 50
      let clearedThisFist: boolean = false
      let lastClearTime: number = 0
      const clearDelay: number = 1000

      type Point = { x: number; y: number }

      function distance(a: Point, b: Point): number {
        return Math.hypot(a.x - b.x, a.y - b.y)
      }

      function isFist(landmarks: Array<Point>): boolean {
        const palmCenter: Point = {
          x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
          y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
        }
        const threshold = 0.12
        return (
          distance(landmarks[4], palmCenter) < threshold &&
          distance(landmarks[8], palmCenter) < threshold &&
          distance(landmarks[12], palmCenter) < threshold &&
          distance(landmarks[16], palmCenter) < threshold &&
          distance(landmarks[20], palmCenter) < threshold
        )
      }

      const t0 = performance.now() / 1000
      const indexFilterXY = new (OneEuroFilter as any)(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)
      const thumbFilterXY = new (OneEuroFilter as any)(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)
      const pinchIndexFilterXY = new (OneEuroFilter as any)(t0, [0, 0], 0.0, 2.2, 0.18, 1.2)

      // @ts-ignore - globals provided by scripts
      hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` })
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.65 })

      hands.onResults((results: any) => {
        videoCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height)
        uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const t = performance.now() / 1000
          const landmarks = results.multiHandLandmarks[0].map((lm: any) => ({ x: 1 - lm.x, y: lm.y, z: lm.z }))

          if (isFist(landmarks)) {
            if (!clearedThisFist) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              prevX = null
              prevY = null
              lastClearTime = Date.now()
              clearedThisFist = true
            }
            return
          } else clearedThisFist = false

          if (Date.now() - lastClearTime < clearDelay) return

          const rawThumb = landmarks[4]
          const rawIndex = landmarks[8]
          const thumbXY = thumbFilterXY.filter(t, [rawThumb.x, rawThumb.y])
          const pinchIndexXY = pinchIndexFilterXY.filter(t, [rawIndex.x, rawIndex.y])
          const connected = Math.abs((thumbXY[0] - pinchIndexXY[0]) * canvas.width) < PINCH_THRESHOLD_PX && Math.abs((thumbXY[1] - pinchIndexXY[1]) * canvas.height) < PINCH_THRESHOLD_PX

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
            prevX = null
            prevY = null
          }

          // draw pinch indicator on uiCanvas
          const tx = landmarks[4].x * uiCanvas.width
          const ty = landmarks[4].y * uiCanvas.height
          const ix = landmarks[8].x * uiCanvas.width
          const iy = landmarks[8].y * uiCanvas.height
          if (!connected) {
            uiCtx.beginPath(); uiCtx.arc(tx, ty, 6, 0, Math.PI * 2); uiCtx.fillStyle = "rgba(255,0,0,0.3)"; uiCtx.fill()
            uiCtx.beginPath(); uiCtx.arc(ix, iy, 6, 0, Math.PI * 2); uiCtx.fillStyle = "rgba(255,0,0,0.3)"; uiCtx.fill()
          } else {
            const mx = (tx + ix) / 2; const my = (ty + iy) / 2
            uiCtx.beginPath(); uiCtx.arc(mx, my, 8, 0, Math.PI * 2); uiCtx.fillStyle = "rgba(255,0,0,0.95)"; uiCtx.fill()
          }
        } else {
          prevX = null; prevY = null; clearedThisFist = false
        }
      })

      // @ts-ignore
      camera = new Camera(video, { onFrame: async () => { await hands.send({ image: video }) }, width: 640, height: 480 })
      camera.start()
    }

    init().catch(console.error)

    return () => {
      stopped = true
      try {
        if (camera && typeof camera.stop === "function") camera.stop()
      } catch (e) {}
      try {
        if (hands && typeof hands.close === "function") hands.close()
      } catch (e) {}
      try {
        window.removeEventListener("resize", resizeAll)
      } catch (e) {}
    }
  }, [])

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <video id="video" ref={videoRef} autoPlay style={{ position: "absolute", top: 10, right: 10, width: 200, height: 150, borderRadius: 5, transform: "scaleX(-1)", zIndex: 10 }} />
      <canvas id="videoOverlay" ref={overlayRef} style={{ position: "absolute", top: 10, right: 10, width: 200, height: 150, pointerEvents: "none", zIndex: 11, transform: "scaleX(-1)" }} />
      <canvas id="canvas" ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      <canvas id="uiCanvas" ref={uiRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 5 }} />
    </div>
  )
}
