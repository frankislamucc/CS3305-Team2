import { useEffect, useRef } from "react";
import Konva from "konva";

const SIZES = [2, 4, 6, 8, 10];
const BAR_HEIGHT = 30;
const BAR_SPACING = 8;
const BASE_WIDTH = 120;

interface SizeSelectorProps {
  layer: Konva.Layer;
  x: number;
  y: number;
  normalisedY: number; // 0–1, maps to which bar is selected
  onSizeSelect?: (size: number) => void;
}

export default function SizeSelector({ layer, x, y, normalisedY, onSizeSelect }: SizeSelectorProps) {
  const groupRef = useRef<Konva.Group | null>(null);
  const barsRef = useRef<Konva.Rect[]>([]);
  const labelsRef = useRef<Konva.Text[]>([]);
  const lastSelectedIndex = useRef<number>(-1);

  // Build once
  useEffect(() => {
    const group = new Konva.Group({ x, y });
    groupRef.current = group;
    barsRef.current = [];
    labelsRef.current = [];

    SIZES.forEach((s, i) => {
      const barWidth = BASE_WIDTH + s * 10;

      const bar = new Konva.Rect({
        x: 0,
        y: i * (BAR_HEIGHT + BAR_SPACING),
        width: barWidth,
        height: BAR_HEIGHT,
        fill: "#E0E0E0",
        stroke: "#999",
        strokeWidth: 1,
        cornerRadius: 5,
      });

      const label = new Konva.Text({
        x: 10,
        y: i * (BAR_HEIGHT + BAR_SPACING) + 8,
        text: `Size ${s}`,
        fontSize: 14,
        fill: "#333",
      });

      barsRef.current.push(bar);
      labelsRef.current.push(label);
      group.add(bar);
      group.add(label);
    });

    layer.add(group);
    layer.batchDraw();

    return () => {
      group.destroy();
      layer.batchDraw();
    };
  }, [layer, x, y]);

  // Update selection separately
  useEffect(() => {
    if (!groupRef.current) return;

    const selectedIndex = Math.min(
      Math.floor(normalisedY * SIZES.length),
      SIZES.length - 1
    );

    if (selectedIndex === lastSelectedIndex.current) return;
    lastSelectedIndex.current = selectedIndex;

    barsRef.current.forEach((bar, i) => {
      const isSelected = i === selectedIndex;
      bar.fill(isSelected ? "#4A90E2" : "#E0E0E0");
      bar.stroke(isSelected ? "white" : "#999");
      bar.strokeWidth(isSelected ? 3 : 1);
      bar.width(isSelected ? BASE_WIDTH + SIZES[i] * 10 + 15 : BASE_WIDTH + SIZES[i] * 10);
    });

    labelsRef.current.forEach((label, i) => {
      const isSelected = i === selectedIndex;
      label.fill(isSelected ? "white" : "#333");
      label.fontStyle(isSelected ? "bold" : "normal");
    });

    onSizeSelect?.(SIZES[selectedIndex]);
    layer.batchDraw();
  }, [normalisedY, layer, onSizeSelect]);

  return null;
}