import * as React from "react";

import type { TPublicLawyer } from "@vidhan/schema";

// Breakpoints mirror the catalogue's old Tailwind grid classes
// (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4), sorted
// descending so the first matching query wins.
const BREAKPOINTS = [
  { minWidth: 1280, columns: 4 },
  { minWidth: 1024, columns: 3 },
  { minWidth: 640, columns: 2 },
  { minWidth: 0, columns: 1 },
] as const;

export type TGridColumns = 1 | 2 | 3 | 4;

// Column count drives how the flat lawyer list is chunked into virtual
// rows. Defaults to 1 until matchMedia runs (kept in an effect so the
// server-rendered HTML and the first client render agree).
export function useGridColumns(): TGridColumns {
  const [columns, setColumns] = React.useState<TGridColumns>(1);

  React.useEffect(() => {
    const queries = BREAKPOINTS.map(({ minWidth }) =>
      window.matchMedia(`(min-width: ${minWidth}px)`),
    );
    const update = () => {
      const index = queries.findIndex((query) => query.matches);
      // The index is clamped into range; the 0px breakpoint always matches.
      const entry = BREAKPOINTS[index === -1 ? BREAKPOINTS.length - 1 : index]!;
      setColumns(entry.columns);
    };
    for (const query of queries) {
      query.addEventListener("change", update);
    }
    update();
    return () => {
      for (const query of queries) {
        query.removeEventListener("change", update);
      }
    };
  }, []);

  return columns;
}

export function chunkIntoRows(
  lawyers: TPublicLawyer[],
  columns: TGridColumns,
): TPublicLawyer[][] {
  const rows: TPublicLawyer[][] = [];
  for (let index = 0; index < lawyers.length; index += columns) {
    rows.push(lawyers.slice(index, index + columns));
  }
  return rows;
}