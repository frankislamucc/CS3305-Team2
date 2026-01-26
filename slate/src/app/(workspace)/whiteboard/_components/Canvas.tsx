"use client";
import { Stage, Layer, Line } from "react-konva";
import type { CanvasHandle, LineData } from "../_types";
import {
  Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Dimensions } from "../_types";
import type { Line as LineType } from "konva/lib/shapes/Line";

interface CanvasProps {
  lines: LineData[];
  canvasRef: Ref<CanvasHandle>;
}

export default function Canvas(props: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<LineType>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // entries consists of single element container-div
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
        lineNode.points([...points, x, y]);
      },
      clear: () => {
        lineRef.current?.points([]);
      },
      exportLine: (): LineData | null => {
        const lineNode = lineRef.current;
        if (lineNode === null || lineNode.points().length === 0) return null;
        return {
          id: lineNode.id(),
          points: lineNode.points(),
          stroke: lineNode.stroke(),
          strokeWidth: lineNode.strokeWidth(),
          tension: lineNode.tension(),
          lineCap: lineNode.lineCap(),
          lineJoin: lineNode.lineJoin(),
        };
      },
    };
  });

  return (
    <div ref={containerRef} className="flex-1 relative">
      {dimensions.width > 0 && (
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer listening={false}>
            {props.lines.map((line) => (
              <Line key={line.id} {...line} />
            ))}
            <Line ref={lineRef} />
          </Layer>
        </Stage>
      )}
    </div>
  );
}
