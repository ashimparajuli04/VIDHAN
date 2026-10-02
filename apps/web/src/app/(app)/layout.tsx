"use client";

import * as React from "react";

import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/features/auth/guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
