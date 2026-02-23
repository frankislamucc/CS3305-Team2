import { Schema, models, model, Document, Types } from "mongoose";

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  settings: Record<string, string>;
  updatedAt: Date;
  createdAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    settings: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

UserSettingsSchema.index({ userId: 1 });

const UserSettings = models.UserSettings || model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;