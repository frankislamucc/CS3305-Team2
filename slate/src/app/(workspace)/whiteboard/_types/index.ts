import { LineJoin, LineCap } from "konva/lib/Shape";

export interface LineData {
  id: string;
  points: number[];
  stroke: string | CanvasGradient;
  strokeWidth: number;
  tension: number;
  lineCap: LineCap;
  lineJoin: LineJoin;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface CanvasHandle {
  drawPoints: (x: number, y: number) => void;
  clear: () => void;
  exportLine: () => LineData | null;
}
