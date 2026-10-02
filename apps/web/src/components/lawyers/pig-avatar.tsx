import { cn } from "@/lib/utils";

// Deterministic accent hue per lawyer so the backdrop tint varies subtly
// without any two lawyers looking identical.
function accentHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Tasteful illustrated avatar: a friendly pig wearing professional lawyer
 * attire (suit, shirt, tie). Rendered as inline SVG — no image asset, scales
 * to any size, renders offline. The pig itself stays consistent across the
 * catalogue; only the accent-colored backdrop varies per lawyer.
 */
export function PigAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const hue = accentHue(name);

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${name} avatar`}
      className={cn("shrink-0 rounded-full", className)}
    >
      {/* Soft accent backdrop */}
      <circle cx="50" cy="50" r="50" fill={`hsl(${hue} 55% 93%)`} />

      {/* Suit jacket */}
      <path
        d="M14 100 L14 70 Q14 62 24 62 L76 62 Q86 62 86 70 L86 100 Z"
        fill="#1f2a44"
      />
      {/* Shirt */}
      <path d="M50 63 L28 100 L72 100 Z" fill="#fafafa" />
      {/* Tie (accent hue) */}
      <path
        d="M50 64 L45.5 77 L44 89 L50 94 L56 89 L54.5 77 Z"
        fill={`hsl(${hue} 40% 45%)`}
      />

      {/* Ears (behind head) */}
      <path
        d="M31 23 L20 5 L43 13 Z"
        fill="#d99ba0"
        stroke="#d99ba0"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M69 23 L80 5 L57 13 Z"
        fill="#d99ba0"
        stroke="#d99ba0"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Neck, then head */}
      <rect x="42" y="52" width="16" height="14" rx="6" fill="#ecc7ca" />
      <ellipse cx="50" cy="37" rx="23" ry="21" fill="#ecc7ca" />

      {/* Subtle cheeks */}
      <circle cx="34" cy="45" r="3" fill="#d98990" opacity="0.45" />
      <circle cx="66" cy="45" r="3" fill="#d98990" opacity="0.45" />

      {/* Eyes */}
      <ellipse cx="41.5" cy="36" rx="2.3" ry="3" fill="#33272a" />
      <ellipse cx="58.5" cy="36" rx="2.3" ry="3" fill="#33272a" />

      {/* Snout + nostrils */}
      <ellipse cx="50" cy="49" rx="10.5" ry="7" fill="#f6d5d8" />
      <ellipse cx="45.8" cy="49" rx="1.7" ry="2.4" fill="#a4646a" />
      <ellipse cx="54.2" cy="49" rx="1.7" ry="2.4" fill="#a4646a" />
    </svg>
  );
}