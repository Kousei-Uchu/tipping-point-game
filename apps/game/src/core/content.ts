// The one place the app touches the content and engine packages.
// Everything else imports from here, so swapping the content set later is a one-file change.
import { content } from "@tipping-point/content";
import type { BiomeId, Card, RoleCard, RoleId } from "@tipping-point/content";
import { createEngine } from "@tipping-point/engine";
import sourcesJson from "@tipping-point/content/data/sources.json";

export { content };
export const engine = createEngine(content);

export interface Source { id: string; title: string; url: string; short: string }
const sources = (sourcesJson as { sources: Source[] }).sources;
export const sourceById = (id: string | undefined): Source | undefined => sources.find((s) => s.id === id);

const cards = new Map<string, Card>(content.cards.map((c) => [c.id, c]));
export const cardById = (id: string): Card | undefined => cards.get(id);

const roles = new Map<RoleId, RoleCard>(content.roles.map((r) => [r.key, r]));
export const roleByKey = (k: RoleId): RoleCard => roles.get(k)!;

/** Roles with a button. Ranger and Engineer are always on. */
export const ACTIVE_ROLES: readonly RoleId[] = ["ecologist", "courier", "pilot", "activist"];
export const isActiveRole = (r: RoleId): boolean => ACTIVE_ROLES.includes(r);

export const biomeName = (b: BiomeId | "hub"): string => (b === "hub" ? content.hub.name : content.biomes[b].name);
