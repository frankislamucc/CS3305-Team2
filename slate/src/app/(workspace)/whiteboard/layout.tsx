"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WhiteBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <main className="flex flex-col h-screen w-screen">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <span className="text-lg font-semibold">Slate</span>
        <div className="flex items-center gap-4">
          {username && (
            <span className="text-sm text-gray-300">
              Welcome, <span className="font-medium text-white">{username}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}
