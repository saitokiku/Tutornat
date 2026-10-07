export type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Class for anything that should look like a button (Link, label, button). `danger` is for a confirmed delete only.
 *  `sm` is 36px with a 44px target on touch, and a full 56px target in K–2 (`k-btn-sm`, globals.css). */
export const btn = (variant: Variant = "primary", size: "md" | "sm" = "md", extra = "") =>
  `k-btn-${variant} ${size === "sm" ? "k-btn-sm min-h-9 px-3.5 text-xs pointer-coarse:min-h-11" : ""} ${extra}`.trim();
