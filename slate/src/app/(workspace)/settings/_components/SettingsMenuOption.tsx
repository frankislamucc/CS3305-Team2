"use client";

import React from "react";

interface SettingsMenuOptionProps {
    action: string;
}

export default function SettingsMenuOption({action}: SettingsMenuOptionProps) {
  const [value, setValue] = React.useState("medium");
  const totalGestures = ["Closed_Fist", "Open_Palm", "Pinch", "Thumb_Up", "Thumb_Down"]
  const availableGestures = ["Closed_Fist", "Open_Palm", "Pinch"];

  return (
    <div className="p-6 rounded-xl border border-blue-800 bg-brand-hover w-full max-w-2xl">        <p className="mb-2 font-medium">{action}</p>

        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-brand-hover border border-zinc-800"
        >

            {availableGestures.map((gesture) => (
                <option key={gesture} value={gesture}>
                    {gesture}
                </option>
            ))}
            
        </select>

        <p className="mt-3 text-sm text-zinc-400">
          Selected: {value}
        </p>
      </div>


  );
}

