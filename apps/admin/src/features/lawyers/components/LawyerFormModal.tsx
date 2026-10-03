"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  CASE_COUNT_COURTS,
  DISTRICTS,
  LANGUAGES,
  PRACTICE_AREAS,
  SENIORITY_LEVELS,
  ZLawyerCreate,
} from "@vidhan/schema";
import type {
  TDistrict,
  TLanguage,
  TLawyerCreate,
  TLawyerWithImage,
  TPracticeArea,
  TSeniority,
} from "@vidhan/schema";
import {
  courtLabel,
  districtLabel,
  languageLabel,
  practiceAreaLabel,
  seniorityLabel,
} from "../labels";
import {
  IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  uploadImage,
} from "../../uploads/api";
import { Avatar } from "./Avatar";

export type TLawyerFormModalProps = {
  open: boolean;
  lawyer: TLawyerWithImage | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TLawyerCreate) => void;
};

type TFieldErrors = Record<string, string[] | undefined>;

type TCaseCountDraft = Record<(typeof CASE_COUNT_COURTS)[number], string>;

type TDraft = {
  name: string;
  district: TDistrict | "";
  seniority: TSeniority | "";
  practiceAreas: TPracticeArea[];
  languages: TLanguage[];
  yearsOfExperience: string;
  barNumber: string;
  bio: string;
  imageKey: string;
  totalCases: string;
  caseCounts: TCaseCountDraft;
  verified: boolean;
  active: boolean;
};

const BLANK_CASE_COUNTS: TCaseCountDraft = {
  supreme_court: "",
  high_court: "",
  district_court: "",
};

function toDraft(lawyer: TLawyerWithImage | null): TDraft {
  if (!lawyer) {
    return {
      name: "",
      district: "",
      seniority: "",
      practiceAreas: [],
      languages: [],
      yearsOfExperience: "",
      barNumber: "",
      bio: "",
      imageKey: "",
      totalCases: "",
      caseCounts: { ...BLANK_CASE_COUNTS },
      verified: false,
      active: true,
    };
  }
  return {
    name: lawyer.name,
    district: lawyer.district,
    seniority: lawyer.seniority,
    practiceAreas: [...lawyer.practiceAreas],
    languages: [...lawyer.languages],
    yearsOfExperience:
      lawyer.yearsOfExperience == null ? "" : String(lawyer.yearsOfExperience),
    barNumber: lawyer.barNumber ?? "",
    bio: lawyer.bio ?? "",
    imageKey: lawyer.imageKey ?? "",
    totalCases: lawyer.totalCases == null ? "" : String(lawyer.totalCases),
    caseCounts: {
      supreme_court:
        lawyer.caseCounts?.supreme_court == null
          ? ""
          : String(lawyer.caseCounts.supreme_court),
      high_court:
        lawyer.caseCounts?.high_court == null
          ? ""
          : String(lawyer.caseCounts.high_court),
      district_court:
        lawyer.caseCounts?.district_court == null
          ? ""
          : String(lawyer.caseCounts.district_court),
    },
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(toDraft(lawyer));
      setFieldErrors({});
      setPreviewUrl(lawyer?.imageUrl ?? null);
      setUploading(false);
      setUploadError(null);
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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setUploadError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be 5MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      setDraft((current) => ({ ...current, imageKey: uploaded.key }));
      setPreviewUrl(uploaded.publicUrl);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setDraft((current) => ({ ...current, imageKey: "" }));
    setPreviewUrl(null);
    setUploadError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const counts = [
      draft.caseCounts.supreme_court,
      draft.caseCounts.high_court,
      draft.caseCounts.district_court,
    ];
    const result = ZLawyerCreate.safeParse({
      name: draft.name.trim(),
      district: draft.district,
      practiceAreas: draft.practiceAreas,
      languages: draft.languages,
      yearsOfExperience:
        draft.yearsOfExperience === ""
          ? undefined
          : Number(draft.yearsOfExperience),
      seniority: draft.seniority === "" ? undefined : draft.seniority,
      barNumber: draft.barNumber.trim() || undefined,
      bio: draft.bio.trim() || undefined,
      imageKey: draft.imageKey.trim() || null,
      // Blank tiers read as 0; the whole breakdown is dropped when every
      // tier is blank so partial records stay indistinguishable from none.
      totalCases:
        draft.totalCases === "" ? undefined : Number(draft.totalCases),
      caseCounts: counts.some((value) => value !== "")
        ? {
            supreme_court: Number(draft.caseCounts.supreme_court || 0),
            high_court: Number(draft.caseCounts.high_court || 0),
            district_court: Number(draft.caseCounts.district_court || 0),
          }
        : undefined,
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
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Seniority
              </span>
              <select
                value={draft.seniority}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seniority: event.target.value as TSeniority | "",
                  })
                }
                className={inputClass}
              >
                <option value="">Select seniority</option>
                {SENIORITY_LEVELS.map((seniority) => (
                  <option key={seniority} value={seniority}>
                    {seniorityLabel(seniority)}
                  </option>
                ))}
              </select>
              <FieldError messages={fieldErrors.seniority} />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <Avatar
              name={draft.name || "?"}
              imageUrl={previewUrl}
              className="h-16 w-16 text-xl"
            />
            <div className="space-y-1">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                {uploading
                  ? "Uploading…"
                  : previewUrl
                    ? "Replace photo"
                    : "Upload photo"}
                <input
                  type="file"
                  accept={IMAGE_CONTENT_TYPES.join(",")}
                  disabled={uploading}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {previewUrl && !uploading && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="block text-xs text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              )}
              {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
              )}
              <p className="text-xs text-slate-500">
                JPEG, PNG or WebP · up to 5MB
              </p>
            </div>
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

          <div className="rounded-md border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">
              Case record
            </span>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">Total cases</span>
                <input
                  type="number"
                  min={0}
                  value={draft.totalCases}
                  onChange={(event) =>
                    setDraft({ ...draft, totalCases: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              {CASE_COUNT_COURTS.map((court) => (
                <label key={court} className="block space-y-1">
                  <span className="text-xs text-slate-500">
                    {courtLabel(court)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={draft.caseCounts[court]}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        caseCounts: {
                          ...draft.caseCounts,
                          [court]: event.target.value,
                        },
                      })
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <FieldError messages={fieldErrors.totalCases} />
            <FieldError messages={fieldErrors.caseCounts} />
          </div>

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
              disabled={submitting || uploading}
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
