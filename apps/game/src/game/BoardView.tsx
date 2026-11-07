import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Polygon, Polyline } from "react-native-svg";
import type { State } from "@tipping-point/engine";
import { engine } from "../core/content";
import { BOARD } from "../core/boardGeometry";
import { clampView, clampZoom, comfortZoom, initialView, panBy, viewBoxFor, zoomTo, type View as BoardViewState } from "../core/viewport";
import { paintOrder, THICK } from "../core/boardArt";
import { BoardMotionContext } from "../ui/useTween";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, MIN_TAP, elevation, radius, space } from "../theme/tokens";
import { Text } from "../ui/Text";
import { Pressable } from "react-native";
import { PatternDefs } from "./biomeArt";
import { Tile, type Highlight } from "./Tile";

interface Props {
  state: State;
  highlights: ReadonlyMap<number, Highlight>;
  /** Tile ids to draw a route through, starting from the active pawn's tile. */
  path: readonly number[];
  pathFrom: number | null;
  /** Ravage call order, shown as numbered badges. */
  badges: ReadonlyMap<number, number>;
  /** When this changes the view recentres on that tile (only if zoomed in). */
  focusTile: number | null;
  onTilePress: (id: number) => void;
  /** Start zoomed in on the focus tile when whole-board tiles would be under the minimum tap size (phones). The Fit key still shows everything. Default on. */
  comfortable?: boolean;
}

const centre = new Map(BOARD.tiles.map((t) => [t.id, t]));

/**
 * The punchboard itself: a soft shadow, a darker edge for thickness and a kraft face made of every
 * tile's slot. Tiles sit in it; a lost tile shows the felt through its slot. Static, so drawn once.
 */
export const BoardBase = React.memo(function BoardBase() {
  return (
    <G pointerEvents="none">
      {BOARD.tiles.map((t) => <Polygon key={`sh${t.id}`} points={t.tray} fill="#000000" fillOpacity={0.12} transform={`translate(0.04 ${THICK + 0.2})`} />)}
      {BOARD.tiles.map((t) => <Polygon key={`sd${t.id}`} points={t.tray} fill={materials.kraftDeep} transform={`translate(0 ${THICK * 0.8})`} />)}
      {BOARD.tiles.map((t) => <Polygon key={`tr${t.id}`} points={t.tray} fill={materials.kraft} stroke={darken(materials.kraft, 0.3)} strokeWidth={0.02} strokeLinejoin="round" />)}
    </G>
  );
});

export function BoardView({ state, highlights, path, pathFrom, badges, focusTile, onTilePress, comfortable = true }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setViewState] = useState<BoardViewState>(() => initialView(BOARD.bounds));
  const viewRef = useRef(view);
  // Pieces already on the table at load appear in place; only changes after the first picture animate.
  const [ready, setReady] = useState(false);
  useEffect(() => { if (size.w > 0) setReady(true); }, [size.w]);
  const motion = useMemo(() => ({ ready }), [ready]);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const setView = useCallback((v: BoardViewState) => { viewRef.current = v; setViewState(v); }, []);

  // Drag detection so a pan never counts as a tile press.
  const lastDrag = useRef(0);
  const guardedPress = useCallback((id: number) => { if (Date.now() - lastDrag.current > 220) onTilePress(id); }, [onTilePress]);

  const gesture = useRef({ lastDx: 0, lastDy: 0, pinch: null as null | { dist: number; zoom: number } });
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length >= 2 || Math.hypot(g.dx, g.dy) > 9,
    onPanResponderGrant: () => { gesture.current = { lastDx: 0, lastDy: 0, pinch: null }; },
    onPanResponderMove: (e, g) => {
      lastDrag.current = Date.now();
      const touches = e.nativeEvent.touches;
      const { w, h } = sizeRef.current;
      if (touches.length >= 2) {
        const a = touches[0]!, b = touches[1]!;
        const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        const st = gesture.current;
        if (!st.pinch) st.pinch = { dist, zoom: viewRef.current.zoom };
        else if (st.pinch.dist > 0) setView(zoomTo(BOARD.bounds, viewRef.current, clampZoom(st.pinch.zoom * (dist / st.pinch.dist))));
        return;
      }
      gesture.current.pinch = null;
      const dx = g.dx - gesture.current.lastDx, dy = g.dy - gesture.current.lastDy;
      gesture.current.lastDx = g.dx; gesture.current.lastDy = g.dy;
      setView(panBy(BOARD.bounds, viewRef.current, dx, dy, w, h));
    },
    onPanResponderRelease: () => { lastDrag.current = Date.now(); },
    onPanResponderTerminationRequest: () => true,
  }), [setView]);

  // Mouse wheel zoom on web.
  const hostRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = hostRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setView(zoomTo(BOARD.bounds, viewRef.current, clampZoom(viewRef.current.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12))));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [setView]);

  // First measurement: if tiles would be under the minimum tap size at fit, start zoomed in on the active pawn.
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current || size.w <= 0 || size.h <= 0) return;
    placed.current = true;
    if (!comfortable) return;
    const z = comfortZoom(BOARD.bounds, size.w, size.h, MIN_TAP);
    if (z <= 1.05) return;
    const t = focusTile != null ? centre.get(focusTile) : undefined;
    const base = initialView(BOARD.bounds);
    setView(clampView(BOARD.bounds, { zoom: z, cx: t ? t.cx : base.cx, cy: t ? t.cy : base.cy }));
  }, [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recentre on the active pawn when the turn passes, if the player has zoomed in.
  useEffect(() => {
    if (focusTile == null || viewRef.current.zoom <= 1.05) return;
    const t = centre.get(focusTile);
    if (t) setView(clampView(BOARD.bounds, { ...viewRef.current, cx: t.cx, cy: t.cy }));
  }, [focusTile, setView]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const vb = viewBoxFor(BOARD.bounds, view, size.w, size.h);

  // Upper rows first, so each tile's side and shadow fall under the row below it.
  const tileProps = useMemo(() => paintOrder(state.tiles.map((t) => {
    const owner = t.owner ? state.players.find((p) => p.id === t.owner) : undefined;
    const pawns = state.players.filter((p) => p.pos === t.id).map((p) => `${p.seat}:${p.colour}:${p.name.charAt(0).toUpperCase()}`).join("|");
    const g = centre.get(t.id)!;
    return { t, owner, pawns, cx: g.cx, cy: g.cy };
  })), [state.tiles, state.players]);

  const routePoints = useMemo(() => {
    if (pathFrom == null || path.length === 0) return "";
    return [pathFrom, ...path].map((id) => { const c = centre.get(id)!; return `${c.cx.toFixed(3)},${c.cy.toFixed(3)}`; }).join(" ");
  }, [path, pathFrom]);
  const routeEnd = path.length ? centre.get(path[path.length - 1]!) : undefined;

  const zoomBy = (f: number) => setView(zoomTo(BOARD.bounds, viewRef.current, clampZoom(viewRef.current.zoom * f)));
  const reset = () => setView(initialView(BOARD.bounds));

  return (
    <View ref={hostRef} style={styles.host} onLayout={onLayout} {...responder.panHandlers}>
      <BoardMotionContext.Provider value={motion}>
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} accessibilityLabel="Game board">
          <PatternDefs />
          <BoardBase />
          {tileProps.map(({ t, owner, pawns }) => (
            <Tile
              key={t.id}
              id={t.id}
              biome={t.biome}
              status={t.status}
              shield={t.shield}
              stabilised={t.stabilised}
              ownerSeat={owner ? owner.seat : -1}
              ownerColour={owner ? owner.colour : "#000000"}
              pawns={pawns}
              highlight={highlights.get(t.id) ?? null}
              badge={badges.get(t.id) ?? 0}
              label={engine.describeTile(state, t.id, pathFrom)}
              onPress={guardedPress}
            />
          ))}
          {routePoints ? (
            <G pointerEvents="none">
              <Polyline points={routePoints} fill="none" stroke={colors.ink} strokeWidth={0.13} strokeDasharray="0.22 0.14" strokeLinecap="round" strokeLinejoin="round" />
              {routeEnd ? <Circle cx={routeEnd.cx} cy={routeEnd.cy} r={0.17} fill={colors.ink} /> : null}
            </G>
          ) : null}
        </Svg>
      ) : null}
      </BoardMotionContext.Provider>
      <View style={styles.zoom} pointerEvents="box-none">
        <ZoomButton label="+" a11y="Zoom in" onPress={() => zoomBy(1.4)} />
        <ZoomButton label="-" a11y="Zoom out" onPress={() => zoomBy(1 / 1.4)} />
        <ZoomButton label="Fit" a11y="Fit the whole board" onPress={reset} wide />
      </View>
    </View>
  );
}

function ZoomButton({ label, a11y, onPress, wide }: { label: string; a11y: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [styles.zbtn, wide && { width: MIN_TAP + 10 }, pressed && { opacity: 0.7 }]}>
      <Text variant="heading" center>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, overflow: "hidden", borderRadius: radius.md },
  zoom: { position: "absolute", left: space.sm, top: space.sm, gap: space.xs },
  zbtn: { width: MIN_TAP, height: MIN_TAP, borderRadius: radius.md, backgroundColor: materials.stock, borderWidth: 1.5, borderColor: colors.ink, borderBottomWidth: 4, alignItems: "center", justifyContent: "center", ...elevation.resting },
});
