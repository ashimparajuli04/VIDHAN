"use client";

import { useEffect, useState } from "react";
import type { TPublicLawyer } from "@vidhan/schema";
import { listLawyers } from "@/features/lawyers/api";
import { LawyerCard } from "@/features/lawyers/components/LawyerCard";

export default function LawyersPage() {
  const [lawyers, setLawyers] = useState<TPublicLawyer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    listLawyers()
      .then((data) => {
        if (active) setLawyers(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lawyer Catalogue
        </h1>
        <p className="text-sm text-muted-foreground">
          Verified lawyers across Nepal.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">Could not load lawyers.</p>
      ) : lawyers === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lawyers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lawyers to show yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>
      )}
    </main>
  );
}
