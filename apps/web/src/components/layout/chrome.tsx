"use client";

import * as React from "react";

import { AppShell } from "@/components/app-shell";

/**
 * Client boundary for the app chrome.
 *
 * Root layout stays a server component; the "use client" directives live
 * here and in the leaf components it renders.
 */
export function Chrome({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}