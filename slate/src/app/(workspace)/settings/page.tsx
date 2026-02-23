"use client";

import React, { useCallback, useState } from "react";
import SettingsMenuOption from "./_components/SettingsMenuOption";
import { saveSettingsAction, loadSettingsAction } from "./actions/settings";

export default function SettingsPage() {
  const actions = ["Draw", "Pan", "Zoom"];

  const totalGestures = ["Closed_Fist", "Open_Palm", "Pinch", "Thumb_Up", "Thumb_Down", "[UNBOUND]"];
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [bindingsSelections, setBindingsSelections] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
    loadSettingsAction().then((result) => {
        if (result.success && result.settings && Object.keys(result.settings).length > 0) {
        setBindingsSelections(result.settings);
        } else {
        setBindingsSelections({ Draw: "Closed_Fist", Pan: "Open_Palm", Zoom: "Pinch" });
        }
    });
    }, []);

  const handleGestureChange = (action: string, newGesture: string) => {
    setBindingsSelections((prev) => {
      const updated = { ...prev };
      for (const key in updated) {
        if (updated[key] === newGesture) delete updated[key];
      }
      updated[action] = newGesture;
      return updated;
    });
  };

  const saveSettings = useCallback(async () => { 
    setIsSavingSettings(true);
    try {
      const result = await saveSettingsAction(bindingsSelections);
      if (!result.success) {
        console.error("Failed to save settings:", result.errorMessage);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  }, [bindingsSelections]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {actions.map((action) => (
        <div key={action} className="mb-4 w-full max-w-lg">
          <SettingsMenuOption
            action={action}
            availableGestures={totalGestures}
            defaultGesture={bindingsSelections[action]}
            bindingsSelections={bindingsSelections}
            onGestureChange={handleGestureChange}
          />
        </div>
      ))}
      <button
        onClick={saveSettings}
        disabled={isSavingSettings}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
      >
        {isSavingSettings ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}