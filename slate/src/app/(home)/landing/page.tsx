"use client";

import HomeNavbar from "./_components/ui/HomeNavbar";
import BentoCards from "./_components/ui/BentoCards";
import { useEffect, useRef, useState } from "react";
import ColorBends from "@/components/ui/ColorBends";
import Footer from "./_components/ui/Footer";

export default function HomePage() {
  const [navHeight, setNavHeight] = useState<number>(0);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (nav && nav.offsetHeight != navHeight) {
      setNavHeight(nav.offsetHeight);
    }
  }, [navHeight]);

  // TODO: is state needed, can we just use turnary with navRef.current : 0
  return (
    <div className="relative min-h-screen w-full">
      <HomeNavbar navRef={navRef} />
      <div style={{ height: navHeight }} aria-hidden="true" />
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
    </div>
  );
}
