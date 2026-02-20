import { useEffect, useRef } from "react";
import Konva from "konva";

interface ColorWheelSpinnerProps {
  layer: Konva.Layer;
  x: number;
  y: number;
  radius?: number;
  angle: number; // 0–360, drives the needle
}

export default function ColorWheelSpinner({
  layer,
  x,
  y,
  radius = 80,
  angle,
}: ColorWheelSpinnerProps) {
  const groupRef = useRef<Konva.Group | null>(null);
  const needleRef = useRef<Konva.Line | null>(null);
  const labelRef = useRef<Konva.Text | null>(null);

  useEffect(() => {
    // Build the wheel once
    const group = new Konva.Group({ x, y });
    groupRef.current = group;

    // Draw hue segments
    const segments = 360;
    for (let i = 0; i < segments; i++) {
      const startAngle = (i * Math.PI * 2) / segments;
      const endAngle = ((i + 1) * Math.PI * 2) / segments;
      const wedge = new Konva.Arc({
        innerRadius: radius * 0.5,
        outerRadius: radius,
        angle: 360 / segments + 0.5, 
        fill: `hsl(${i}, 100%, 50%)`,
        rotation: i * (360 / segments) - 90, // start from top
      });
      group.add(wedge);
    }

    // Center circle (shows selected color)
    const center = new Konva.Circle({
      radius: radius * 0.45,
      fill: `hsl(${angle}, 100%, 50%)`,
      stroke: "#fff",
      strokeWidth: 2,
    });
    group.add(center);

    // Needle pointing to selected color
    // const needle = new Konva.Line({
    //   points: [0, 0, 0, -(radius + 10)],
    //   stroke: "white",
    //   strokeWidth: 3,
    //   lineCap: "round",
    //   rotation: angle - 90,
    // });
    // needleRef.current = needle;
    // group.add(needle);

    // Label
    const label = new Konva.Text({
      text: `hsl(${Math.round(angle)}, 100%, 50%)`,
      fontSize: 12,
      fill: "white",
      offsetX: 40,
      y: radius + 15,
    });
    labelRef.current = label;
    group.add(label);

    layer.add(group);
    layer.batchDraw();

    return () => {
      group.destroy();
      layer.batchDraw();
    };
  }, [layer, x, y, radius]);

  // Update needle and label on every angle change (no full rebuild!)
  useEffect(() => {
    if (!needleRef.current || !labelRef.current || !groupRef.current) return;
    needleRef.current.rotation(angle - 90);
    
    // Update center fill
    const center = groupRef.current.findOne("Circle");
    if (center) (center as Konva.Circle).fill(`hsl(${Math.round(angle)}, 100%, 50%)`);
    
    labelRef.current.text(`hsl(${Math.round(angle)}, 100%, 50%)`);
    layer.batchDraw();
  }, [angle, layer]);

  return null; 
}