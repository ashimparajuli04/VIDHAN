"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TDistrict,
  TLawyerCreate,
  TLawyerUpdate,
  TLawyerWithImage,
  TPracticeArea,
} from "@vidhan/schema";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds } from "@/lib/auth";
import { Filters } from "@/features/lawyers/components/Filters";
import { LawyerFormModal } from "@/features/lawyers/components/LawyerFormModal";
import { LawyerTable } from "@/features/lawyers/components/LawyerTable";
import {
  useCreateLawyer,
  useLawyers,
  useUpdateLawyer,
} from "@/features/lawyers/hooks";

export default function LawyersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [practiceArea, setPracticeArea] = useState<TPracticeArea | "">("");
  const [district, setDistrict] = useState<TDistrict | "">("");
  const [active, setActive] = useState<boolean | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TLawyerWithImage | null>(null);

  const query = useLawyers(active, ready);
  const createMutation = useCreateLawyer();
  const updateMutation = useUpdateLawyer(active);

  const unauthorized =
    (query.error instanceof ApiError && query.error.unauthorized) ||
    (createMutation.error instanceof ApiError &&
      createMutation.error.unauthorized) ||
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
    if (!error || formOpen || (error instanceof ApiError && error.unauthorized)) {
      return;
    }
    setActionError(
      error instanceof ApiError
        ? `Update failed (${error.code}).`
        : "Update failed.",
    );
  }, [updateMutation.error, formOpen]);

  const lawyers = useMemo(() => {
    const list = query.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((lawyer) => {
      if (practiceArea && !lawyer.practiceAreas.includes(practiceArea)) {
        return false;
      }
      if (district && lawyer.district !== district) return false;
      if (term) {
        const nameMatch = lawyer.name.toLowerCase().includes(term);
        const barMatch =
          lawyer.barNumber?.toLowerCase().includes(term) ?? false;
        if (!nameMatch && !barMatch) return false;
      }
      return true;
    });
  }, [query.data, search, practiceArea, district]);

  function openCreate() {
    createMutation.reset();
    updateMutation.reset();
    setActionError(null);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(lawyer: TLawyerWithImage) {
    createMutation.reset();
    updateMutation.reset();
    setActionError(null);
    setEditing(lawyer);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleToggle(id: string, patch: TLawyerUpdate) {
    setActionError(null);
    updateMutation.mutate({ id, patch });
  }

  function handleSubmit(values: TLawyerCreate) {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, patch: values },
        { onSuccess: closeForm },
      );
    } else {
      createMutation.mutate(values, { onSuccess: closeForm });
    }
  }

  function handleSignOut() {
    clearCreds();
    router.replace("/login");
  }

  if (!ready) return null;

  const updatingId = updateMutation.isPending
    ? updateMutation.variables?.id
    : undefined;
  const formError = formOpen
    ? editing
      ? updateMutation.error
      : createMutation.error
    : null;
  const formErrorMessage =
    formError instanceof ApiError
      ? `Save failed (${formError.code}).`
      : formError
        ? "Save failed."
        : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Lawyers</h1>
          <p className="text-sm text-slate-500">
            {lawyers.length} shown
            {query.isFetching ? " · refreshing…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lawyer-requests"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Requests
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Add lawyer
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mb-4">
        <Filters
          search={search}
          onSearch={setSearch}
          practiceArea={practiceArea}
          onPracticeArea={setPracticeArea}
          district={district}
          onDistrict={setDistrict}
          active={active}
          onActive={setActive}
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
        <p className="text-sm text-red-600">Failed to load lawyers.</p>
      ) : (
        <LawyerTable
          lawyers={lawyers}
          updatingId={updatingId}
          onToggle={handleToggle}
          onEdit={openEdit}
        />
      )}

      <LawyerFormModal
        open={formOpen}
        lawyer={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={formErrorMessage}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
