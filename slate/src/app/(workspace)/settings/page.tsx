"use client";

import React from "react";
import ColorBends from "@/components/ui/ColorBends";

const gestureBindings = [
  {
    gesture: "Index Pinch",
    action: "Draw",
    description:
      "Pinch your thumb and index finger together to draw on the canvas.",
    icon: (
      <svg
        viewBox="0 0 64 64"
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="32" cy="18" r="6" className="fill-pink-400/30 stroke-pink-400" />
        <path d="M32 24v16" className="stroke-pink-400" strokeLinecap="round" />
        <path d="M24 52c0-4 3-8 8-8s8 4 8 8" className="stroke-neutral-400" strokeLinecap="round" />
        <circle cx="26" cy="36" r="3" className="fill-neutral-200 stroke-neutral-400" />
        <circle cx="38" cy="36" r="3" className="fill-neutral-200 stroke-neutral-400" />
      </svg>
    ),
  },
  {
    gesture: "Middle Pinch",
    action: "Pan",
    description:
      "Pinch your thumb and middle finger to pan across the canvas.",
    icon: (
      <svg
        viewBox="0 0 64 64"
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M16 32h32M32 16v32" className="stroke-blue-400" strokeLinecap="round" />
        <path
          d="M44 28l4 4-4 4M20 28l-4 4 4 4M28 20l4-4 4 4M28 44l4 4 4-4"
          className="stroke-blue-400"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    gesture: "Ring Pinch",
    action: "Colour Wheel",
    description:
      "Pinch your thumb and ring finger to open the colour wheel spinner.",
    icon: (
      <svg
        viewBox="0 0 64 64"
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="32" cy="32" r="18" className="stroke-purple-400" />
        <circle cx="32" cy="32" r="10" className="stroke-neutral-400" />
        <path d="M32 14a18 18 0 0 1 15.6 9" className="stroke-red-400" strokeWidth={3} strokeLinecap="round" />
        <path d="M47.6 23a18 18 0 0 1 0 18" className="stroke-yellow-400" strokeWidth={3} strokeLinecap="round" />
        <path d="M47.6 41a18 18 0 0 1-15.6 9" className="stroke-green-400" strokeWidth={3} strokeLinecap="round" />
        <path d="M32 50a18 18 0 0 1-15.6-9" className="stroke-cyan-400" strokeWidth={3} strokeLinecap="round" />
        <path d="M16.4 41a18 18 0 0 1 0-18" className="stroke-blue-400" strokeWidth={3} strokeLinecap="round" />
        <path d="M16.4 23A18 18 0 0 1 32 14" className="stroke-purple-400" strokeWidth={3} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    gesture: "Pinky Pinch",
    action: "Pen Size",
    description:
      "Pinch your thumb and pinky finger to adjust the pen size.",
    icon: (
      <svg
        viewBox="0 0 64 64"
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <line x1="12" y1="44" x2="52" y2="44" className="stroke-orange-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="12" y1="36" x2="52" y2="36" className="stroke-orange-400" strokeWidth={3} strokeLinecap="round" />
        <line x1="12" y1="26" x2="52" y2="26" className="stroke-orange-400" strokeWidth={5} strokeLinecap="round" />
        <path d="M32 16l-3 4h6l-3-4z" className="fill-orange-400 stroke-orange-400" />
        <path d="M32 54l-3-4h6l-3 4z" className="fill-orange-400 stroke-orange-400" />
      </svg>
    ),
  },
];

const keybindSections = [
  {
    title: "Canvas",
    binds: [
      { keys: ["Ctrl", "Z"], action: "Undo" },
      { keys: ["Ctrl", "Y"], action: "Redo" },
    ],
  },
  {
    title: "Selection",
    binds: [
      { keys: ["Double-Click"], action: "Enter select mode" },
      { keys: ["Esc"], action: "Exit select mode" },
    ],
  },
  {
    title: "Clipboard",
    binds: [
      { keys: ["Ctrl", "C"], action: "Copy selection" },
      { keys: ["Ctrl", "X"], action: "Cut selection" },
      { keys: ["Ctrl", "V"], action: "Paste at cursor" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-semibold rounded-md bg-neutral-900/10 border border-neutral-300 text-neutral-800 shadow-[0_2px_0_rgba(0,0,0,0.08)] font-mono">
      {children}
    </kbd>
  );
}

export default function SettingsPage() {
  return (
    <>
      {/* Animated background — same as landing page */}
      <ColorBends
        className="fixed inset-0 -z-10"
        colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
        rotation={0}
        speed={0.2}
        scale={1}
        frequency={1}
        warpStrength={1}
        mouseInfluence={1}
        parallax={0.5}
        noise={0.1}
        transparent
        autoRotate={0}
      />

      <div className="min-h-screen flex flex-col items-center px-4 pb-16 pt-8">
        {/* Page header */}
        <div className="text-center mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold text-neutral-900 mb-3 tracking-tight">
            Controls &amp; Shortcuts
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── LEFT: Hand Gestures ─── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-4 pl-1">
              ✋ Hand Gestures
            </h2>
            <div className="space-y-4">
              {gestureBindings.map((g) => (
                <div
                  key={g.gesture}
                  className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-white/80 hover:border-neutral-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-neutral-100/80 border border-neutral-200 flex items-center justify-center">
                      {g.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-neutral-900 font-semibold text-base">
                          {g.gesture}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-900/10 border border-neutral-300 text-neutral-700">
                          {g.action}
                        </span>
                      </div>
                      <p className="text-neutral-500 text-sm leading-relaxed">
                        {g.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── RIGHT: Keyboard Shortcuts ─── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-4 pl-1">
              ⌨️ Keyboard Shortcuts
            </h2>
            <div className="space-y-4">
              {keybindSections.map((section) => (
                <div
                  key={section.title}
                  className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
                >
                  <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.binds.map((bind) => (
                      <div
                        key={bind.action}
                        className="flex items-center justify-between"
                      >
                        <span className="text-neutral-700 text-sm">
                          {bind.action}
                        </span>
                        <div className="flex items-center gap-1">
                          {bind.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-neutral-400 text-xs">+</span>
                              )}
                              <Kbd>{key}</Kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}


            </div>
          </section>
        </div>
      </div>
    </>
  );
}