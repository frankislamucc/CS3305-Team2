"use client";

import { useRouter } from "next/navigation";

export default function WhiteBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <main className="flex flex-col h-screen w-screen">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <span className="text-lg font-semibold">Slate</span>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors cursor-pointer"
        >
          Logout
        </button>
      </header>
      {children}
    </main>
  );
}
