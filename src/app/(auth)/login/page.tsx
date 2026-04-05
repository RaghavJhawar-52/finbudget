"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError("");

    try {
      // Create a fresh guest account
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) throw new Error();
      const { email, password } = await res.json();

      // Auto sign-in with the generated credentials
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error();

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not start guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo-stacked.svg"
            alt="FinBudget"
            width={120}
            height={130}
          />
        </div>

        <div className="card p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in or continue as a guest</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="input-base"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading || guestLoading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Guest button */}
          <button
            type="button"
            onClick={handleGuest}
            disabled={loading || guestLoading}
            className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {guestLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserRound className="w-4 h-4" />}
            Continue as Guest
          </button>

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Guest data is private to your session
          </p>

          <p className="mt-5 text-center text-sm text-gray-500">
            New here?{" "}
            <Link href="/signup" className="text-primary-600 hover:underline font-medium">Create a free account</Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 bg-white/60 dark:bg-gray-900/60 rounded-xl text-center text-xs text-gray-500">
          Demo: <span className="font-mono">demo@finbudget.app</span> / <span className="font-mono">demo1234</span>
        </div>
      </div>
    </div>
  );
}
