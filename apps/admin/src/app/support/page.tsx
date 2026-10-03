"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TSupportTicketStatus } from "@vidhan/schema";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds } from "@/lib/auth";
import { SupportDetail } from "@/features/support/components/SupportDetail";
import { SupportTable } from "@/features/support/components/SupportTable";
import { useSupportTickets } from "@/features/support/hooks";

export default function SupportPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<TSupportTicketStatus | undefined>(
    undefined,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useSupportTickets(status, ready);
  const unauthorized =
    query.error instanceof ApiError && query.error.unauthorized;

  useEffect(() => {
    if (hasCreds()) setReady(true);
    else router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (unauthorized) {
      clearCreds();
      router.replace("/login");
    }
  }, [unauthorized, router]);

  if (!ready) return null;
  if (selectedId) {
    return <SupportDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const tickets = query.data ?? [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Support tickets</h1>
          <p className="text-sm text-slate-500">
            {tickets.length} shown
            {query.isFetching ? " · refreshing…" : ""}
          </p>
        </div>
        <select
          value={status ?? "all"}
          onChange={(event) =>
            setStatus(
              event.target.value === "all"
                ? undefined
                : (event.target.value as TSupportTicketStatus),
            )
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </header>

      {query.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : query.error && !unauthorized ? (
        <p className="text-sm text-red-600">Failed to load tickets.</p>
      ) : (
        <SupportTable tickets={tickets} onOpen={setSelectedId} />
      )}
    </main>
  );
}
