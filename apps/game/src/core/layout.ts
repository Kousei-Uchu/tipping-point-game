export type LayoutMode = "phone" | "tablet" | "desktop";

export interface LayoutInfo {
  mode: LayoutMode;
  width: number;
  height: number;
  /** Short screens (phone in landscape): shrink the hand and banners. */
  dense: boolean;
}

/** UI_Spec section 3: phone is a single column with the Metre on the right; tablet adds side panels; desktop widens them. */
export function layoutFor(width: number, height: number): LayoutInfo {
  const mode: LayoutMode = width >= 1100 ? "desktop" : width >= 700 ? "tablet" : "phone";
  return { mode, width, height, dense: height < 520 };
}
