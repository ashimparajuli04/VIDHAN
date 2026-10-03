"use client";

import * as React from "react";

import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/features/auth/guard";
import { ChatProvider } from "@/features/chat/store";
import { UsageProvider } from "@/features/usage/provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <UsageProvider>
        <ChatProvider>
          <AppShell>{children}</AppShell>
        </ChatProvider>
      </UsageProvider>
    </RequireAuth>
  );
}
