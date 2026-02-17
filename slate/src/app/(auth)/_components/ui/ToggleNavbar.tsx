import Link from "next/link";

export default function ToggleNavbar() {
  return (
    <div className="flex rounded-xl bg-white/5 p-1 mb-6">
      <Link
        href="/login"
        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer bg-brand-primary text-white shadow-md"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer bg-brand-primary text-white shadow-md"
      >
        Register
      </Link>
    </div>
  );
}
