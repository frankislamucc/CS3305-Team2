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

export interface ICanvas extends Document {
  userId: Types.ObjectId;
  name: string;
  lines: ILineData[];
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
  },
  { timestamps: true },
);

CanvasSchema.index({ userId: 1 });

const Canvas = models.Canvas || model<ICanvas>("Canvas", CanvasSchema);

export default Canvas;
