import { useEffect, useRef } from "react";
import Konva from "konva";

interface SizeSelectorProps {
  layer: Konva.Layer;
  x: number;
  y: number;
  size: number;
}

export default function SizeSelector({
  layer,
  x,
  y,
  size,
}: SizeSelectorProps) {
  const groupRef = useRef<Konva.Group | null>(null);

  useEffect(() => {
    const group = new Konva.Group({ x, y });
    groupRef.current = group;

    const sizes = [2, 4, 6, 8, 10];
    const barHeight = 30;
    const barSpacing = 5;

    sizes.forEach((s, i) => {
      const isSelected = s === size;
      const barWidth = 100 + (s * 10);

      const bar = new Konva.Rect({
        x: 0,
        y: i * (barHeight + barSpacing),
        width: isSelected ? barWidth + 15 : barWidth,
        height: barHeight,
        fill: isSelected ? "#4A90E2" : "#E0E0E0",
        stroke: isSelected ? "white" : "#999",
        strokeWidth: isSelected ? 3 : 1,
        cornerRadius: 5,
      });

      const label = new Konva.Text({
        x: 10,
        y: i * (barHeight + barSpacing) + 8,
        text: `Size ${s}`,
        fontSize: 14,
        fill: isSelected ? "white" : "#333",
        fontStyle: isSelected ? "bold" : "normal",
      });

      group.add(bar);
      group.add(label);
    });

    layer.add(group);
    layer.batchDraw();

    return () => {
      group.destroy();
      layer.batchDraw();
    };
  }, [layer, x, y, size]);

  return null;
}
