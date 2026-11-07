// Phase 6 art: spot illustrations as pure vector data. No React, no platform code, so a test can check coverage and bounds.
// A scene is a list of flat shapes drawn in a SCENE_W by SCENE_H box. Cards crop it with "slice", so everything that matters
// sits in the middle band (SAFE_TOP to SAFE_BOTTOM) and the top and bottom are only sky and ground.
// "ink" and "danger" are resolved by the renderer from the theme, every other colour is a literal hex.

export const SCENE_W = 120;
export const SCENE_H = 72;
export const SAFE_TOP = 11;
export const SAFE_BOTTOM = 61;

export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; f: string; o?: number }
  | { t: "circle"; x: number; y: number; r: number; f: string; o?: number }
  | { t: "path"; d: string; f?: string; s?: string; w?: number; o?: number };

type Fill = string;
const rect = (x: number, y: number, w: number, h: number, f: Fill, o?: number): Shape => ({ t: "rect", x, y, w, h, f, o });
const circle = (x: number, y: number, r: number, f: Fill, o?: number): Shape => ({ t: "circle", x, y, r, f, o });
const fillPath = (d: string, f: Fill, o?: number): Shape => ({ t: "path", d, f, o });
const line = (d: string, s: Fill, w = 1.6, o?: number): Shape => ({ t: "path", d, s, w, o });

const C = {
  skyWarm: "#EFE3C4", skyCool: "#D9E4E6", skyDusk: "#CFC4AE", skySmog: "#B9B2A0", water: "#5E8DA8", waterDeep: "#3F6C86",
  leaf: "#4E7A58", leafDark: "#34573F", trunk: "#6B4A32", cut: "#D2B48A", soil: "#8B6B47", soilDark: "#5F4630",
  sand: "#E4D2A4", straw: "#D9B863", grass: "#9DB35E", grassDark: "#6F8B3E", reed: "#7C8E4F", peat: "#5A4636", mud: "#8A6E4F",
  ice: "#F4F8FA", iceMid: "#BFD3DC", iceDark: "#7D98A6", rock: "#6E7479", rockDark: "#4A4F54", concrete: "#B7B4AC", concreteDark: "#8D8A84",
  coral: "#E0795E", coralPale: "#EAD9CC", coralDead: "#EFE9DD", fish: "#F2B84B", fire: "#E8782E", fireHot: "#F5C14B", smoke: "#8C8F92",
  algae: "#7FA23A", sludge: "#8A7A3A", white: "#FFFFFF", barn: "#A8483A",
} as const;

// ---- small parts, all in scene units ---------------------------------------------------------------------------------

const pine = (x: number, base: number, h: number, c: Fill = C.leaf, d: Fill = C.leafDark): Shape[] => {
  const w = h * 0.42;
  return [
    rect(x - h * 0.04, base - h * 0.2, h * 0.08, h * 0.2, C.trunk),
    fillPath(`M${x},${base - h} L${x + w * 0.5},${base - h * 0.52} L${x - w * 0.5},${base - h * 0.52} Z`, c),
    fillPath(`M${x},${base - h * 0.72} L${x + w * 0.72},${base - h * 0.2} L${x - w * 0.72},${base - h * 0.2} Z`, d),
  ];
};
const stump = (x: number, y: number, s = 1): Shape[] => [
  rect(x - 3 * s, y - 4 * s, 6 * s, 4 * s, C.trunk),
  { t: "path", d: `M${x - 3 * s},${y - 4 * s} a3,1.2 0 1,0 ${6 * s},0 a3,1.2 0 1,0 ${-6 * s},0 Z`, f: C.cut },
];
const cloud = (x: number, y: number, s = 1, c: Fill = C.white, o = 0.85): Shape[] => [
  circle(x, y, 4 * s, c, o), circle(x + 4.5 * s, y + 0.8 * s, 3.4 * s, c, o), circle(x - 4.5 * s, y + 1 * s, 3 * s, c, o), rect(x - 7.5 * s, y + 1 * s, 15 * s, 3 * s, c, o),
];
const sun = (x: number, y: number, r: number, c: Fill = "#F3C75A"): Shape[] => [circle(x, y, r, c)];
const flame = (x: number, y: number, s = 1): Shape[] => [
  fillPath(`M${x},${y - 11 * s} C${x + 6 * s},${y - 5 * s} ${x + 6 * s},${y} ${x},${y} C${x - 6 * s},${y} ${x - 6 * s},${y - 5 * s} ${x},${y - 11 * s} Z`, C.fire),
  fillPath(`M${x},${y - 6 * s} C${x + 3 * s},${y - 3 * s} ${x + 3 * s},${y} ${x},${y} C${x - 3 * s},${y} ${x - 3 * s},${y - 3 * s} ${x},${y - 6 * s} Z`, C.fireHot),
];
const waves = (y: number, c: Fill, o = 1): Shape[] => [
  fillPath(`M0,${y} Q10,${y - 3} 20,${y} T40,${y} T60,${y} T80,${y} T100,${y} T120,${y} V${SCENE_H} H0 Z`, c, o),
];
const fish = (x: number, y: number, s = 1, c: Fill = C.fish, flip = false): Shape[] => {
  const k = flip ? -1 : 1;
  return [
    fillPath(`M${x - 4 * s * k},${y} Q${x},${y - 3 * s} ${x + 4 * s * k},${y} Q${x},${y + 3 * s} ${x - 4 * s * k},${y} Z`, c),
    fillPath(`M${x + 3.4 * s * k},${y} L${x + 6.4 * s * k},${y - 2.4 * s} L${x + 6.4 * s * k},${y + 2.4 * s} Z`, c),
    circle(x - 2 * s * k, y - 0.5 * s, 0.55 * s, "ink"),
  ];
};
const coralFan = (x: number, y: number, s = 1, c: Fill = C.coral): Shape[] => [
  line(`M${x},${y} V${y - 7 * s} M${x},${y - 3 * s} L${x - 4 * s},${y - 8 * s} M${x},${y - 3 * s} L${x + 4 * s},${y - 8 * s} M${x},${y - 7 * s} L${x - 2 * s},${y - 12 * s} M${x},${y - 7 * s} L${x + 2 * s},${y - 12 * s}`, c, 2.1 * s),
];
const reeds = (x: number, y: number, n: number, h: number, c: Fill = C.reed): Shape[] => {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const rx = x + i * 3.2, rh = h * (0.7 + ((i * 37) % 10) / 30);
    out.push(line(`M${rx},${y} V${y - rh}`, c, 1.3));
    if (i % 2 === 0) out.push({ t: "path", d: `M${rx},${y - rh - 3} a1.1,2.4 0 1,0 0.01,0 Z`, f: C.peat });
  }
  return out;
};
const mountain = (x: number, base: number, w: number, h: number, c: Fill = C.iceMid, cap: Fill = C.ice): Shape[] => [
  fillPath(`M${x - w / 2},${base} L${x},${base - h} L${x + w / 2},${base} Z`, c),
  fillPath(`M${x},${base - h} L${x + w * 0.16},${base - h * 0.68} L${x + w * 0.05},${base - h * 0.74} L${x - w * 0.06},${base - h * 0.62} L${x - w * 0.16},${base - h * 0.68} Z`, cap),
];
const wheat = (x: number, y: number, n: number, h: number, c: Fill = C.straw): Shape[] => {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) out.push(line(`M${x + i * 3},${y} Q${x + i * 3 + 0.6},${y - h * 0.6} ${x + i * 3 + 1.4},${y - h}`, c, 1.2));
  return out;
};
const cow = (x: number, y: number, s = 1, flip = false): Shape[] => {
  const k = flip ? -1 : 1;
  return [
    rect(x - 5 * s, y - 6 * s, 10 * s, 5 * s, C.white), rect(x - 4 * s, y - 1 * s, 1.4 * s, 3.2 * s, C.rockDark), rect(x + 2.6 * s, y - 1 * s, 1.4 * s, 3.2 * s, C.rockDark),
    rect(x + (flip ? -8 : 5) * s, y - 7 * s, 3 * s, 3.4 * s, C.white), circle(x - 1 * s * k, y - 4 * s, 1.5 * s, C.rockDark),
  ];
};
const smokestack = (x: number, base: number, h: number, smoke = true): Shape[] => [
  rect(x - 3, base - h, 6, h, C.concreteDark), rect(x - 3, base - h, 6, 2, "ink"),
  ...(smoke ? [circle(x + 2, base - h - 4, 3.4, C.smoke, 0.75), circle(x + 7, base - h - 8, 4.4, C.smoke, 0.6), circle(x + 13, base - h - 11, 5, C.smoke, 0.45)] : []),
];
const drip = (x: number, y: number, c: Fill): Shape[] => [fillPath(`M${x},${y - 3} C${x + 2.2},${y} ${x + 2.2},${y + 2.4} ${x},${y + 2.4} C${x - 2.2},${y + 2.4} ${x - 2.2},${y} ${x},${y - 3} Z`, c)];
const house = (x: number, y: number, c: Fill = C.barn): Shape[] => [rect(x - 5, y - 6, 10, 6, c), fillPath(`M${x - 6.5},${y - 6} L${x},${y - 11} L${x + 6.5},${y - 6} Z`, C.rockDark), rect(x - 1.2, y - 3.6, 2.4, 3.6, C.cut)];

const sky = (c: Fill = C.skyWarm): Shape => rect(0, 0, SCENE_W, SCENE_H, c);
const ground = (y: number, c: Fill, c2?: Fill): Shape[] => [rect(0, y, SCENE_W, SCENE_H - y, c), ...(c2 ? [rect(0, y + 6, SCENE_W, SCENE_H - y - 6, c2)] : [])];
const rolling = (y: number, c: Fill): Shape =>
  fillPath(`M0,${y} Q20,${y - 6} 40,${y - 1} T80,${y - 2} T120,${y - 4} V${SCENE_H} H0 Z`, c);

// ---- biome headers (also cover all 30 Tool cards) ---------------------------------------------------------------------

const BIOME: Record<string, () => Shape[]> = {
  forest: () => [
    sky(), ...cloud(22, 20, 0.9), ...sun(98, 20, 6), rolling(46, "#8DAA86"), rect(0, 52, SCENE_W, SCENE_H - 52, C.soil),
    ...pine(16, 54, 30), ...pine(34, 56, 38), ...pine(52, 53, 26, "#5E8A66"), ...pine(72, 56, 40), ...pine(92, 54, 30), ...pine(106, 56, 24, "#5E8A66"),
  ],
  coral: () => [
    sky(C.skyCool), ...sun(100, 14, 5, "#F6E7A8"), ...waves(24, C.water), rect(0, 30, SCENE_W, 42, C.waterDeep, 0.55), ...ground(58, C.sand),
    ...coralFan(22, 58, 1.4), ...coralFan(48, 58, 1.8, "#E8957C"), ...coralFan(78, 58, 1.5), ...coralFan(100, 58, 1.2, "#E8957C"), ...fish(36, 40, 1.2), ...fish(88, 34, 1, "#F6E7A8", true), ...fish(62, 46, 0.9),
  ],
  wetland: () => [
    sky(C.skyWarm), ...sun(24, 22, 6, "#F6D98A"), ...cloud(86, 18, 0.9), ...ground(46, C.water), rect(0, 52, SCENE_W, 20, C.reed, 0.55), fillPath(`M0,58 Q30,50 60,57 T120,54 V72 H0 Z`, C.peat),
    ...reeds(8, 56, 6, 22), ...reeds(40, 58, 5, 26), ...reeds(74, 57, 7, 24), ...reeds(104, 56, 4, 20),
    fillPath("M56,46 q4,-4 8,0 q-4,2 -8,0 Z", C.white), fillPath("M20,48 q4,-3 7,0 q-3,2 -7,0 Z", C.white, 0.9),
  ],
  glacier: () => [
    sky(C.skyCool), ...sun(100, 18, 5, "#FBF3D2"), ...mountain(34, 56, 64, 40, C.iceDark), ...mountain(78, 56, 70, 46, C.iceMid), ...mountain(104, 56, 36, 24, C.iceDark),
    ...ground(54, C.ice), rect(0, 62, SCENE_W, 10, C.iceMid, 0.7),
  ],
  grassland: () => [
    sky(C.skyWarm), ...sun(24, 20, 7), ...cloud(80, 16, 1), rolling(42, C.grass), rolling(54, C.grassDark),
    ...wheat(10, 58, 10, 12, C.straw), ...wheat(52, 60, 8, 14, C.straw), ...wheat(88, 58, 9, 11, C.straw), ...cow(66, 48, 0.9),
  ],
  river: () => [
    sky(C.skyCool), ...cloud(26, 18, 1), ...cloud(92, 22, 0.8), rolling(34, C.leaf), rolling(40, "#7FA06A"), rect(0, 44, SCENE_W, 28, C.water),
    fillPath("M0,52 Q30,46 60,52 T120,50 V72 H0 Z", C.waterDeep, 0.5), line("M12,50 q6,-3 12,0 M70,56 q6,-3 12,0 M44,62 q6,-3 12,0", C.white, 1.1, 0.6), ...fish(34, 58, 0.9), ...pine(10, 44, 16), ...pine(108, 44, 18),
  ],
};

// ---- Ravage spots, four per biome ------------------------------------------------------------------------------------

const RAVAGE: Record<string, () => Shape[]> = {
  "R-FOR-1": () => [
    sky(C.skyDusk), rolling(46, "#8DAA86"), ...ground(52, C.soil), ...stump(18, 56), ...stump(36, 58, 1.2), ...stump(56, 56), ...stump(78, 59, 1.3), ...pine(100, 56, 34),
    rect(26, 30, 36, 3, C.rockDark), rect(60, 28, 9, 7, C.trunk), line("M27,33 l2,3 l2,-3 l2,3 l2,-3 l2,3 l2,-3 l2,3 l2,-3 l2,3 l2,-3", C.rockDark, 1.1), ...pine(110, 56, 22),
  ],
  "R-FOR-2": () => [
    sky(C.skyWarm), ...sun(98, 18, 6), rolling(42, "#8DAA86"), ...ground(50, C.straw),
    ...[0, 1, 2, 3].map((i) => line(`M0,${54 + i * 5} Q60,${51 + i * 5} 120,${54 + i * 5}`, C.soil, 2.4)), ...pine(14, 50, 22), ...house(84, 50), ...stump(40, 52),
  ],
  "R-FOR-3": () => [
    sky(C.skyWarm), ...pine(10, 56, 36), ...pine(26, 58, 44), ...pine(96, 58, 44), ...pine(112, 56, 34), ...ground(54, C.leafDark),
    fillPath("M44,72 L52,38 L68,38 L76,72 Z", C.mud), line("M60,70 V62 M60,56 V50 M60,46 V41", C.straw, 1.6), ...cow(60, 36, 0.4),
  ],
  "R-FOR-4": () => [
    sky(C.skySmog), circle(96, 22, 7, C.fire, 0.85), rolling(46, C.leafDark), ...ground(52, C.soilDark),
    ...pine(14, 56, 30, C.leafDark, "#25402F"), ...pine(38, 58, 38, C.leafDark, "#25402F"), ...flame(54, 56, 1.5), ...flame(66, 58, 1.9), ...flame(82, 56, 1.4), ...pine(100, 56, 28, C.leafDark, "#25402F"),
    circle(46, 22, 5, C.smoke, 0.6), circle(56, 17, 6, C.smoke, 0.5), circle(70, 14, 6.5, C.smoke, 0.45),
  ],
  "R-COR-1": () => [
    sky(C.skyCool), ...sun(94, 14, 7, "#F6E7A8"), ...waves(24, C.water), rect(0, 30, SCENE_W, 42, C.waterDeep, 0.5), ...ground(58, C.sand),
    ...coralFan(20, 58, 1.5, C.coralDead), ...coralFan(46, 58, 1.9, C.coralDead), ...coralFan(76, 58, 1.6, C.coralPale), ...coralFan(100, 58, 1.2, C.coral), ...fish(60, 38, 0.9, "#D8D2C0"),
  ],
  "R-COR-2": () => [
    sky(C.skyCool), ...waves(24, C.water), rect(0, 30, SCENE_W, 42, C.waterDeep, 0.5), ...ground(58, C.sand),
    ...coralFan(26, 58, 1.7, C.coralPale), ...coralFan(70, 58, 1.7, C.coralPale),
    ...[18, 40, 62, 88, 104].flatMap((x, i) => [circle(x, 34 + (i % 2) * 8, 2.6, C.white, 0.55), line(`M${x - 1},${34 + (i % 2) * 8} l2,0`, "ink", 0.8, 0.8)]),
    fillPath("M92,10 q8,-6 16,0 q-8,3 -16,0 Z", C.smoke, 0.7),
  ],
  "R-COR-3": () => [
    sky(C.skyDusk), ...waves(22, C.waterDeep), rect(0, 28, SCENE_W, 44, C.mud, 0.55), ...ground(58, C.sand),
    ...coralFan(30, 58, 1.5, C.coralPale), ...coralFan(88, 58, 1.4, C.coral), fillPath("M0,22 Q14,26 18,34 Q10,40 0,44 Z", C.mud),
    ...[22, 34, 46].map((x, i) => fillPath(`M${x},${36 + i * 4} q6,-2 12,1 q-6,3 -12,-1 Z`, C.mud, 0.8)),
  ],
  "R-COR-4": () => [
    sky(C.skyCool), ...waves(22, C.water), rect(0, 28, SCENE_W, 44, C.waterDeep, 0.5), ...ground(58, C.sand), ...coralFan(22, 58, 1.4), ...coralFan(100, 58, 1.2),
    line("M30,10 Q60,8 70,40", "ink", 1.1), line("M32,10 Q66,12 78,42", "ink", 1.1), fillPath("M44,44 L58,40 L82,40 L96,46 L82,52 L58,52 Z", C.rockDark, 0.28),
    ...fish(52, 46, 1.1), ...fish(66, 47, 1), ...fish(78, 45, 1.1), ...fish(60, 50, 1),
  ],
  "R-WET-1": () => [
    sky(C.skyWarm), ...sun(98, 18, 6), ...ground(40, C.peat), rect(0, 40, 50, 6, C.reed, 0.8), ...reeds(6, 42, 4, 14),
    rect(0, 50, 62, 7, C.waterDeep), rect(56, 47, 14, 10, C.concreteDark), rect(68, 49, 8, 5, C.concrete), fillPath("M76,51 Q92,52 100,64 L76,64 Z", C.water, 0.9), line("M76,52 q10,0 14,8", C.white, 1.1, 0.7),
    line("M82,42 l8,4 l6,-3 l8,5 M96,60 l6,3 l8,-2 M70,66 l6,2", C.soilDark, 1.3), rect(0, 60, 120, 12, C.soilDark, 0.6),
  ],
  "R-WET-2": () => [
    sky(C.skyDusk), ...ground(42, C.reed, C.peat), ...reeds(4, 44, 3, 12), rect(0, 52, 120, 20, C.peat),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [rect(16 + i * 15, 54, 11, 5, "#8A6A4E"), rect(18 + i * 15, 59, 11, 5, "#7A5C43"), rect(16 + i * 15, 64, 11, 4, "#6A4F3A")]),
    rect(86, 34, 14, 10, C.rockDark), rect(98, 38, 12, 6, C.concreteDark), circle(90, 46, 3, "ink"), circle(104, 46, 3, "ink"),
  ],
  "R-WET-3": () => [
    sky(C.skyDusk), ...ground(46, C.water), rect(0, 42, SCENE_W, 8, C.reed, 0.7), rect(0, 50, SCENE_W, 22, C.concrete),
    line("M0,62 H120 M40,50 V72 M80,50 V72", C.concreteDark, 1.4), rect(52, 28, 22, 22, C.concreteDark), rect(56, 32, 4, 4, C.skyCool), rect(66, 32, 4, 4, C.skyCool), rect(56, 40, 4, 4, C.skyCool), rect(66, 40, 4, 4, C.skyCool),
    ...reeds(6, 46, 3, 10),
  ],
  "R-WET-4": () => [
    sky(C.skyWarm), ...sun(98, 18, 6), ...ground(40, C.water), rect(0, 40, 54, 32, C.straw), rect(54, 40, 66, 32, C.reed, 0.7),
    ...[0, 1, 2].map((i) => line(`M0,${46 + i * 8} H54`, C.soil, 2.2)), ...wheat(60, 58, 5, 12, C.straw), ...reeds(90, 60, 5, 18), fillPath("M20,48 q8,-4 16,0 l0,4 l-16,0 Z", C.barn),
    line("M54,40 V72", C.rockDark, 1.4), ...cow(32, 62, 0.8),
  ],
  "R-GLA-1": () => [
    sky(C.skyCool), ...sun(96, 16, 6, "#FBF3D2"), ...mountain(40, 52, 70, 38, C.iceDark), ...mountain(86, 52, 56, 30, C.iceMid), ...ground(50, C.ice), rect(0, 56, SCENE_W, 16, C.water),
    fillPath("M56,52 l8,-6 l6,6 Z", C.ice), ...[70, 84, 96].flatMap((x, i) => drip(x, 38 + i * 4, C.water)), fillPath("M64,56 l8,-4 l8,6 Z", C.ice, 0.9),
  ],
  "R-GLA-2": () => [
    sky(C.skyCool), ...mountain(32, 48, 60, 34, C.iceMid), ...ground(46, C.ice), rect(0, 50, SCENE_W, 22, C.water), rect(0, 60, SCENE_W, 12, C.waterDeep, 0.55),
    line("M40,56 H100 M50,64 H110", C.white, 1.4, 0.7), fillPath("M96,58 l-10,-2 l0,3 Z", C.coral), line("M20,62 q14,2 28,-2", C.coral, 2.4), fillPath("M48,58 l-6,-3 l1,6 Z", C.coral),
  ],
  "R-GLA-3": () => [
    sky(C.skyDusk), ...mountain(36, 56, 66, 42, "#7C7568", "#9B9384"), ...mountain(86, 56, 60, 34, C.iceDark, "#8F8B80"), ...ground(54, "#8A8478"),
    ...[24, 38, 50, 74, 90].map((x, i) => circle(x, 20 + (i % 3) * 5, 1.2, C.rockDark, 0.8)), rect(0, 60, SCENE_W, 12, C.iceDark, 0.7),
  ],
  "R-GLA-4": () => [
    sky(C.skySmog), ...mountain(86, 56, 60, 38, C.iceMid), ...ground(54, C.ice), ...smokestack(22, 54, 30), ...smokestack(38, 54, 22), rect(14, 46, 34, 10, C.concreteDark),
    circle(88, 20, 7, C.fire, 0.8), rect(0, 60, SCENE_W, 12, C.iceMid, 0.7),
  ],
  "R-GRA-1": () => [
    sky(C.skyWarm), rolling(42, C.straw), ...ground(54, C.soil), ...[10, 30, 52, 70, 96].map((x, i) => rect(x, 56 + (i % 2) * 4, 8, 2, C.soilDark)),
    ...cow(24, 52, 1), ...cow(50, 56, 1.1, true), ...cow(80, 52, 1), ...cow(102, 57, 0.9, true), ...wheat(38, 54, 2, 6, C.straw),
  ],
  "R-GRA-2": () => [
    sky(C.skyWarm), ...sun(98, 18, 6), rolling(42, C.grass), ...ground(52, C.soil),
    ...[0, 1, 2, 3].map((i) => line(`M0,${56 + i * 4} Q60,${53 + i * 4} 120,${56 + i * 4}`, C.soilDark, 2.6)), rect(24, 38, 14, 8, C.barn), rect(30, 34, 14, 3, C.rockDark), rect(38, 42, 8, 8, C.rockDark), circle(34, 49, 3.6, "ink"), circle(46, 49, 3.6, "ink"),
  ],
  "R-GRA-3": () => [
    sky(C.skyWarm), rolling(40, C.grass), ...ground(50, C.straw), ...wheat(4, 60, 14, 12, C.straw), ...wheat(50, 60, 12, 14, C.straw), ...house(18, 50), ...house(100, 50),
    line("M0,50 H120", C.rockDark, 1.2), ...[10, 30, 50, 70, 90, 110].map((x) => line(`M${x},50 V54`, C.rockDark, 1.2)),
  ],
  "R-GRA-4": () => [
    sky(C.skyWarm), rolling(44, C.grass), ...ground(54, C.grassDark), ...cow(24, 58, 1), ...cow(44, 58, 1), ...cow(64, 58, 1), ...cow(84, 58, 1), ...cow(104, 58, 1),
    line("M0,50 H120", C.rockDark, 1), ...[0, 1, 2].map((i) => line(`M0,${60 + i * 4} H120`, C.soilDark, 1.2, 0.45)),
  ],
  "R-RIV-1": () => [
    sky(C.skyDusk), rolling(36, C.leaf), rect(0, 44, SCENE_W, 28, C.algae), fillPath("M0,54 Q30,48 60,54 T120,52 V72 H0 Z", C.sludge, 0.7),
    ...[16, 36, 60, 84, 104].map((x, i) => circle(x, 52 + (i % 2) * 7, 3, "#C7D86A", 0.8)), ...fish(46, 64, 0.8, "#D8D2C0", true), ...fish(86, 66, 0.8, "#D8D2C0"),
    rect(10, 38, 6, 6, C.barn), line("M13,44 V50", C.sludge, 2),
  ],
  "R-RIV-2": () => [
    sky(C.skyCool), rolling(34, C.leaf), rect(0, 44, 56, 28, C.water), rect(64, 52, 56, 20, C.waterDeep, 0.6), rect(54, 36, 12, 36, C.concrete), rect(54, 36, 12, 3, C.concreteDark),
    line("M56,42 V70 M60,42 V70 M64,42 V70", C.concreteDark, 0.8), fillPath("M66,56 h20 v8 h-20 Z", C.water, 0.8), ...fish(30, 58, 1), ...pine(10, 44, 16),
  ],
  "R-RIV-3": () => [
    sky(C.skyDusk), rolling(36, C.leaf), rect(0, 46, SCENE_W, 26, C.waterDeep), ...house(18, 40, C.cut), ...house(96, 40, "#C7B88E"),
    rect(40, 38, 40, 4, C.concreteDark), rect(70, 42, 4, 8, C.concreteDark), ...drip(72, 52, C.sludge), ...drip(72, 58, C.sludge), fillPath("M58,56 q8,-3 16,0 q-8,3 -16,0 Z", C.sludge, 0.6),
    ...[24, 50, 90].map((x, i) => rect(x, 54 + (i % 2) * 6, 3, 2, C.white, 0.8)),
  ],
  "R-RIV-4": () => [
    sky(C.skySmog), rolling(36, C.leafDark), rect(0, 46, SCENE_W, 26, C.waterDeep), rect(12, 28, 44, 20, C.concreteDark), ...smokestack(24, 28, 14), ...smokestack(44, 28, 10),
    rect(56, 42, 22, 5, C.concrete), fillPath("M78,42 h10 v10 h-10 Z", C.sludge, 0.9), fillPath("M70,52 Q96,50 112,58 L112,72 H70 Z", C.sludge, 0.6), ...fish(96, 66, 0.8, "#D8D2C0", true),
  ],
};


// ---- Event scenes, one per Event card ----------------------------------------------------------------------------------

const walker = (x: number, y: number, shirt: Fill, s = 1): Shape[] => [
  circle(x, y - 13 * s, 2.6 * s, "#E6C29A"), fillPath(`M${x - 3 * s},${y - 10 * s} H${x + 3 * s} L${x + 2.4 * s},${y - 3 * s} H${x - 2.4 * s} Z`, shirt),
  line(`M${x - 1.2 * s},${y - 3 * s} L${x - 2.6 * s},${y} M${x + 1.2 * s},${y - 3 * s} L${x + 2.6 * s},${y}`, "ink", 1.5 * s),
];
const crate = (x: number, y: number, w: number): Shape[] => [rect(x, y, w, w, "#B98A5B"), line(`M${x},${y} L${x + w},${y + w} M${x + w},${y} L${x},${y + w}`, C.trunk, 1.1), rect(x, y, w, 1.6, C.trunk)];

const EVENT: Record<string, () => Shape[]> = {
  "E-1": () => [
    sky(C.skyCool), rolling(48, C.grass), ...ground(56, C.grassDark), ...cloud(26, 16, 0.9), line("M88,18 q4,-4 8,0 q4,-4 8,0", "ink", 1.3),
    circle(44, 36, 12, "ink"), circle(76, 36, 12, "ink"), circle(44, 36, 8, "#BFD9E4"), circle(76, 36, 8, "#BFD9E4"), rect(54, 31, 12, 10, "ink"),
    line("M40,32 q3,-3 7,-2 M72,32 q3,-3 7,-2", C.white, 1.2, 0.8), rect(14, 40, 14, 18, C.cut), rect(17, 38, 8, 4, C.rockDark), line("M17,46 h8 M17,50 h8 M17,54 h5", C.trunk, 1),
  ],
  "E-2": () => [
    sky(C.skyWarm), ...sun(100, 16, 6), rolling(50, C.grass), ...ground(56, C.grassDark),
    ...[0, 1, 2].flatMap((i) => [rect(40, 54 - i * 5, 40, 5, "#C9A24B"), rect(40, 54 - i * 5, 40, 1.4, "#E6CE85"), line(`M46,${57 - i * 5} h28`, "#8A6A25", 0.8, 0.6)]),
    line("M60,40 V30", C.leaf, 2), fillPath("M60,34 q-9,-1 -10,-9 q9,0 10,9 Z", C.leaf), fillPath("M60,32 q9,-1 10,-9 q-9,0 -10,9 Z", "#6E9C58"), rect(86, 40, 18, 12, C.cut), line("M86,40 L95,47 L104,40", C.trunk, 1.1),
  ],
  "E-3": () => [
    sky(C.skyWarm), ...sun(96, 18, 7), ...cloud(26, 16, 1), rolling(42, "#8DAA86"), ...ground(52, C.grass), fillPath("M0,66 Q40,52 120,60 V72 H0 Z", C.sand),
    ...walker(30, 64, "#C9594A", 1.4), ...walker(58, 60, "#3F7FB0", 1.4), ...walker(86, 58, "#E0A93B", 1.4), line("M92,44 v-8", C.leafDark, 1.3), fillPath("M92,38 q-5,0 -6,-5 q5,0 6,5 Z", C.leaf),
  ],
  "E-4": () => [
    sky(C.skySmog), circle(100, 22, 6, C.fire, 0.8), ...ground(50, C.concreteDark), ...smokestack(24, 50, 34), ...smokestack(42, 50, 24), rect(14, 42, 40, 8, C.concreteDark),
    rect(66, 38, 36, 24, "#5A3F2B"), rect(66, 38, 36, 5, "#7A5636"), line("M78,38 v-5 h12 v5", "#5A3F2B", 2), rect(82, 46, 4, 5, "#C9A24B"),
  ],
  "E-5": () => [
    sky(C.skyDusk), ...ground(54, "#9A7C58"), ...crate(22, 38, 16), ...crate(38, 38, 16), ...crate(30, 22, 16),
    rect(70, 44, 26, 10, "#4A5560"), rect(72, 42, 26, 10, "#5B6773"), rect(74, 40, 26, 10, "#6B7884"),
    fillPath("M84,10 l14,3 l-3,14 l-14,-3 Z", C.white), line("M86,14 l10,2 M85,18 l8,1.6", C.concreteDark, 1), line("M92,30 V37 M89,34 l3,4 l3,-4", "ink", 1.6),
  ],
  "E-6": () => [
    sky("#F2D9A0"), circle(60, 22, 17, "#F0A83A"), circle(60, 22, 12, "#F6D272"), ...ground(48, "#C79A62"),
    line("M0,56 l14,-3 l8,5 l10,-6 l12,4 M70,54 l12,3 l10,-5 l12,4 M30,62 l12,-3 l8,5 M84,64 l10,-4 l8,3", C.soilDark, 1.3),
    line("M18,38 q4,-3 0,-6 t0,-6 M102,38 q4,-3 0,-6 t0,-6 M34,40 q4,-3 0,-6 t0,-6", "#E7863A", 1.6, 0.8), line("M60,56 V46 q0,-6 5,-8", C.leafDark, 1.8), fillPath("M65,38 q4,2 3,7 q-4,-1 -3,-7 Z", "#8A8A4A"),
  ],
};

/** Scene for a card: a Ravage gets its own, a Tool shares its biome's header, an Event has its own. */
export function sceneForCard(card: { type: string; id: string; biome?: string }): Shape[] | null {
  if (card.type === "ravage") return (RAVAGE[card.id] ?? BIOME[card.biome ?? ""] ?? (() => null))() ;
  if (card.type === "tool") return (BIOME[card.biome ?? ""] ?? (() => null))();
  if (card.type === "event") return EVENT[card.id]?.() ?? null;
  return null;
}
export const biomeScene = (biome: string): Shape[] | null => (BIOME[biome] ?? (() => null))();
export const SCENE_IDS = { biomes: Object.keys(BIOME), ravages: Object.keys(RAVAGE), events: Object.keys(EVENT) };

// ---- role emblems, drawn in a -10..10 box in ink on a round badge ------------------------------------------------------

export const ROLE_EMBLEMS: Record<string, Shape[]> = {
  ranger: [
    fillPath("M0,-9 L5,-2 L2.4,-2 L7,5 L1.4,5 L1.4,9 L-1.4,9 L-1.4,5 L-7,5 L-2.4,-2 L-5,-2 Z", "ink"),
    line("M-9,9 Q-4,6 0,9 T9,9", "ink", 1.2),
  ],
  ecologist: [
    line("M-6,8 C-6,-2 0,-8 8,-8 C8,0 2,8 -6,8 Z", "ink", 1.7), line("M-6,8 L2,0", "ink", 1.4), circle(-7.2, 8.4, 1.2, "ink"),
  ],
  engineer: [
    circle(0, 0, 5.2, "ink"), circle(0, 0, 2, "#F3ECDC"),
    line("M-8.4,0 H8.4 M-6,-6 L6,6 M6,-6 L-6,6", "ink", 2.6),
  ],
  courier: [
    rect(-8, -5, 16, 11, "ink"), fillPath("M-8,-5 L0,2 L8,-5 Z", "#F3ECDC"), line("M-8,-5 L0,2 L8,-5", "ink", 1.3),
  ],
  pilot: [
    fillPath("M-9,1 L9,-8 L4,8 L0,2 Z", "ink"), line("M0,2 L9,-8", "#F3ECDC", 1.1),
  ],
  activist: [
    fillPath("M-8,-2 L2,-6 L2,6 L-8,2 Z", "ink"), rect(-10, -2.4, 3, 4.8, "ink"), line("M5,-4 Q9,0 5,4 M7.4,-6 Q13,0 7.4,6", "ink", 1.3),
  ],
};
export const ROLE_IDS = Object.keys(ROLE_EMBLEMS);

// ---- the box-lid panorama: six biomes side by side, the board tipping from one end to the other ---------------------------

export const LID_W = 240;
export const LID_H = 90;
export function lidScene(): Shape[] {
  const out: Shape[] = [rect(0, 0, LID_W, LID_H, C.skyWarm), ...cloud(40, 18, 1.3), ...cloud(176, 24, 1), ...sun(210, 22, 8)];
  out.push(...mountain(34, 66, 70, 44, C.iceDark), ...mountain(66, 66, 60, 54, C.iceMid));
  out.push(fillPath("M0,66 Q30,56 60,64 T120,62 T180,64 T240,60 V90 H0 Z", C.leaf));
  [88, 98, 108, 118, 128].forEach((x, i) => out.push(...pine(x, 68 + (i % 2) * 2, 26 + (i % 3) * 4)));
  out.push(fillPath("M140,70 Q160,62 180,68 T240,66 V90 H140 Z", C.grass), ...wheat(150, 78, 8, 10), ...wheat(190, 78, 6, 12));
  out.push(rect(0, 76, LID_W, 14, C.water, 0.9), fillPath("M0,80 Q40,76 80,80 T160,80 T240,78 V90 H0 Z", C.waterDeep, 0.7));
  out.push(...coralFan(20, 88, 1.3), ...coralFan(52, 88, 1.1, "#E8957C"), ...reeds(104, 80, 6, 16), ...fish(170, 84, 1.1), ...fish(206, 82, 0.9, "#F6E7A8", true));
  return out;
}

/** The shape list as plain SVG markup. Used by tests and by anyone who wants to look at a scene outside the app. */
export function toSvg(shapes: Shape[], w: number, h: number, theme = { ink: "#1F2A30", danger: "#B5533C" }): string {
  const col = (c?: string) => (c === "ink" ? theme.ink : c === "danger" ? theme.danger : c);
  const parts = shapes.map((s) => {
    if (s.t === "rect") return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${col(s.f)}"${s.o != null ? ` fill-opacity="${s.o}"` : ""}/>`;
    if (s.t === "circle") return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${col(s.f)}"${s.o != null ? ` fill-opacity="${s.o}"` : ""}/>`;
    const f = s.f ? ` fill="${col(s.f)}"` : ` fill="none"`;
    const st = s.s ? ` stroke="${col(s.s)}" stroke-width="${s.w ?? 1.6}" stroke-linecap="round" stroke-linejoin="round"` : "";
    return `<path d="${s.d}"${f}${st}${s.o != null ? ` opacity="${s.o}"` : ""}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${parts.join("")}</svg>`;
}
