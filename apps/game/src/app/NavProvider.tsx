import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BackHandler } from "react-native";

export type Route = "title" | "lobby" | "game" | "result" | "settings" | "rules";

interface Ctx { route: Route; navigate: (r: Route) => void; back: () => void; canGoBack: boolean }
const NavContext = createContext<Ctx>({ route: "title", navigate: () => {}, back: () => {}, canGoBack: false });

/**
 * A deliberately tiny stack navigator. Five screens do not need a routing library yet.
 * If deep links or web URLs are wanted later, expo-router can replace this one file.
 */
export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>(["title"]);
  const navigate = useCallback((r: Route) => setStack((s) => (r === "title" ? ["title"] : s[s.length - 1] === r ? s : [...s, r])), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack, back]);

  const value = useMemo(() => ({ route: stack[stack.length - 1]!, navigate, back, canGoBack: stack.length > 1 }), [stack, navigate, back]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
