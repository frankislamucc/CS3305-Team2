import Link from "next/link";

interface ToggleNavbarProps {
  isLoginPage: boolean;
}

export default function ToggleNavbar({ isLoginPage }: ToggleNavbarProps) {
  return (
    <div className="flex rounded-xl bg-white/5 p-1 mb-6 border border-white/4 backdrop-blur-md">
      <Link
        href="/login"
        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg text-center transition-all duration-300 ease-out 
      ${
        isLoginPage
          ? "bg-brand-primary text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] scale-[1.02]"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
      >
        Login
      </Link>

      <Link
        href="/register"
        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg text-center transition-all duration-300 ease-out 
      ${
        !isLoginPage
          ? "bg-brand-primary text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] scale-[1.02]"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
      >
        Register
      </Link>
    </div>
  );
}
