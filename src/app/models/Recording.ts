import mongoose, { Schema, Document } from "mongoose";

export interface IRecording extends Document {
  userId: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: "video/webm",
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure the data field uses the correct storage optimization
recordingSchema.index({ userId: 1, createdAt: -1 });

const Recording =
  mongoose.models.Recording ||
  mongoose.model<IRecording>("Recording", recordingSchema);

export default Recording;
