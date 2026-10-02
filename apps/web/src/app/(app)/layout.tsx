"use client";

import * as React from "react";

import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/features/auth/guard";
import { ChatProvider } from "@/features/chat/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ChatProvider>
        <AppShell>{children}</AppShell>
      </ChatProvider>
    </RequireAuth>
  );
}
