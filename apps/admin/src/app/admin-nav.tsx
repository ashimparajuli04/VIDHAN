"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearCreds } from "@/lib/auth";

const LINKS = [
  { href: "/lawyers", label: "Lawyers" },
  { href: "/lawyer-requests", label: "Requests" },
  { href: "/support", label: "Support" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/users", label: "Users" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  function handleSignOut() {
    clearCreds();
    router.replace("/login");
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-3">
        <span className="mr-4 text-sm font-semibold text-slate-900">
          Vidhan Admin
        </span>
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
