"use client";

import { useRef, useState } from "react";
import { LineData } from "./_types";
import dynamic from "next/dynamic";
import { CanvasHandle } from "./_types";
import GestureEngine from "./_components/GestureEngine";

export default function WhiteboardPage() {
  const Canvas = dynamic(() => import("./_components/Canvas"), {
    ssr: false,
  });
  const [lines, setLines] = useState<LineData[]>([
    {
      id: "1",
      points: [0, 0, 500, 500],
      stroke: "#df4b26",
      strokeWidth: 5,
      tension: 0.5,
      lineCap: "round",
      lineJoin: "round",
    },
  ]);
  const canvasRef = useRef<CanvasHandle>(null);

  const handleDrawEnd = () => {
    const curLine = canvasRef.current;
    if (curLine === null) return;
    const newLine: LineData | null = curLine.exportLine();
    if (newLine) {
      setLines((lines) => [...lines, newLine]);
      // don't persist curLine state across renders
      curLine.clear();
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Canvas lines={lines} canvasRef={canvasRef} />
      <GestureEngine canvasRef={canvasRef} onDrawEnd={handleDrawEnd} />
    </div>
  );
}
