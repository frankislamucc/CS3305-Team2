"use client";

import React from "react";

interface SettingsMenuOptionProps {
  action: string;
  availableGestures: string[];
  defaultGesture: string;
  bindingsSelections?: Record<string, string>;
  onGestureChange?: (action: string, newGesture: string) => void;
}

export default function SettingsMenuOption({ action, availableGestures, defaultGesture, bindingsSelections, onGestureChange }: SettingsMenuOptionProps) {
  const [value, setValue] = React.useState(defaultGesture);

  React.useEffect(() => {
    setValue(defaultGesture);
  }, [defaultGesture]);

  const takenGestures = new Set(
    Object.entries(bindingsSelections ?? {})
      .filter(([a]) => a !== action)
      .map(([, g]) => g)
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGesture = e.target.value;
    setValue(newGesture);
    onGestureChange?.(action, newGesture);
  };

  return (
    <div className="p-6 rounded-xl border border-blue-800 bg-brand-hover w-full max-w-2xl">
      <p className="mb-2 font-medium">{action}</p>

      <select
        value={value}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg bg-brand-hover border border-zinc-800"
      >
        {availableGestures.map((gesture) => (
          <option key={gesture} value={gesture} disabled={takenGestures.has(gesture)}>
            {gesture} {takenGestures.has(gesture) ? "(in use)" : ""}
          </option>
        ))}
      </select>

      <p className="mt-3 text-sm text-zinc-400">
        Selected: {value}
      </p>
    </div>
  );
}