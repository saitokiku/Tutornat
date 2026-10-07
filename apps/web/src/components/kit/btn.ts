export type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Class for anything that should look like a button (Link, label, button). `danger` is for a confirmed delete only. */
export const btn = (variant: Variant = "primary", size: "md" | "sm" = "md", extra = "") =>
  `k-btn-${variant} ${size === "sm" ? "min-h-9 px-3.5 text-xs pointer-coarse:min-h-11" : ""} ${extra}`.trim();
