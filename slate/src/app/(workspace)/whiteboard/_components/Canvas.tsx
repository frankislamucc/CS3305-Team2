"use client";
import { Stage, Layer, Line } from "react-konva";
import type { CanvasHandle, LineData } from "../_types";
import {
  RefObject,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Dimensions } from "../_types";
import type { Line as LineType } from "konva/lib/shapes/Line";
import ColourWheelSpinner from "./ColourWheelSpinner";

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
        const points = lineNode.points();
        lineNode.points([
          ...points,
          x * dimensions.width,
          y * dimensions.height,
        ]);
      },
      clear: () => {
        lineRef.current?.points([]);
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
      showSizeSelector: () => {},
      hideSizeSelector: () => {},
    };
  }, [dimensions]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  

  return (
    <div ref={containerRef} className="absolute inset-0 z-10">
      {dimensions.width > 0 && (
        <Stage width={dimensions.width} height={dimensions.height}>
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