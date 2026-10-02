export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm font-medium">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    </main>
  );
}