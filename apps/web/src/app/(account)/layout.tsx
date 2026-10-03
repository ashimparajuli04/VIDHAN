"use client";

import * as React from "react";

import { RequireAuth } from "@/features/auth/guard";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No AppShell here — the account page renders without the sidebar.
  return <RequireAuth>{children}</RequireAuth>;
}
