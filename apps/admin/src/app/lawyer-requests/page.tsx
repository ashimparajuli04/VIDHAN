"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TRequestStatus } from "@vidhan/schema";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds } from "@/lib/auth";
import { LawyerRequestsTable } from "@/features/lawyer-requests/components/LawyerRequestsTable";
import {
  useLawyerRequests,
  useUpdateLawyerRequestStatus,
} from "@/features/lawyer-requests/hooks";

export default function LawyerRequestsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useLawyerRequests(ready);
  const updateMutation = useUpdateLawyerRequestStatus();

  const unauthorized =
    (query.error instanceof ApiError && query.error.unauthorized) ||
    (updateMutation.error instanceof ApiError &&
      updateMutation.error.unauthorized);

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

  useEffect(() => {
    const error = updateMutation.error;
    if (!error || (error instanceof ApiError && error.unauthorized)) return;
    setActionError(
      error instanceof ApiError
        ? `Update failed (${error.code}).`
        : "Update failed.",
    );
  }, [updateMutation.error]);

  function handleStatusChange(id: string, status: TRequestStatus) {
    setActionError(null);
    updateMutation.mutate({ id, patch: { status } });
  }

  function handleSignOut() {
    clearCreds();
    router.replace("/login");
  }

  if (!ready) return null;

  const requests = query.data ?? [];
  const updatingId = updateMutation.isPending
    ? updateMutation.variables?.id
    : undefined;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Lawyer requests
          </h1>
          <p className="text-sm text-slate-500">
            {requests.length} total
            {query.isFetching ? " · refreshing…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lawyers"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Lawyers
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {actionError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {query.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : query.error && !unauthorized ? (
        <p className="text-sm text-red-600">Failed to load requests.</p>
      ) : (
        <LawyerRequestsTable
          requests={requests}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
      )}
    </main>
  );
}
