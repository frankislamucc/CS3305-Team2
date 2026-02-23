import { useEffect, useRef } from "react";
import Konva from "konva";

const COLOURS = [
  { hsl: "hsl(0, 100%, 50%)", label: "Red" },
  { hsl: "hsl(45, 100%, 50%)", label: "Orange" },
  { hsl: "hsl(60, 100%, 50%)", label: "Yellow" },
  { hsl: "hsl(120, 100%, 50%)", label: "Green" },
  { hsl: "hsl(180, 100%, 50%)", label: "Cyan" },
  { hsl: "hsl(240, 100%, 50%)", label: "Blue" },
  { hsl: "hsl(270, 100%, 50%)", label: "Purple" },
  { hsl: "hsl(300, 100%, 50%)", label: "Pink" },
];

const SEGMENT_COUNT = COLOURS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const GAP = 3;

interface ColourWheelSpinnerProps {
  layer: Konva.Layer;
  x: number;
  y: number;
  radius?: number;
  rotationAngle: number;
  onColourSelect?: (colour: string) => void;
}

export default function ColourWheelSpinner({
  layer,
  x,
  y,
  radius = 80,
  rotationAngle,
  onColourSelect,
}: ColourWheelSpinnerProps) {
  const groupRef = useRef<Konva.Group | null>(null);
  const segmentsRef = useRef<Konva.Arc[]>([]);
  const centerRef = useRef<Konva.Circle | null>(null);
  const labelRef = useRef<Konva.Text | null>(null);
  const pointerRef = useRef<Konva.RegularPolygon | null>(null);

  const getSelectedIndex = (rotation: number) => {
    const raw = (-rotation / SEGMENT_ANGLE) % SEGMENT_COUNT;
    return ((Math.round(raw) % SEGMENT_COUNT) + SEGMENT_COUNT) % SEGMENT_COUNT;
  };

  useEffect(() => {
    const group = new Konva.Group({ x, y });
    groupRef.current = group;
    segmentsRef.current = [];

    COLOURS.forEach((colour, i) => {
      const arc = new Konva.Arc({
        x: 0,
        y: 0,
        innerRadius: radius * 0.4,
        outerRadius: radius,
        angle: SEGMENT_ANGLE - GAP,
        fill: colour.hsl,
        rotation: i * SEGMENT_ANGLE - 90 + GAP / 2,
      });
      segmentsRef.current.push(arc);
      group.add(arc);
    });

    const center = new Konva.Circle({
      x: 0,
      y: 0,
      radius: radius * 0.35,
      fill: COLOURS[0].hsl,
      stroke: "#fff",
      strokeWidth: 2,
    });
    centerRef.current = center;
    group.add(center);

    const pointer = new Konva.RegularPolygon({
      x,
      y: y - radius - 14,
      sides: 3,
      radius: 10,
      fill: "white",
      rotation: 180,
    });
    pointerRef.current = pointer;

    const label = new Konva.Text({
      x,
      y: y + radius + 12,
      text: COLOURS[0].label,
      fontSize: 13,
      fill: "white",
    });
    label.offsetX(label.width() / 2);
    labelRef.current = label;

    layer.add(group);
    layer.add(pointer);
    layer.add(label);
    layer.batchDraw();

    return () => {
      group.destroy();
      pointer.destroy();
      label.destroy();
      layer.batchDraw();
    };
  }, [layer, x, y, radius]);

  useEffect(() => {
    if (!groupRef.current || !centerRef.current || !labelRef.current) return;

    groupRef.current.rotation(rotationAngle);

    const selectedIndex = getSelectedIndex(rotationAngle);
    const selected = COLOURS[selectedIndex];

    segmentsRef.current.forEach((seg, i) => {
      seg.outerRadius(i === selectedIndex ? radius * 1.12 : radius);
      seg.opacity(i === selectedIndex ? 1 : 0.6);
    });

    centerRef.current.fill(selected.hsl);
    labelRef.current.text(selected.label);
    labelRef.current.offsetX(labelRef.current.width() / 2);
    onColourSelect?.(selected.hsl);

    layer.batchDraw();
  }, [rotationAngle, layer, radius, onColourSelect]);

  return null;
}