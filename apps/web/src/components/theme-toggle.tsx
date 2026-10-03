"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  showLabel = false,
  className,
}: {
  /** Shows the mode name next to the icon (used by the expanded sidebar). */
  showLabel?: boolean;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // The server has no way to know the resolved theme, so render a
  // stable placeholder until after hydration to avoid a mismatch.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const label = mounted ? (isDark ? "Light" : "Dark") : "Dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted && isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      title={
        mounted && isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      className={cn(
        showLabel ? "h-11 w-full justify-start gap-2.5 px-2" : "size-8",
        className
      )}
    >
      {mounted && isDark ? (
        <Sun className={cn("size-4", showLabel && "size-5")} />
      ) : (
        <Moon className={cn("size-4", showLabel && "size-5")} />
      )}
      {showLabel && <span className="text-[15px] font-semibold">{label}</span>}
    </Button>
  );
}