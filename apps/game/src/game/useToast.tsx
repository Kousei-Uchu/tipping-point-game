import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "../theme/tokens";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";

/** One short message at a time, announced to screen readers, gone after a moment. A paper slip, set down slightly crooked. */
export function useToast(ms = 2600) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), ms);
  }, [ms]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const node = msg ? (
    <View style={styles.wrap} pointerEvents="none">
      <Plate elevation="lifted" corner={4} style={styles.slip} accessibilityLiveRegion="assertive" accessibilityRole="alert">
        <Text variant="label" center>{msg}</Text>
      </Plate>
    </View>
  ) : null;
  return { show, node };
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: space.xl, alignItems: "center", paddingHorizontal: space.lg },
  slip: { paddingHorizontal: space.lg, paddingVertical: space.sm, maxWidth: 520, transform: [{ rotate: "-0.8deg" }] },
});
