"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("prelegal_user", JSON.stringify(data.user));
        router.replace("/");
      } else {
        setError(data.error ?? (mode === "signup" ? "Sign up failed." : "Invalid email or password."));
      }
    } catch {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl" style={{ color: "#209dd7" }}>⚖</span>
            <span className="text-xl font-bold" style={{ color: "#032147" }}>
              PreLegal
            </span>
          </div>
          <p className="text-sm" style={{ color: "#888888" }}>
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              !isSignUp
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isSignUp
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/60 focus:border-slate-400 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={isSignUp ? 8 : undefined}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/60 focus:border-slate-400 focus:bg-white transition-all"
                required
              />
              {isSignUp && (
                <p className="text-[11px] text-slate-400 mt-1">At least 8 characters</p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/60 focus:border-slate-400 focus:bg-white transition-all"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity shadow-sm cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: "#753991" }}
            >
              {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create Account" : "Sign In")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
