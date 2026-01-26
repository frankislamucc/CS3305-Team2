import { Ref } from "react";
import { CanvasHandle } from "../_types";

interface GestureEngineProps {
  canvasRef: Ref<CanvasHandle>;
  onDrawEnd: () => void;
}

export default function GestureEngine({
  canvasRef,
  onDrawEnd,
}: GestureEngineProps) {
  return <div className="flex-1"></div>;
}
