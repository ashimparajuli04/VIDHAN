export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 md:mb-10">
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl md:leading-[1.1]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-snug text-muted-foreground md:text-[16px]">
        {description}
      </p>
    </header>
  );
}