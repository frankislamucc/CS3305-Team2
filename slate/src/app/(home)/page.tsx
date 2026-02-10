"use client";

import HomeNavbar from "./_components/ui/HomeNavbar";
import BentoCards from "./_components/ui/BentoCards";
import { useEffect, useRef, useState } from "react";

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
    <div>
      <HomeNavbar navRef={navRef} />
      <div style={{ height: navHeight }} aria-hidden="true" />
      <BentoCards />
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
      <p>this word</p>
    </div>
  );
}
