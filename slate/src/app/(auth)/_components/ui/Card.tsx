import { ReactNode } from "react";
import ToggleNavbar from "./ToggleNavbar";
import { AuthError } from "@/app/(workspace)/whiteboard/_types";

interface CardProps {
  headingText: string;
  subHeadingText: string;
  children: ReactNode;
  error: AuthError | undefined;
}

export default function Card({
  headingText,
  subHeadingText,
  children,
  error,
}: CardProps) {
  return (
    <div className="backdrop-blur-xl bg-neutral-900/80 border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
      <ToggleNavbar />

      <h2 className="text-2xl font-bold text-white mb-1">{headingText}</h2>
      <p className="text-white/60 text-sm mb-6">{subHeadingText}</p>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm mb-4 bg-red-500/20 border border-red-400/30 text-red-200">
          {error.errorMessage}
        </div>
      )}

      {/* form */}
      {children}
    </div>
  );
}
