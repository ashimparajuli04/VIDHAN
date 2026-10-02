"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { FullShellSkeleton } from "./components/full-shell-skeleton";
import { useAuth } from "./provider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") return <FullShellSkeleton />;

  return <>{children}</>;
}
