"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      setMessage(data.message);

      if (data.success && isLogin) {
        router.push("/whiteboard");
        return;
      }

      if (data.success) {
        setUsername("");
        setPassword("");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Slate</h1>

      <hr />

      <nav style={{ display: "flex", gap: 16, margin: "20px 0" }}>
        <button
          onClick={() => { setIsLogin(true); setMessage(""); }}
          style={{
            fontWeight: isLogin ? "bold" : "normal",
            fontSize: 16,
            padding: "8px 20px",
            cursor: "pointer",
            backgroundColor: isLogin ? "#333" : "#fff",
            color: isLogin ? "#fff" : "#333",
            border: "2px solid #333",
            borderRadius: 6,
          }}
        >
          Login
        </button>
        <button
          onClick={() => { setIsLogin(false); setMessage(""); }}
          style={{
            fontWeight: !isLogin ? "bold" : "normal",
            fontSize: 16,
            padding: "8px 20px",
            cursor: "pointer",
            backgroundColor: !isLogin ? "#333" : "#fff",
            color: !isLogin ? "#fff" : "#333",
            border: "2px solid #333",
            borderRadius: 6,
          }}
        >
          Register
        </button>
      </nav>

      <h2>{isLogin ? "Login" : "Register"}</h2>

      {message && (
        <p style={{ padding: 10, border: "1px solid", marginBottom: 16 }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="username">Username</label>
          <br />
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor: loading ? "#999" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            width: "100%",
          }}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>
      </form>
    </div>
  );
}
