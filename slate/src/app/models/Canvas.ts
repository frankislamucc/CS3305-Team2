import { Schema, models, model, Document, Types } from "mongoose";

export interface ILineData {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: string;
  lineJoin: string;
}

export interface ICircleData {
  id: string;
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ITextData {
  id: string;
  x: number;
  y: number;
  text: string;
  fill: string;
  fontSize: number;
  fontFamily: string;
}

export interface IArrowData {
  id: string;
  x: number;
  y: number;
  points: number[];
  pointerLength: number;
  pointerWidth: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ICanvas extends Document {
  userId: Types.ObjectId;
  name: string;
  lines: ILineData[];
  circles: ICircleData[];
  texts: ITextData[];
  arrows: IArrowData[];
  isSharedCopy: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const LineDataSchema = new Schema<ILineData>(
  {
    id: { type: String, required: true },
    points: { type: [Number], required: true },
    stroke: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    tension: { type: Number, required: true },
    lineCap: { type: String, required: true },
    lineJoin: { type: String, required: true },
  },
  { _id: false },
);

const CircleDataSchema = new Schema<ICircleData>(
  {
    id: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    radius: { type: Number, required: true },
    fill: { type: String, required: true },
    stroke: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
  },
  { _id: false },
);

const TextDataSchema = new Schema<ITextData>(
  {
    id: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    text: { type: String, required: true },
    fill: { type: String, required: true },
    fontSize: { type: Number, required: true },
    fontFamily: { type: String, required: true },
  },
  { _id: false },
);

const ArrowDataSchema = new Schema<IArrowData>(
  {
    id: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    points: { type: [Number], required: true },
    pointerLength: { type: Number, required: true },
    pointerWidth: { type: Number, required: true },
    fill: { type: String, required: true },
    stroke: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
  },
  { _id: false },
);

const CanvasSchema = new Schema<ICanvas>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: "Untitled",
      trim: true,
    },
    lines: {
      type: [LineDataSchema],
      default: [],
    },
    circles: {
      type: [CircleDataSchema],
      default: [],
    },
    texts: {
      type: [TextDataSchema],
      default: [],
    },
    arrows: {
      type: [ArrowDataSchema],
      default: [],
    },
    isSharedCopy: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

CanvasSchema.index({ userId: 1 });

// Delete cached model so schema changes (e.g. new fields) take effect on hot reload
delete (models as any).Canvas;
const Canvas = model<ICanvas>("Canvas", CanvasSchema);

export default Canvas;
