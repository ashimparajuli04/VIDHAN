"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds } from "@/lib/auth";
import { UsersTable } from "@/features/users/components/UsersTable";
import {
  useUpdateUserSubscription,
  useUsers,
} from "@/features/users/hooks";

export default function UsersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useUsers(page, search, ready);
  const updateMutation = useUpdateUserSubscription();

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

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleToggleSubscription(id: string, next: boolean) {
    setActionError(null);
    updateMutation.mutate({ id, patch: { isSubscribed: next } });
  }

  if (!ready) return null;

  const users = query.data?.users ?? [];
  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const updatingId = updateMutation.isPending
    ? updateMutation.variables?.id
    : undefined;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">
            {total} total
            {query.isFetching ? " · refreshing…" : ""}
          </p>
        </div>
      </header>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search email or name"
          className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      {actionError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {query.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : query.error && !unauthorized ? (
        <p className="text-sm text-red-600">Failed to load users.</p>
      ) : (
        <UsersTable
          users={users}
          updatingId={updatingId}
          onToggleSubscription={handleToggleSubscription}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
