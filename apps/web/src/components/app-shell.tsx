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
        {/* No app header; the mobile trigger floats over content instead of
            reserving a bar. */}
        <SidebarTrigger className="fixed top-2 left-2 z-50 bg-background/80 shadow-sm backdrop-blur md:hidden" />
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