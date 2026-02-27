"use client";
import { Stage, Layer, Line, Circle, Line as KonvaLine } from "react-konva";
import type { CanvasHandle, LineData, LandmarkData } from "../_types";
import {
  RefObject,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import { Dimensions } from "../_types";
import type { Line as LineType } from "konva/lib/shapes/Line";
import ColourWheelSpinner from "./ColourWheelSpinner";
import { ViewTransform } from "./ViewTransform";
import { OneEuroFilter, SimpleEMA } from "./OneEuro";

interface CanvasProps {
  lines: LineData[];
  canvasRef: RefObject<CanvasHandle | null>;
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
  const [showSpinner, setShowSpinner] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#df4b26");
  const transform = useRef(new ViewTransform());
  const [, forceUpdate] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkData | null>(null);

  const thumbFilterRef = useRef<OneEuroFilter | null>(null);
  const indexFilterRef = useRef<OneEuroFilter | null>(null);
  const pinchIndexFilterRef = useRef<OneEuroFilter | null>(null);
  const drawEMAFilterRef = useRef<SimpleEMA | null>(null);

  const isPanning = useRef(false);
  const lastPanPosition = useRef<{x: number, y: number} | null>(null);

  const lastFilteredPos = useRef<{x: number, y: number} | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const prevPoint = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    transform.current.setOnChangeCallback(() => forceUpdate(n => n + 1));
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
    lastFilteredPos.current = null;
    prevPoint.current = null;
  }, [dimensions]);

  useImperativeHandle(props.canvasRef, () => {
    return {
      drawPoints: (x: number, y: number, isPinching: boolean, thumbX?: number, thumbY?: number) => {
        const lineNode = lineRef.current;
        if (lineNode === null) return;

        const currentTime = performance.now() / 1000;
        const currentTimeMs = performance.now();

        const rawX = x * dimensions.width;
        const rawY = y * dimensions.height;

        if (!indexFilterRef.current) {
          indexFilterRef.current = new OneEuroFilter(currentTime, [rawX, rawY], 0.0, 1.0, 0.05, 0.8);
        }
        if (!drawEMAFilterRef.current) {
          drawEMAFilterRef.current = new SimpleEMA(0.4);
        }
        if (thumbX !== undefined && thumbY !== undefined && !thumbFilterRef.current) {
          thumbFilterRef.current = new OneEuroFilter(currentTime, [thumbX * dimensions.width, thumbY * dimensions.height], 0.0, 1.0, 0.05, 0.8);
        }
        if (!pinchIndexFilterRef.current) {
          pinchIndexFilterRef.current = new OneEuroFilter(currentTime, [rawX, rawY], 0.0, 1.0, 0.05, 0.8);
        }

        // Apply OneEuro filter to index for drawing
        const filteredDrawXY = indexFilterRef.current.filter(currentTime, [rawX, rawY]);
        
        // Apply EMA smoothing after OneEuro
        const smoothedDrawXY = drawEMAFilterRef.current.filter(filteredDrawXY);
        
        const screenX = smoothedDrawXY[0];
        const screenY = smoothedDrawXY[1];
        
        const worldPos = transform.current.screenToCanvas(screenX, screenY);
        let drawX = worldPos.x;
        let drawY = worldPos.y;

        if (isPinching) {
          // Apply interpolation
          if (lastFilteredPos.current && (currentTimeMs - lastUpdateTime.current < 50)) {
            const timeDiff = currentTimeMs - lastUpdateTime.current;
            const interpolationFactor = Math.min(0.3, timeDiff / 50);
            
            drawX = lastFilteredPos.current.x + (drawX - lastFilteredPos.current.x) * interpolationFactor;
            drawY = lastFilteredPos.current.y + (drawY - lastFilteredPos.current.y) * interpolationFactor;
          }

          // Get current points
          let points = lineNode.points();
          
          if (prevPoint.current !== null) {
            // We have a previous point, so we can draw a line
            if (points.length === 0) {
              points = [prevPoint.current.x, prevPoint.current.y, drawX, drawY];
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
        lastPanPosition.current = { x: x * dimensions.width, y: y * dimensions.height };
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
        setShowSpinner(true);
        setWheelRotation(angle);
      },
      hideSpinner: () => setShowSpinner(false),
      showSizeSelector: () => { },
      hideSizeSelector: () => { },
      zoomIn: () => transform.current.zoomAtPoint(1.2, dimensions.width / 2, dimensions.height / 2),
      zoomOut: () => transform.current.zoomAtPoint(0.8, dimensions.width / 2, dimensions.height / 2),
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
      }
    };
  }, [dimensions]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-10">
      {dimensions.width > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          scaleX={transform.current.scale}
          scaleY={transform.current.scale}
          x={transform.current.offsetX}
          y={transform.current.offsetY}
        >
          <Layer listening={false}>
            {props.lines.map((line) => (
              <Line key={line.id} {...line} />
            ))}
            <Line
              ref={lineRef}
              stroke={selectedColor}
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          </Layer>
          <Layer listening={false}>
            {landmarks && !landmarks.isPinching && (
              <>
                <Circle
                  x={landmarks.thumb.x * dimensions.width}
                  y={landmarks.thumb.y * dimensions.height}
                  radius={6}
                  fill="rgba(255, 0, 0, 0.3)"
                />
                <Circle
                  x={landmarks.index.x * dimensions.width}
                  y={landmarks.index.y * dimensions.height}
                  radius={6}
                  fill="rgba(255, 0, 0, 0.3)"
                />
              </>
            )}
            {landmarks && landmarks.isPinching && (
              <>
                <Circle
                  x={(landmarks.thumb.x + landmarks.index.x) / 2 * dimensions.width}
                  y={(landmarks.thumb.y + landmarks.index.y) / 2 * dimensions.height}
                  radius={8}
                  fill="rgba(255, 0, 0, 0.95)"
                />
                <KonvaLine
                  points={[
                    landmarks.thumb.x * dimensions.width,
                    landmarks.thumb.y * dimensions.height,
                    landmarks.index.x * dimensions.width,
                    landmarks.index.y * dimensions.height,
                  ]}
                  stroke="rgba(255, 0, 0, 0.5)"
                  strokeWidth={2}
                />
              </>
            )}
          </Layer>
          <Layer ref={(node) => {
            if (node && !layerRef.current) {
              layerRef.current = node;
              setLayerReady(true);
            }
          }}>
            {layerReady && layerRef.current && showSpinner && (
              <ColourWheelSpinner
                layer={layerRef.current}
                x={dimensions.width / 2}
                y={dimensions.height / 2}
                rotationAngle={wheelRotation}
                onColourSelect={handleColorSelect}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}