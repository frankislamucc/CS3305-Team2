"use client";
import { Stage, Layer, Line, Circle, Rect, Text, Arrow } from "react-konva";
import type {
  CanvasHandle,
  LineData,
  LandmarkData,
  CircleData,
  TextData,
  ArrowData,
} from "../_types";
import {
  RefObject,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { Dimensions } from "../_types";
import type { Line as LineType } from "konva/lib/shapes/Line";
import ColourWheelSpinner from "./ColourWheelSpinner";
import SizeSelector from "./sizeSelector";
import { ViewTransform } from "./ViewTransform";
import { OneEuroFilter, SimpleEMA } from "./OneEuro";

interface CanvasProps {
  lines: LineData[];
  circles: CircleData[];
  text: TextData[];
  arrows: ArrowData[];
  canvasRef: RefObject<CanvasHandle | null>;
  onPaste?: (lines: LineData[]) => void;
  onCut?: (remainingLines: LineData[]) => void;
  viewOnly?: boolean;
}

// Expects input like "hsl(0, 100%, 50%)"
function hslToRgba(hslString: string, alpha: number): string {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `rgba(255, 0, 0, ${alpha})`; // fallback to red

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  // HSL to RGB conversion
  let r = 0,
    g = 0,
    b = 0;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const rInt = Math.round(r * 255);
  const gInt = Math.round(g * 255);
  const bInt = Math.round(b * 255);

  return `rgba(${rInt}, ${gInt}, ${bInt}, ${alpha})`;
}

function isColourWhite(col: string) {
  if (!col) return false;
  const c = col.trim().toLowerCase();
  if (c === "white") return true;
  if (c.startsWith("#")) return /^#f{3,6}$/i.test(c.replace(/\s+/g, ""));
  return c.includes("100%");
}

export default function Canvas(props: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<LineType>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  const layerRef = useRef<any>(null);
  const [layerReady, setLayerReady] = useState(false);
  const hudLayerRef = useRef<any>(null);
  const [hudLayerReady, setHudLayerReady] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [sizeSelectorY, setSizeSelector] = useState(0);
  const spinnerStartX = useRef(0);
  const sizeSelectorStartY = useRef(0);
  const [selectedColor, setSelectedColor] = useState("#df4b26");
  const [selectedSize, setSelectedSize] = useState(2);
  const transform = useRef(new ViewTransform());
  const [, forceUpdate] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkData | null>(null);

  // ── Copy & Paste selection state ──
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [clippedLines, setClippedLines] = useState<LineData[]>([]);
  const [clipboard, setClipboard] = useState<LineData[]>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ghostMousePos, setGhostMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const lastMouseDownTimeRef = useRef<number>(0);

  const thumbFilterRef = useRef<OneEuroFilter | null>(null);
  const indexFilterRef = useRef<OneEuroFilter | null>(null);
  const pinchIndexFilterRef = useRef<OneEuroFilter | null>(null);
  const drawEMAFilterRef = useRef<SimpleEMA | null>(null);
  const zoomEMARef = useRef<SimpleEMA | null>(null);

  const isPanning = useRef(false);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);

  const lastFilteredPos = useRef<{ x: number; y: number } | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const prevPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    transform.current.setOnChangeCallback(() => forceUpdate((n) => n + 1));
  }, []);

  useLayoutEffect(() => {
    if (layerRef.current) {
      setLayerReady(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current === null) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    thumbFilterRef.current = null;
    indexFilterRef.current = null;
    pinchIndexFilterRef.current = null;
    drawEMAFilterRef.current = null;
    zoomEMARef.current = null;
    lastFilteredPos.current = null;
    prevPoint.current = null;
  }, [dimensions]);

  // ── Ghost preview: compute offset lines that follow the cursor ──
  const clipboardCenter = useMemo(() => {
    if (clipboard.length === 0) return { x: 0, y: 0 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    clipboard.forEach((line) => {
      for (let i = 0; i < line.points.length; i += 2) {
        minX = Math.min(minX, line.points[i]);
        minY = Math.min(minY, line.points[i + 1]);
        maxX = Math.max(maxX, line.points[i]);
        maxY = Math.max(maxY, line.points[i + 1]);
      }
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }, [clipboard]);

  const ghostLines = useMemo(() => {
    if (clipboard.length === 0) return [];
    const dx = ghostMousePos.x - clipboardCenter.x;
    const dy = ghostMousePos.y - clipboardCenter.y;
    return clipboard.map((line) => ({
      ...line,
      id: `ghost-${line.id}`,
      points: line.points.map((val, i) => (i % 2 === 0 ? val + dx : val + dy)),
    }));
  }, [clipboard, ghostMousePos, clipboardCenter]);

  // ── Copy & Paste: mouse handlers ──
  const handleStageMouseDown = useCallback(
    (e: any) => {
      // Disable all mouse interactions in view-only mode
      if (props.viewOnly) return;

      // Custom double-click detection (works even while moving the mouse)
      const now = Date.now();
      const isDoubleClick =
        now - lastMouseDownTimeRef.current < 400 && !isSelectMode;
      lastMouseDownTimeRef.current = isDoubleClick ? 0 : now;

      if (isDoubleClick) {
        setIsSelectMode(true);
        setClippedLines([]);
      }

      if (!isDoubleClick && !isSelectMode) return;

      // Start drawing the selection rectangle immediately (including on the
      // double-click itself so the user can keep dragging without letting go)
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const canvasPos = transform.current.screenToCanvas(pos.x, pos.y);
      setIsDrawingSelection(true);
      setSelectionRect({
        x1: canvasPos.x,
        y1: canvasPos.y,
        x2: canvasPos.x,
        y2: canvasPos.y,
      });
    },
    [isSelectMode],
  );

  const handleStageMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const canvasPos = transform.current.screenToCanvas(pos.x, pos.y);
      mousePosRef.current = canvasPos;

      // Update reactive position for ghost preview when clipboard has content
      if (clipboard.length > 0) {
        setGhostMousePos(canvasPos);
      }

      if (isSelectMode && isDrawingSelection) {
        setSelectionRect((prev) =>
          prev ? { ...prev, x2: canvasPos.x, y2: canvasPos.y } : null,
        );
      }
    },
    [isSelectMode, isDrawingSelection, clipboard.length],
  );

  const handleStageMouseUp = useCallback(() => {
    if (!isSelectMode || !isDrawingSelection || !selectionRect) return;
    setIsDrawingSelection(false);

    const rect = {
      x: Math.min(selectionRect.x1, selectionRect.x2),
      y: Math.min(selectionRect.y1, selectionRect.y2),
      w: Math.abs(selectionRect.x2 - selectionRect.x1),
      h: Math.abs(selectionRect.y2 - selectionRect.y1),
    };

    // Skip tiny selections (accidental clicks)
    if (rect.w < 5 && rect.h < 5) {
      setSelectionRect(null);
      return;
    }

    const isInside = (px: number, py: number) =>
      px >= rect.x &&
      px <= rect.x + rect.w &&
      py >= rect.y &&
      py <= rect.y + rect.h;

    // Clip each line to only the contiguous sub-segments inside the box
    const clipped: LineData[] = [];
    props.lines.forEach((line) => {
      let segment: number[] = [];
      for (let i = 0; i < line.points.length; i += 2) {
        const px = line.points[i];
        const py = line.points[i + 1];
        if (isInside(px, py)) {
          segment.push(px, py);
        } else {
          // Point is outside — flush the current segment if it has ≥2 points
          if (segment.length >= 4) {
            clipped.push({
              ...line,
              id: crypto.randomUUID(),
              points: [...segment],
            });
          }
          segment = [];
        }
      }
      // Flush any remaining segment
      if (segment.length >= 4) {
        clipped.push({
          ...line,
          id: crypto.randomUUID(),
          points: [...segment],
        });
      }
    });

    setClippedLines(clipped);
  }, [isSelectMode, isDrawingSelection, selectionRect, props.lines]);

  // ── Keyboard: Ctrl+C / Ctrl+V / Escape ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable all keyboard interactions in view-only mode
      if (props.viewOnly) return;

      if (e.key === "Escape") {
        setIsSelectMode(false);
        setIsDrawingSelection(false);
        setSelectionRect(null);
        setClippedLines([]);
        setClipboard([]);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (clippedLines.length === 0) return;
        e.preventDefault();
        setClipboard(clippedLines);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        if (clippedLines.length === 0 || !props.onCut || !selectionRect) return;
        e.preventDefault();
        setClipboard(clippedLines);

        // Compute remaining lines (points outside the selection rect)
        const rect = {
          x: Math.min(selectionRect.x1, selectionRect.x2),
          y: Math.min(selectionRect.y1, selectionRect.y2),
          w: Math.abs(selectionRect.x2 - selectionRect.x1),
          h: Math.abs(selectionRect.y2 - selectionRect.y1),
        };
        const isInside = (px: number, py: number) =>
          px >= rect.x &&
          px <= rect.x + rect.w &&
          py >= rect.y &&
          py <= rect.y + rect.h;

        const remaining: LineData[] = [];
        props.lines.forEach((line) => {
          let segment: number[] = [];
          for (let i = 0; i < line.points.length; i += 2) {
            const px = line.points[i];
            const py = line.points[i + 1];
            if (!isInside(px, py)) {
              segment.push(px, py);
            } else {
              if (segment.length >= 4) {
                remaining.push({
                  ...line,
                  id: crypto.randomUUID(),
                  points: [...segment],
                });
              }
              segment = [];
            }
          }
          if (segment.length >= 4) {
            remaining.push({
              ...line,
              id: crypto.randomUUID(),
              points: [...segment],
            });
          }
        });

        props.onCut(remaining);

        setIsSelectMode(false);
        setSelectionRect(null);
        setClippedLines([]);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboard.length === 0 || !props.onPaste) return;
        e.preventDefault();

        const dx = mousePosRef.current.x - clipboardCenter.x;
        const dy = mousePosRef.current.y - clipboardCenter.y;

        const pastedLines: LineData[] = clipboard.map((line) => ({
          ...line,
          id: crypto.randomUUID(),
          points: line.points.map((val, i) =>
            i % 2 === 0 ? val + dx : val + dy,
          ),
        }));

        props.onPaste(pastedLines);

        // Exit selection mode but keep clipboard for repeated pastes
        setIsSelectMode(false);
        setSelectionRect(null);
        setClippedLines([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clippedLines, clipboard, clipboardCenter, selectionRect, props]);

  useImperativeHandle(
    props.canvasRef,
    () => {
      return {
        drawPoints: (
          x: number,
          y: number,
          isPinching: boolean,
          thumbX?: number,
          thumbY?: number,
        ) => {
          // Block drawing in view-only mode
          if (props.viewOnly) return;

          const lineNode = lineRef.current;
          if (lineNode === null) return;

          const currentTime = performance.now() / 1000;
          const currentTimeMs = performance.now();

          const rawX = x * dimensions.width;
          const rawY = y * dimensions.height;

          if (!indexFilterRef.current) {
            indexFilterRef.current = new OneEuroFilter(
              currentTime,
              [rawX, rawY],
              0.0,
              1.0,
              0.05,
              0.8,
            );
          }
          if (!drawEMAFilterRef.current) {
            drawEMAFilterRef.current = new SimpleEMA(0.4);
          }
          if (
            thumbX !== undefined &&
            thumbY !== undefined &&
            !thumbFilterRef.current
          ) {
            thumbFilterRef.current = new OneEuroFilter(
              currentTime,
              [thumbX * dimensions.width, thumbY * dimensions.height],
              0.0,
              1.0,
              0.05,
              0.8,
            );
          }
          if (!pinchIndexFilterRef.current) {
            pinchIndexFilterRef.current = new OneEuroFilter(
              currentTime,
              [rawX, rawY],
              0.0,
              1.0,
              0.05,
              0.8,
            );
          }

          // Apply OneEuro filter to index for drawing
          const filteredDrawXY = indexFilterRef.current.filter(currentTime, [
            rawX,
            rawY,
          ]);

          // Apply EMA smoothing after OneEuro
          const smoothedDrawXY =
            drawEMAFilterRef.current.filter(filteredDrawXY);

          const screenX = smoothedDrawXY[0];
          const screenY = smoothedDrawXY[1];

          const worldPos = transform.current.screenToCanvas(screenX, screenY);
          let drawX = worldPos.x;
          let drawY = worldPos.y;

          if (isPinching) {
            // Apply interpolation
            if (
              lastFilteredPos.current &&
              currentTimeMs - lastUpdateTime.current < 50
            ) {
              const timeDiff = currentTimeMs - lastUpdateTime.current;
              const interpolationFactor = Math.min(0.3, timeDiff / 50);

              drawX =
                lastFilteredPos.current.x +
                (drawX - lastFilteredPos.current.x) * interpolationFactor;
              drawY =
                lastFilteredPos.current.y +
                (drawY - lastFilteredPos.current.y) * interpolationFactor;
            }

            // Get current points
            let points = lineNode.points();

            if (prevPoint.current !== null) {
              // We have a previous point, so we can draw a line
              if (points.length === 0) {
                points = [
                  prevPoint.current.x,
                  prevPoint.current.y,
                  drawX,
                  drawY,
                ];
              } else {
                points.push(drawX, drawY);
              }
              lineNode.points(points);
            }

            prevPoint.current = { x: drawX, y: drawY };
            lastFilteredPos.current = { x: drawX, y: drawY };
            lastUpdateTime.current = currentTimeMs;

            // Force a redraw
            lineNode.getLayer()?.batchDraw();
          } else {
            // Not pinching - "lift pen"
            // We want to start a new line when pinching starts again
            prevPoint.current = null;
            lastFilteredPos.current = null;
          }
        },
        startPan: (x: number, y: number) => {
          isPanning.current = true;
          lastPanPosition.current = {
            x: x * dimensions.width,
            y: y * dimensions.height,
          };
        },

        updatePan: (x: number, y: number) => {
          if (!isPanning.current || !lastPanPosition.current) return;

          const screenX = x * dimensions.width;
          const screenY = y * dimensions.height;

          const deltaX = lastPanPosition.current.x - screenX;
          const deltaY = lastPanPosition.current.y - screenY;

          transform.current.pan(deltaX, deltaY);

          lastPanPosition.current = { x: screenX, y: screenY };
        },

        endPan: () => {
          isPanning.current = false;
          lastPanPosition.current = null;
        },
        clear: () => {
          lineRef.current?.points([]);
          indexFilterRef.current = null;
          thumbFilterRef.current = null;
          pinchIndexFilterRef.current = null;
          drawEMAFilterRef.current = null;
          prevPoint.current = null;
          lastFilteredPos.current = null;
        },
        exportLine: (): LineData | null => {
          const lineNode = lineRef.current;
          if (lineNode === null || lineNode.points().length === 0) return null;
          return {
            id: crypto.randomUUID(),
            points: lineNode.points(),
            stroke: lineNode.stroke(),
            strokeWidth: lineNode.strokeWidth(),
            tension: lineNode.tension(),
            lineCap: lineNode.lineCap(),
            lineJoin: lineNode.lineJoin(),
          };
        },
        showSpinner: (angle: number) => {
          if (props.viewOnly) return;
          setShowSpinner(true);
          setWheelRotation(angle);
        },
        hideSpinner: () => {
          setShowSpinner(false);
          hudLayerRef.current = null;
          setHudLayerReady(false);
        },
        spinnerStartX: () => spinnerStartX.current,
        setSpinnerStartX: (x: number) => {
          spinnerStartX.current = x;
        },
        sizeSelectorStartY: () => sizeSelectorStartY.current,
        setSizeSelectorStartY: (y: number) => {
          sizeSelectorStartY.current = y;
        },
        showSizeSelector: (Yvalue: number) => {
          if (props.viewOnly) return;
          setShowSizeSelector(true);
          setSizeSelector(Yvalue);
        },
        hideSizeSelector: () => {
          setShowSizeSelector(false);
          hudLayerRef.current = null;
          setHudLayerReady(false);
        },
        // Zooming via gesture: start/update/end allow continuous zoom based on hand movement
        startZoom: (startX: number, startY: number) => {
          lastPanPosition.current = {
            x: startX * dimensions.width,
            y: startY * dimensions.height,
          };
        },
        updateZoom: (x: number, y: number) => {
          const screenX = x * dimensions.width;
          const screenY = y * dimensions.height;
          const last = lastPanPosition.current;
          if (!last) {
            lastPanPosition.current = { x: screenX, y: screenY };
            return;
          }
          const deltaY = last.y - screenY;
          const norm = deltaY / Math.max(1, dimensions.height);
          const deadZone = 0.02;
          const adjustedNorm = Math.abs(norm) < deadZone ? 0 : norm;
          const rawFactor =
            1 + Math.max(-0.03, Math.min(0.03, adjustedNorm * 3));
          if (!zoomEMARef.current) {
            zoomEMARef.current = new SimpleEMA(0.5);
          }
          const smoothedFactor = zoomEMARef.current.filter(rawFactor) as number;
          transform.current.zoomAtPoint(smoothedFactor, screenX, screenY);
          lastPanPosition.current = { x: screenX, y: screenY };
        },
        endZoom: () => {
          lastPanPosition.current = null;
          zoomEMARef.current = null; // reset EMA smoothing
        },
        zoomIn: () =>
          transform.current.zoomAtPoint(
            1.2,
            dimensions.width / 2,
            dimensions.height / 2,
          ),
        zoomOut: () =>
          transform.current.zoomAtPoint(
            0.8,
            dimensions.width / 2,
            dimensions.height / 2,
          ),
        resetZoom: () => transform.current.reset(),
        clearCanvas: () => {
          lineRef.current?.points([]);
          indexFilterRef.current = null;
          thumbFilterRef.current = null;
          pinchIndexFilterRef.current = null;
          drawEMAFilterRef.current = null;
          prevPoint.current = null;
          lastFilteredPos.current = null;
          transform.current.reset();
        },
        updateLandmarks: (data: LandmarkData | null) => {
          setLandmarks(data);
        },
      };
    },
    [dimensions],
  );

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleSizeSelect = (size: number) => {
    setSelectedSize(size);
  };

  // Helper to transform landmark screen coordinates to canvas coordinates
  const getLandmarkCanvasCoords = useMemo(() => {
    return (x: number, y: number) => {
      const screenX = x * dimensions.width;
      const screenY = y * dimensions.height;
      return transform.current.screenToCanvas(screenX, screenY);
    };
  }, [dimensions]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ cursor: isSelectMode ? "crosshair" : "default" }}
    >
      {dimensions.width > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          scaleX={transform.current.scale}
          scaleY={transform.current.scale}
          x={transform.current.offsetX}
          y={transform.current.offsetY}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
        >
          <Layer listening={false}>
            {props.lines.map((line) => (
              <Line key={line.id} {...line} />
            ))}
            <Line
              ref={lineRef}
              stroke={selectedColor}
              strokeWidth={selectedSize}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
            {props.circles.map((circle) => (
              <Circle key={circle.id} {...circle} />
            ))}

            {props.text.map((text) => (
              <Text key={text.id} {...text} />
            ))}
            {props.arrows.map((arrow) => (
              <Arrow key={arrow.id} {...arrow} />
            ))}
          </Layer>
          <Layer listening={false}>
<<<<<<< HEAD
            {!props.viewOnly && landmarks && !landmarks.isPinching && (() => {
              const thumbCoords = getLandmarkCanvasCoords(landmarks.thumb.x, landmarks.thumb.y);
              const indexCoords = getLandmarkCanvasCoords(landmarks.index.x, landmarks.index.y);
              const smallAlpha = 0.3;
              const smallFill = hslToRgba(selectedColor, smallAlpha);
              const smallStroke = `rgba(0,0,0,${smallAlpha})`;
              return (
                <>
                  <Circle
                    x={thumbCoords.x}
                    y={thumbCoords.y}
                    radius={6}
                    fill={smallFill}
                    stroke={smallStroke}
                    strokeWidth={1.2}
                  />
                  <Circle
                    x={indexCoords.x}
                    y={indexCoords.y}
                    radius={6}
                    fill={smallFill}
                    stroke={smallStroke}
                    strokeWidth={1.2}
                  />
                </>
              );
            })()}
            {!props.viewOnly && landmarks && landmarks.isPinching && (() => {
              const thumbCoords = getLandmarkCanvasCoords(landmarks.thumb.x, landmarks.thumb.y);
              const indexCoords = getLandmarkCanvasCoords(landmarks.index.x, landmarks.index.y);
              const midCoords = getLandmarkCanvasCoords(
                (landmarks.thumb.x + landmarks.index.x) / 2,
                (landmarks.thumb.y + landmarks.index.y) / 2
              );
              return (
                <>
                  <Circle
                    x={midCoords.x}
                    y={midCoords.y}
                    radius={8}
                    fill={hslToRgba(selectedColor, 0.95)}
                    stroke={`rgba(0,0,0,${Math.min(0.95, 0.95)})`}
                    strokeWidth={1.6}
                  />
                  <Line
                    points={[
                      thumbCoords.x,
                      thumbCoords.y,
                      indexCoords.x,
                      indexCoords.y,
                    ]}
                    stroke={isColourWhite(selectedColor) ? "rgba(0,0,0,0.5)" : hslToRgba(selectedColor, 0.5)}
                    strokeWidth={2}
                  />
                </>
              );
            })()}
=======
            {landmarks &&
              !landmarks.isPinching &&
              (() => {
                const thumbCoords = getLandmarkCanvasCoords(
                  landmarks.thumb.x,
                  landmarks.thumb.y,
                );
                const indexCoords = getLandmarkCanvasCoords(
                  landmarks.index.x,
                  landmarks.index.y,
                );
                const smallAlpha = 0.3;
                const smallFill = hslToRgba(selectedColor, smallAlpha);
                const smallStroke = `rgba(0,0,0,${smallAlpha})`;
                return (
                  <>
                    <Circle
                      x={thumbCoords.x}
                      y={thumbCoords.y}
                      radius={6}
                      fill={smallFill}
                      stroke={smallStroke}
                      strokeWidth={1.2}
                    />
                    <Circle
                      x={indexCoords.x}
                      y={indexCoords.y}
                      radius={6}
                      fill={smallFill}
                      stroke={smallStroke}
                      strokeWidth={1.2}
                    />
                  </>
                );
              })()}
            {landmarks &&
              landmarks.isPinching &&
              (() => {
                const thumbCoords = getLandmarkCanvasCoords(
                  landmarks.thumb.x,
                  landmarks.thumb.y,
                );
                const indexCoords = getLandmarkCanvasCoords(
                  landmarks.index.x,
                  landmarks.index.y,
                );
                const midCoords = getLandmarkCanvasCoords(
                  (landmarks.thumb.x + landmarks.index.x) / 2,
                  (landmarks.thumb.y + landmarks.index.y) / 2,
                );
                return (
                  <>
                    <Circle
                      x={midCoords.x}
                      y={midCoords.y}
                      radius={8}
                      fill={hslToRgba(selectedColor, 0.95)}
                      stroke={`rgba(0,0,0,${Math.min(0.95, 0.95)})`}
                      strokeWidth={1.6}
                    />
                    <Line
                      points={[
                        thumbCoords.x,
                        thumbCoords.y,
                        indexCoords.x,
                        indexCoords.y,
                      ]}
                      stroke={
                        isColourWhite(selectedColor)
                          ? "rgba(0,0,0,0.5)"
                          : hslToRgba(selectedColor, 0.5)
                      }
                      strokeWidth={2}
                    />
                  </>
                );
              })()}

          </Layer>
          <Layer
            ref={(node) => {
              if (node && !layerRef.current) {
                layerRef.current = node;
                setLayerReady(true);
              }
            }}
          />

          {/* ── Selection overlay layer ── */}
          <Layer listening={false}>
            {/* Highlight clipped line segments inside the selection */}
            {clippedLines.map((line) => (
              <Line
                key={`sel-${line.id}`}
                points={line.points}
                stroke="rgba(74, 144, 217, 0.5)"
                strokeWidth={(line.strokeWidth as number) + 4}
                tension={line.tension}
                lineCap={line.lineCap}
                lineJoin={line.lineJoin}
              />
            ))}
            {/* Ghost preview of clipboard lines following the cursor */}
            {ghostLines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={typeof line.stroke === "string" ? line.stroke : "#888"}
                strokeWidth={line.strokeWidth}
                tension={line.tension}
                lineCap={line.lineCap}
                lineJoin={line.lineJoin}
                opacity={0.35}
                dash={[
                  8 / transform.current.scale,
                  4 / transform.current.scale,
                ]}
              />
            ))}
            {/* Selection rectangle */}
            {selectionRect && (
              <Rect
                x={Math.min(selectionRect.x1, selectionRect.x2)}
                y={Math.min(selectionRect.y1, selectionRect.y2)}
                width={Math.abs(selectionRect.x2 - selectionRect.x1)}
                height={Math.abs(selectionRect.y2 - selectionRect.y1)}
                stroke="#4A90D9"
                strokeWidth={2 / transform.current.scale}
                dash={[
                  10 / transform.current.scale,
                  5 / transform.current.scale,
                ]}
                fill="rgba(74, 144, 217, 0.1)"
              />
            )}
          </Layer>
        </Stage>
      )}

      {/* ── HUD overlay for colour wheel & size selector (not affected by pan/zoom) ── */}
      {!props.viewOnly && dimensions.width > 0 && (showSpinner || showSizeSelector) && (
        <div
          className="absolute bottom-6 right-6 z-30 pointer-events-none"
          style={{ width: 250, height: 220 }}
        >
          <Stage width={250} height={220}>
            <Layer
              ref={(node) => {
                if (node && !hudLayerRef.current) {
                  hudLayerRef.current = node;
                  setHudLayerReady(true);
                }
              }}
            >
              {hudLayerReady && hudLayerRef.current && showSpinner && (
                <ColourWheelSpinner
                  layer={hudLayerRef.current}
                  x={100}
                  y={110}
                  rotationAngle={wheelRotation}
                  onColourSelect={handleColorSelect}
                />
              )}

              {hudLayerReady && hudLayerRef.current && showSizeSelector && (
                <SizeSelector
                  layer={hudLayerRef.current}
                  x={10}
                  y={10}
                  normalisedY={sizeSelectorY}
                  onSizeSelect={handleSizeSelect}
                />
              )}
            </Layer>
          </Stage>
        </div>
      )}

      {/* ── Selection-mode banner ── */}
      {isSelectMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-blue-600/90 text-white text-sm rounded-full shadow-lg pointer-events-none select-none">
          {clippedLines.length > 0
            ? `${clippedLines.length} segment(s) selected — Ctrl+C to copy · Ctrl+X to cut · Ctrl+V to paste · Esc to exit`
            : "Draw a rectangle to select lines · Esc to exit"}
        </div>
      )}

      {/* ── Clipboard indicator (when not in selection mode) ── */}
      {!isSelectMode && clipboard.length > 0 && (
        <div className="absolute top-2 right-2 z-20 px-3 py-1 bg-green-600/80 text-white text-xs rounded-full shadow pointer-events-none select-none">
          📋 {clipboard.length} line(s) copied — Ctrl+V to paste
        </div>
      )}
    </div>
  );
}
