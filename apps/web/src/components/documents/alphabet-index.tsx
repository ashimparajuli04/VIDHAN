import { cn } from "@/lib/utils";

export function AlphabetIndex({
  letters,
  activeLetter,
  onSelect,
}: {
  letters: string[];
  activeLetter: string | null;
  onSelect: (letter: string) => void;
}) {
  return (
    <nav aria-label="Alphabetical index">
      <ol className="flex gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:justify-center">
        {letters.map((letter) => (
          <li key={letter}>
            <button
              type="button"
              onClick={() => onSelect(letter)}
              aria-current={activeLetter === letter ? "true" : undefined}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md text-[15px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                activeLetter === letter
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
              )}
            >
              {letter}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}