"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  DISTRICTS,
  LANGUAGES,
  PRACTICE_AREAS,
  ZLawyerCreate,
} from "@vidhan/schema";
import type {
  TDistrict,
  TLanguage,
  TLawyer,
  TLawyerCreate,
  TPracticeArea,
} from "@vidhan/schema";
import { districtLabel, languageLabel, practiceAreaLabel } from "../labels";

export type TLawyerFormModalProps = {
  open: boolean;
  lawyer: TLawyer | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TLawyerCreate) => void;
};

type TFieldErrors = Record<string, string[] | undefined>;

type TDraft = {
  name: string;
  district: TDistrict | "";
  practiceAreas: TPracticeArea[];
  languages: TLanguage[];
  yearsOfExperience: string;
  barNumber: string;
  bookingUrl: string;
  bio: string;
  verified: boolean;
  active: boolean;
};

function toDraft(lawyer: TLawyer | null): TDraft {
  if (!lawyer) {
    return {
      name: "",
      district: "",
      practiceAreas: [],
      languages: [],
      yearsOfExperience: "",
      barNumber: "",
      bookingUrl: "",
      bio: "",
      verified: false,
      active: true,
    };
  }
  return {
    name: lawyer.name,
    district: lawyer.district,
    practiceAreas: [...lawyer.practiceAreas],
    languages: [...lawyer.languages],
    yearsOfExperience:
      lawyer.yearsOfExperience == null ? "" : String(lawyer.yearsOfExperience),
    barNumber: lawyer.barNumber ?? "",
    bookingUrl: lawyer.bookingUrl ?? "",
    bio: lawyer.bio ?? "",
    verified: lawyer.verified,
    active: lawyer.active,
  };
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none";

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

type TCheckboxGroupProps<T extends string> = {
  legend: string;
  options: readonly T[];
  selected: readonly T[];
  format: (option: T) => string;
  onToggle: (option: T) => void;
};

function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  format,
  onToggle,
}: TCheckboxGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-slate-700">
        {legend}
      </legend>
      <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {format(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LawyerFormModal({
  open,
  lawyer,
  submitting,
  error,
  onClose,
  onSubmit,
}: TLawyerFormModalProps) {
  const [draft, setDraft] = useState<TDraft>(() => toDraft(lawyer));
  const [fieldErrors, setFieldErrors] = useState<TFieldErrors>({});

  useEffect(() => {
    if (open) {
      setDraft(toDraft(lawyer));
      setFieldErrors({});
    }
  }, [open, lawyer]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = ZLawyerCreate.safeParse({
      name: draft.name.trim(),
      district: draft.district,
      practiceAreas: draft.practiceAreas,
      languages: draft.languages,
      yearsOfExperience:
        draft.yearsOfExperience === ""
          ? undefined
          : Number(draft.yearsOfExperience),
      barNumber: draft.barNumber.trim() || undefined,
      bookingUrl: draft.bookingUrl.trim() || undefined,
      bio: draft.bio.trim() || undefined,
      verified: draft.verified,
      active: draft.active,
    });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }
    setFieldErrors({});
    onSubmit(result.data);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {lawyer ? "Edit lawyer" : "New lawyer"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                className={inputClass}
              />
              <FieldError messages={fieldErrors.name} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                District
              </span>
              <select
                value={draft.district}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    district: event.target.value as TDistrict | "",
                  })
                }
                className={inputClass}
              >
                <option value="">Select district</option>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {districtLabel(district)}
                  </option>
                ))}
              </select>
              <FieldError messages={fieldErrors.district} />
            </label>
          </div>

          <CheckboxGroup
            legend="Practice areas"
            options={PRACTICE_AREAS}
            selected={draft.practiceAreas}
            format={practiceAreaLabel}
            onToggle={(area) =>
              setDraft({
                ...draft,
                practiceAreas: toggle(draft.practiceAreas, area),
              })
            }
          />
          <FieldError messages={fieldErrors.practiceAreas} />

          <CheckboxGroup
            legend="Languages"
            options={LANGUAGES}
            selected={draft.languages}
            format={languageLabel}
            onToggle={(language) =>
              setDraft({
                ...draft,
                languages: toggle(draft.languages, language),
              })
            }
          />
          <FieldError messages={fieldErrors.languages} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Years of experience
              </span>
              <input
                type="number"
                min={0}
                value={draft.yearsOfExperience}
                onChange={(event) =>
                  setDraft({ ...draft, yearsOfExperience: event.target.value })
                }
                className={inputClass}
              />
              <FieldError messages={fieldErrors.yearsOfExperience} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Bar number
              </span>
              <input
                type="text"
                value={draft.barNumber}
                onChange={(event) =>
                  setDraft({ ...draft, barNumber: event.target.value })
                }
                className={inputClass}
              />
              <FieldError messages={fieldErrors.barNumber} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Booking URL
            </span>
            <input
              type="url"
              value={draft.bookingUrl}
              onChange={(event) =>
                setDraft({ ...draft, bookingUrl: event.target.value })
              }
              placeholder="https://"
              className={inputClass}
            />
            <FieldError messages={fieldErrors.bookingUrl} />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Bio</span>
            <textarea
              value={draft.bio}
              maxLength={500}
              rows={3}
              onChange={(event) =>
                setDraft({ ...draft, bio: event.target.value })
              }
              className={inputClass}
            />
            <FieldError messages={fieldErrors.bio} />
          </label>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(event) =>
                  setDraft({ ...draft, verified: event.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft({ ...draft, active: event.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : lawyer
                  ? "Save changes"
                  : "Create lawyer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
