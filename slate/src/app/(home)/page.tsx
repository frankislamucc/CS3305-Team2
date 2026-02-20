"use client";

import BentoCards from "./_components/ui/BentoCards";
import ColorBends from "@/components/ui/ColorBends";
import Footer from "./_components/ui/Footer";

export default function HomePage() {
  return (
    <>
      <div style={{ height: "var(--nav-height, 0px)" }} aria-hidden="true" />
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
      <BentoCards />
      <Footer />
    </>
  );
}
