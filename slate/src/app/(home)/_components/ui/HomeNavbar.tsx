"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { RefObject, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/(auth)/actions/logout";

interface HomeNavbarProps {
  username: string;
}

export default function HomeNavbar({ username }: HomeNavbarProps) {
  const navItems = [
    {
      name: "Whiteboard",
      link: "/whiteboard",
    },
    {
      name: "About us",
      link: "",
    },
  ];

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current === null) return;
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty("--nav-height", `${height}px`);
    };
    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => {
      window.removeEventListener("resize", updateNavHeight);
    };
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutAction();
    window.location.reload();
  };

  return (
    <Navbar containerRef={navRef}>
      {/* Desktop Navigation */}
      <NavBody>
        <NavbarLogo />
        <NavItems items={navItems} />
        <div className="flex items-center gap-4">
          {username ? (
            <>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Welcome,{" "}
                <span className="font-medium text-black dark:text-white">
                  {username}
                </span>
              </span>
              <NavbarButton
                as="button"
                onClick={handleLogout}
                variant="secondary"
              >
                Logout
              </NavbarButton>
            </>
          ) : (
            <>
              <NavbarButton href="/login" variant="secondary">
                Login
              </NavbarButton>
              <NavbarButton href="/register" variant="primary">
                Sign up
              </NavbarButton>
            </>
          )}
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {navItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative text-neutral-600 dark:text-neutral-300"
            >
              <span className="block">{item.name}</span>
            </a>
          ))}
          <div className="flex w-full flex-col gap-4">
            {username ? (
              <>
                <span className="text-sm text-neutral-300 text-center">
                  Welcome,{" "}
                  <span className="font-medium text-white">{username}</span>
                </span>
                <NavbarButton
                  as="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  variant="primary"
                  className="w-full"
                >
                  Logout
                </NavbarButton>
              </>
            ) : (
              <>
                <NavbarButton
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="primary"
                  className="w-full"
                >
                  Login
                </NavbarButton>
                <NavbarButton
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="primary"
                  className="w-full"
                >
                  Sign up
                </NavbarButton>
              </>
            )}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>

    // {/* Navbar */}
    // </div>
  );
}
