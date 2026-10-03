import type { SVGProps } from "react";

/**
 * ChatGPT-style sidebar toggle glyph. Lucide's `panel-left` uses rx=2 on a
 * 24px grid, which reads nearly square at 18px; this redraws the same shape
 * with a 3.5px corner radius and a round-capped divider to match ChatGPT.
 */
function SidebarToggleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M9.75 4v16" />
    </svg>
  );
}

export { SidebarToggleIcon };