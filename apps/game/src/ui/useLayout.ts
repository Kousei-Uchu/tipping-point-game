import { useWindowDimensions } from "react-native";
import { layoutFor, type LayoutInfo } from "../core/layout";

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}
