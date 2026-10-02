import type { TPublicLawyer } from "@vidhan/schema";
import { districtLabel, languageLabel, practiceAreaLabel } from "../labels";

export function LawyerCard({ lawyer }: { lawyer: TPublicLawyer }) {
  const initial = lawyer.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
      {lawyer.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lawyer.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-medium text-muted-foreground">
          {initial}
        </span>
      )}
      <div className="min-w-0 space-y-1">
        <h2 className="font-semibold">{lawyer.name}</h2>
        <p className="text-sm text-muted-foreground">
          {districtLabel(lawyer.district)}
          {lawyer.yearsOfExperience != null
            ? ` · ${lawyer.yearsOfExperience} yrs`
            : ""}
        </p>
        <p className="text-sm">
          {lawyer.practiceAreas.map(practiceAreaLabel).join(", ")}
        </p>
        <p className="text-xs text-muted-foreground">
          {lawyer.languages.map(languageLabel).join(", ")}
        </p>
        {lawyer.bio && <p className="text-sm">{lawyer.bio}</p>}
        {lawyer.bookingUrl && (
          <a
            href={lawyer.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Book
          </a>
        )}
      </div>
    </article>
  );
}
