"use client";

import React from "react";
import SettingsMenuOption from "./_components/SettingsMenuOption";

export default function SettingsPage() {
  const [value, setValue] = React.useState("medium");

  const availableGestures = ["Closed_Fist", "Open_Palm", "Pinch"];
  const actions = ["draw", "pan", "zoom"]

  const [selected, setSelected] = React.useState(availableGestures[0]);

  return (

    <div>
        {actions.map((action) => (
        <div key={action} className="mb-4">
            <p>{action}</p>
            <SettingsMenuOption action={action} />
        </div>
        ))}
    </div>
  );
}