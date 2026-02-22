"use client";

import React from "react";

interface SettingsMenuOptionProps {
    action: string;
}

export default function SettingsMenuOption({action}: SettingsMenuOptionProps) {
  const [value, setValue] = React.useState("medium");


  return (
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900 w-[800px]">
        <p className="mb-2 font-medium">{action}</p>

        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <p className="mt-3 text-sm text-zinc-400">
          Selected: {value}
        </p>
      </div>


  );
}

