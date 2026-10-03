import * as React from "react";

import type { TPublicLawyer } from "@vidhan/schema";

// Columns are derived from the catalogue's own width (not the viewport),
// so cards never shrink below MIN_CARD_WIDTH regardless of the surrounding
// layout — e.g. the app sidebar. A column drops as soon as the container
// can't fit another card at that width.
const MIN_CARD_WIDTH = 360;
const GRID_GAP = 20; // must match the `gap-5` class on the grid
const MAX_COLUMNS = 4;

export type TGridColumns = 1 | 2 | 3 | 4;

function columnsForWidth(width: number): TGridColumns {
  if (width <= 0) return 1;
  const fit = Math.floor((width + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP));
  return Math.min(MAX_COLUMNS, Math.max(1, fit)) as TGridColumns;
}

// Column count drives how the flat lawyer list is chunked into virtual
// rows. Defaults to 1 until the container has been measured (kept in an
// effect so server-rendered HTML and the first client render agree).
export function useGridColumns() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = React.useState<TGridColumns>(1);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setColumns(columnsForWidth(element.clientWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, columns };
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