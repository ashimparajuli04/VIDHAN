"use client";

import * as React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const SIDEBAR_STORAGE_KEY = "vidhan:sidebar-open";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PersistedSidebarState />
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="md:hidden" />
        </header>
        {children}
      </div>
    </SidebarProvider>
  );
}

/**
 * shadcn persists sidebar open state to a cookie, which cannot be read
 * under output: "export" (no server at build or runtime). Mirror it into
 * localStorage instead, applied after mount so the sidebar still renders
 * in the static HTML export.
 */
function PersistedSidebarState() {
  const { open, setOpen } = useSidebar();
  const applied = React.useRef(false);

  React.useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      const storedOpen = stored === "true";
      if (storedOpen !== open) {
        setOpen(storedOpen);
      }
    } else {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    }
  }, [open, setOpen]);

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  }, [open]);

  return null;
}