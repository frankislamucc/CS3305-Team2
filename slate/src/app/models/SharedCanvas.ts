import { Schema, models, model, Document, Types } from "mongoose";

export interface ISharedCanvas extends Document {
  canvasId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  fromUsername: string;
  toUserId: Types.ObjectId;
  toUsername: string;
  canvasName: string;
  seen: boolean;
  /** The recipient's personal copy of this canvas (created on first save) */
  copyCanvasId?: Types.ObjectId;
  createdAt: Date;
}

const SharedCanvasSchema = new Schema<ISharedCanvas>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      ref: "Canvas",
      required: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromUsername: {
      type: String,
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUsername: {
      type: String,
      required: true,
    },
    canvasName: {
      type: String,
      required: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    copyCanvasId: {
      type: Schema.Types.ObjectId,
      ref: "Canvas",
      default: null,
    },
  },
  { timestamps: true },
);

SharedCanvasSchema.index({ toUserId: 1, seen: 1 });
SharedCanvasSchema.index({ canvasId: 1, toUserId: 1 });

const SharedCanvas =
  models.SharedCanvas ||
  model<ISharedCanvas>("SharedCanvas", SharedCanvasSchema);

export default SharedCanvas;
