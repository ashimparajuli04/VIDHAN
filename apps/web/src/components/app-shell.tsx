"use client";

import * as React from "react";

import { ListSortDescending } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

const SIDEBAR_STORAGE_KEY = "vidhan:sidebar-open";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PersistedSidebarState />
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col pt-14 md:pt-0">
        {/* Mobile-only header: trigger + wordmark + theme toggle. */}
        <MobileHeader />
        {children}
      </div>
    </SidebarProvider>
  );
}

function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-background/90 px-3 shadow-sm backdrop-blur md:hidden">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="size-8"
        >
          <ListSortDescending className="size-5" strokeWidth={2.5} />
        </Button>

        <span className="text-2xl font-black tracking-tight">VIDHAN</span>
      </div>

      <ThemeToggle />
    </header>
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