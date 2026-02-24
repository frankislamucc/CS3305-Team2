"use client";
import { Stage, Layer, Line } from "react-konva";
import type { CanvasHandle, LineData } from "../_types";
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
  const filterRef = useRef<any>(null);


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

  useImperativeHandle(props.canvasRef, () => {
    return {
      drawPoints: (x: number, y: number) => {
        const lineNode = lineRef.current;
        if (lineNode === null) return;

        // 1Euro filter for smoothing the input points
        const rawX = x * dimensions.width;
        const rawY = y * dimensions.height;

        if (!filterRef.current) {
          filterRef.current = new OneEuroFilter(performance.now() / 1000, [rawX, rawY]);
        }

        const [smoothX, smoothY] = filterRef.current.filter(performance.now() / 1000, [rawX, rawY]);

        // to remove 1euro filter just replace smoothX/Y with rawX/Y
        const points = lineNode.points();
        lineNode.points([
          ...points,
          smoothX,
          smoothY,
        ]);
      },
      clear: () => {
        lineRef.current?.points([]);
        filterRef.current = null;

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
        filterRef.current = null;
        transform.current.reset();
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