export type TAvatarProps = {
  name: string;
  imageUrl: string | null;
  className?: string;
};

export function Avatar({ name, imageUrl, className = "" }: TAvatarProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className={`rounded-full object-cover ${className}`} />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600 ${className}`}
    >
      {initial}
    </span>
  );
}
