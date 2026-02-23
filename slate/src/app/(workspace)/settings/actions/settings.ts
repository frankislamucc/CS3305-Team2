"use server";

import dbConnect from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import UserSettings, { IUserSettings } from "@/app/models/Settings";
import mongoose from "mongoose";

export interface SaveSettingsResult {
  success: boolean;
  errorMessage?: string;
}

export interface LoadSettingsResult {
  success: boolean;
  settings?: Record<string, string>;
  errorMessage?: string;
}

export async function saveSettingsAction(
  settings: Record<string, string>,
): Promise<SaveSettingsResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    const result = await UserSettings.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(session.userId) },
        { settings },
        { upsert: true, new: true },
    );

    await dbConnect();

    await UserSettings.findOneAndUpdate(
        { userId: session.userId },
        { settings },
        { upsert: true, new: true },
    );

    return { success: true };
  } catch (error) {
    console.error("Save settings error:", error);
    return { success: false, errorMessage: "Failed to save settings" };
  }
}

export async function loadSettingsAction(): Promise<LoadSettingsResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const userSettings = await UserSettings.findOne({ userId: session.userId }).lean<IUserSettings>();

    if (!userSettings) {
      return { success: true, settings: {} };
    }

    return {
      success: true,
      settings: userSettings.settings as Record<string, string>,
    };
  } catch (error) {
    console.error("Load settings error:", error);
    return { success: false, errorMessage: "Failed to load settings" };
  }
}