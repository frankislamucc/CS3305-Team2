"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ColorBends from "@/components/ui/ColorBends";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success && isLogin) {
        router.push("/whiteboard");
        return;
      }

      if (data.success) {
        setMessage("Account created! You can now log in.");
        setIsError(false);
        setUsername("");
        setPassword("");
        setIsLogin(true);
      } else {
        setMessage(data.message || "Something went wrong.");
        setIsError(true);
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4">
      {/* Animated background — same as landing page */}
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
        {/* Logo / Back link */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="relative z-20 flex items-center space-x-3 px-2 py-1 group">
            <Image
              src="/icons/slate-logo.svg"
              alt="logo"
              width={65}
              height={80}
              className="mix-blend-screen"
            />
            <span className="text-3xl font-bold text-black dark:text-white mt-.5 group-hover:opacity-80 transition-opacity">
              Slate
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          {/* Tab toggle */}
          <div className="flex rounded-xl bg-white/5 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                isLogin
                  ? "bg-brand-primary text-white shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setMessage("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                !isLogin
                  ? "bg-brand-primary text-white shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-white mb-1">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="text-white/60 text-sm mb-6">
            {isLogin
              ? "Sign in to access your whiteboard"
              : "Get started with Slate for free"}
          </p>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm mb-4 ${
                isError
                  ? "bg-red-500/20 border border-red-400/30 text-red-200"
                  : "bg-green-500/20 border border-green-400/30 text-green-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="Enter your username"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 backdrop-blur-sm outline-none transition-all focus:border-brand-select focus:ring-2 focus:ring-brand-select/30"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 backdrop-blur-sm outline-none transition-all focus:border-brand-select focus:ring-2 focus:ring-brand-select/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-white/50 text-sm mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage("");
              }}
              className="text-brand-select hover:text-white font-medium transition-colors cursor-pointer"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-neutral-600 hover:text-black dark:text-white/50 dark:hover:text-white text-sm transition-colors"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
