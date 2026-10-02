"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds, setCreds } from "@/lib/auth";
import { checkCredentials } from "@/features/lawyers/api";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasCreds()) router.replace("/lawyers");
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreds(user, pass);
    try {
      await checkCredentials();
      router.replace("/lawyers");
    } catch (err) {
      clearCreds();
      setError(
        err instanceof ApiError && err.unauthorized
          ? "Invalid credentials."
          : "Could not reach the API.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Vidhan Admin</h1>
          <p className="text-sm text-slate-500">Sign in to manage the catalog.</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Username</span>
          <input
            type="text"
            value={user}
            autoComplete="username"
            onChange={(event) => setUser(event.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={pass}
            autoComplete="current-password"
            onChange={(event) => setPass(event.target.value)}
            className={inputClass}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
