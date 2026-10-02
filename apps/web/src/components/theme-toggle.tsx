"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { SidebarMenuButton } from "@/components/ui/sidebar";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // The server has no way to know the resolved theme, so render a
  // stable placeholder until after hydration to avoid a mismatch.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <SidebarMenuButton
      tooltip="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted && isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      className="h-9 rounded-lg"
    >
      {mounted && isDark ? (
        <Sun className="size-[17px]" />
      ) : (
        <Moon className="size-[17px]" />
      )}
      <span>Toggle theme</span>
    </SidebarMenuButton>
  );
}