"use client";

import { logoutAction } from "@/app/(auth)/actions/logout";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
      <span className="text-lg font-semibold">Slate</span>
      <div className="flex items-center gap-4">
        <Link href="/recordings" className="text-sm hover:text-gray-300 transition-colors">
          Recordings
        </Link>
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
  );
}
