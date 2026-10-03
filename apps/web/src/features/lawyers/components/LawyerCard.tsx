import type { TPublicLawyer } from "@vidhan/schema";
import { districtLabel, languageLabel, practiceAreaLabel } from "../labels";

// Unused legacy card; kept in sync with the catalogue card styling.
export function LawyerCard({ lawyer }: { lawyer: TPublicLawyer }) {
  const initial = lawyer.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="flex gap-4 rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground">
      {lawyer.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lawyer.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold text-secondary-foreground">
          {initial}
        </span>
      )}
      <div className="min-w-0 space-y-1">
        <h2 className="text-[17px] font-bold tracking-tight">{lawyer.name}</h2>
        <p className="text-[15px] text-muted-foreground">
          {districtLabel(lawyer.district)}
          {lawyer.yearsOfExperience != null
            ? ` · ${lawyer.yearsOfExperience} yrs`
            : ""}
        </p>
        <p className="text-[15px]">
          {lawyer.practiceAreas.map(practiceAreaLabel).join(", ")}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {lawyer.languages.map(languageLabel).join(", ")}
        </p>
        {lawyer.bio && <p className="text-[15px]">{lawyer.bio}</p>}
        {lawyer.bookingUrl && (
          <a
            href={lawyer.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[15px] font-semibold text-primary hover:underline"
          >
            Book
          </a>
        )}
      </div>
    </article>
  );
}