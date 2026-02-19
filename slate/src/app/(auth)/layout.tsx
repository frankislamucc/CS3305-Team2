import ColorBends from "@/components/ui/ColorBends";
import Link from "next/link";
import LogoHeader from "./_components/ui/LogoHeader";
import BackButton from "./_components/ui/BackButton";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <div className="relative min-h-screen w-full flex items-center justify-center px-4">
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

        <div className="w-full max-w-md">
          <LogoHeader />
          {children}
          <BackButton />
        </div>
      </div>
    </main>
  );
}
