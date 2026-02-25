import { GestureRecognizerResult } from "@mediapipe/tasks-vision";
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

export interface LandmarkPoint {
  x: number;
  y: number;
}

export interface LandmarkData {
  thumb: LandmarkPoint;
  index: LandmarkPoint;
  isPinching: boolean;
}

export interface CanvasHandle {
  drawPoints: (x: number, y: number) => void;
  clear: () => void;
  exportLine: () => LineData | null;
  showSpinner: (angle: number) => void;
  hideSpinner: () => void;
  showSizeSelector: () => void;
  hideSizeSelector: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  clearCanvas: () => void;
  updateLandmarks: (data: LandmarkData | null) => void;
}

export interface WorkerRequest {
  status: string;
  videoFrame?: ImageBitmap;
  timestamp?: number;
}

export interface WorkerResponse {
  status: string;
  predictions?: GestureRecognizerResult;
}

export interface AuthError {
  errorMessages: string[];
}
