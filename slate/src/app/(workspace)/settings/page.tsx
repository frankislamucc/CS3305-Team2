"use client";

import React from "react";
import SettingsMenuOption from "./_components/SettingsMenuOption";

export default function SettingsPage() {
  const actions = ["Draw", "Pan", "Zoom"]

  const [bindingsSelections, setBindingsSelections] = React.useState<Record<string, string>>({
    Draw: "Closed_Fist",
    Pan: "Open_Palm",
    Zoom: "Pinch",
  });

  const totalGestures = ["Closed_Fist", "Open_Palm", "Pinch", "Thumb_Up", "Thumb_Down", "[UNBOUND]"]

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
      <button>
        Save
      </button>
    </div>
  );
}