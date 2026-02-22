"use client";

import React from "react";
import SettingsMenuOption from "./_components/SettingsMenuOption";

export default function SettingsPage() {
//   const [value, setValue] = React.useState("medium");

  const actions = ["Draw", "Pan", "Zoom"]

//   const [selected, setSelected] = React.useState(availableGestures[0]);

  return (

    <div className="min-h-screen flex flex-col items-center justify-center">
    {actions.map((action) => (
        <div key={action} className="mb-4 w-full max-w-lg">
        <SettingsMenuOption action={action} />
        </div>
    ))}
    </div>
  );
}