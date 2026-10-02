export function ThinkingDots() {
  return (
    <span
      role="status"
      aria-label="Thinking"
      className="inline-flex items-center gap-1 px-1 py-1.5"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </span>
  );
}
