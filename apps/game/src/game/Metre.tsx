import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useSettings } from "../app/SettingsProvider";
import { content } from "../core/content";
import { bandOf } from "../core/selectors";
import { cue } from "../platform/feedback";
import { shakeOffset, bandsCrossed } from "../theme/motion";
import { usePulse, useTween } from "../ui/useTween";
import { materials } from "../theme/materials";
import { colors, elevation, fonts, fontState, radius } from "../theme/tokens";

const BAND_COLOURS = ["#D8BF74", "#C9A56A", "#C0895E", "#B96F53", "#B5533C"]; // band 1 (Trophy side) to band 5 (Skull side)

interface Props {
  ticks: number;
  /** Ghost marker for an action preview, e.g. a Restore about to happen. */
  previewTicks?: number | null;
  compact?: boolean;
  /** Change this number to shake the frame (a Surge, Cascade or extinction). Does nothing under reduced motion. */
  shakeKey?: number;
}

/**
 * The one vertical 40-tick Pressure Metre, as an object: a kraft frame holding a glass tube with five
 * printed bands and a brass slider, a Skull plate at the top and a Trophy cup at the base.
 */
export function Metre({ ticks, previewTicks, compact, shakeKey = 0 }: Props) {
  const [h, setH] = useState(0);
  const { settings } = useSettings();
  // The slider glides to the new reading and ticks as it passes each band line. Reduced motion: it just jumps.
  const shown = useTween(ticks, "metre");
  const lastShown = useRef(shown);
  const perBandRef = content.rules.metre.ticks_per_band;
  useEffect(() => {
    const n = bandsCrossed(lastShown.current, shown, perBandRef);
    lastShown.current = shown;
    if (n > 0 && h > 0) cue("metreTick", settings);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const shake = shakeOffset(usePulse(shakeKey, "shake")) * 6;
  const m = content.rules.metre;
  const total = m.total_ticks, perBand = m.ticks_per_band;
  const width = compact ? 58 : 84;
  const plateH = compact ? 38 : 32;
  const topPad = plateH + 14, botPad = plateH + 14;
  const trackH = Math.max(0, h - topPad - botPad);
  const tickH = trackH / total;
  const yOfTick = (t: number) => topPad + (total - Math.min(total, Math.max(0, t))) * tickH; // top edge of tick t
  const pressure = bandOf(ticks);
  const markerY = (t: number) => yOfTick(t) + tickH / 2;
  const trackX = compact ? 17 : 28;
  const trackW = compact ? 14 : 22;
  const stampFont = fontState.custom ? fonts.stamp : undefined;
  const fs = compact ? 9 : 11;

  const label = `Pressure ${pressure} of 5. Metre at ${ticks} of ${total}. ${ticks} ticks to the Trophy, ${m.skull_at_or_above - ticks} to the Skull.`;
  const preview = previewTicks != null && previewTicks !== ticks ? Math.max(0, previewTicks) : null;
  const plateW = width - 12;

  return (
    <View style={[styles.host, { width, transform: [{ translateX: shake }] }]} onLayout={(e: LayoutChangeEvent) => setH(e.nativeEvent.layout.height)} accessible accessibilityLabel={label} accessibilityRole="progressbar">
      {h > 0 ? (
        <Svg width={width - 6} height={h - 6}>
          <Defs>
            <LinearGradient id="tp-brass" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={materials.brassLight} />
              <Stop offset="1" stopColor={materials.brass} />
            </LinearGradient>
          </Defs>
          <G transform="translate(-3 -3)">
            {/* Skull plate */}
            <G transform={`translate(6 6)`}>
              <Rect width={plateW} height={plateH} rx={5} fill={materials.stock} stroke={materials.keyline} strokeWidth={1.5} />
              <Skull cx={plateW / 2} cy={compact ? 11 : 10} r={compact ? 5.5 : 5.5} />
              <SvgText x={plateW / 2} y={plateH - 4} fontSize={fs} fontFamily={stampFont} fill={colors.dangerText} textAnchor="middle">COLLAPSE</SvgText>
            </G>

            {/* Glass tube: casing, bands, printed numbers, tick marks, sheen */}
            <Rect x={trackX - 5} y={topPad - 5} width={trackW + 10} height={trackH + 10} rx={8} fill={materials.stockDeep} stroke={materials.kraftDeep} strokeWidth={1.5} />
            {Array.from({ length: m.bands }, (_, i) => {
              const band = m.bands - i; // top first
              const topTick = band * perBand;
              return (
                <G key={band}>
                  <Rect x={trackX} y={yOfTick(topTick)} width={trackW} height={tickH * perBand} fill={BAND_COLOURS[band - 1]} stroke={colors.ink} strokeWidth={1} />
                  <SvgText x={trackX - 8} y={yOfTick(topTick) + (tickH * perBand) / 2 + 5} fontSize={compact ? 13 : 16} fontWeight="800" fill={colors.ink} textAnchor="end">{String(band)}</SvgText>
                </G>
              );
            })}
            {Array.from({ length: total - 1 }, (_, i) => (
              <Rect key={i} x={trackX} y={yOfTick(i + 1) - 0.5} width={trackW} height={1} fill="#FFFFFF" opacity={0.45} />
            ))}
            <Rect x={trackX + 3} y={topPad + 4} width={3} height={Math.max(0, trackH - 8)} rx={1.5} fill="#FFFFFF" opacity={0.38} />

            {preview != null ? (
              <G>
                <Rect x={trackX - 6} y={markerY(preview) - 5} width={trackW + 12} height={10} rx={3} fill="none" stroke={colors.accent} strokeWidth={2} strokeDasharray="4 3" />
                <Path d={`M${trackX + trackW + 7},${markerY(preview)} l10,-6 v12 Z`} fill="none" stroke={colors.accent} strokeWidth={2} />
              </G>
            ) : null}

            {/* Brass slider */}
            {shown > 0 && ticks <= total ? (
              <G>
                <Rect x={trackX - 5} y={markerY(shown) - 3.5} width={trackW + 12} height={10} rx={3} fill="#000000" opacity={0.28} />
                <Rect x={trackX - 6} y={markerY(shown) - 6} width={trackW + 12} height={12} rx={3} fill="url(#tp-brass)" stroke={materials.brassDeep} strokeWidth={1.2} />
                <Rect x={trackX - 3} y={markerY(shown) - 4.5} width={trackW + 6} height={1.6} rx={0.8} fill="#FFFFFF" opacity={0.55} />
                <Path d={`M${trackX + trackW + 6},${markerY(shown)} l11,-7 v14 Z`} fill="url(#tp-brass)" stroke={materials.brassDeep} strokeWidth={1.2} strokeLinejoin="round" />
              </G>
            ) : null}

            {/* Trophy cup plate */}
            <G transform={`translate(6 ${h - plateH - 6})`}>
              <Rect width={plateW} height={plateH} rx={5} fill={materials.stock} stroke={materials.keyline} strokeWidth={1.5} />
              <Cup cx={plateW / 2} cy={compact ? 10 : 9} s={0.72} />
              <SvgText x={plateW / 2} y={plateH - 4} fontSize={fs} fontFamily={stampFont} fill={colors.ink} textAnchor="middle">TROPHY</SvgText>
            </G>
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

function Skull({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <G>
      <Rect x={cx - r * 0.55} y={cy + r * 0.45} width={r * 1.1} height={r * 0.75} rx={2} fill={materials.stock} stroke={colors.ink} strokeWidth={1.3} />
      <Circle cx={cx} cy={cy} r={r} fill={materials.stock} stroke={colors.ink} strokeWidth={1.5} />
      <Circle cx={cx - r * 0.38} cy={cy - r * 0.05} r={r * 0.24} fill={colors.ink} />
      <Circle cx={cx + r * 0.38} cy={cy - r * 0.05} r={r * 0.24} fill={colors.ink} />
      <Path d={`M${cx - r * 0.12},${cy + r * 0.4} h${r * 0.24} l${-r * 0.12},${-r * 0.22} Z`} fill={colors.ink} />
      <Path d={`M${cx - r * 0.2},${cy + r * 0.7} v${r * 0.4} M${cx},${cy + r * 0.7} v${r * 0.4} M${cx + r * 0.2},${cy + r * 0.7} v${r * 0.4}`} stroke={colors.ink} strokeWidth={1} />
    </G>
  );
}

function Cup({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s})`}>
      <Path d="M-7,-6 C-12,-6 -12,2 -6,3 M7,-6 C12,-6 12,2 6,3" fill="none" stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M-7,-8 H7 V-2 C7,3 4,6 0,6 C-4,6 -7,3 -7,-2 Z" fill={colors.trophy} stroke={colors.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={-1.6} y={6} width={3.2} height={4} fill={colors.trophy} stroke={colors.ink} strokeWidth={1.2} />
      <Rect x={-5} y={10} width={10} height={3} rx={1} fill={colors.trophy} stroke={colors.ink} strokeWidth={1.2} />
      <Path d="M-4,-5 V0" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />
    </G>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: "stretch", backgroundColor: materials.kraft, borderRadius: radius.md, borderWidth: 3, borderColor: materials.kraftDeep, overflow: "hidden", ...elevation.resting },
});
