import React from "react";
import { Label } from "./Label";

/** A status word on a tag. For a counter with a number, use TokenChip. */
export function Chip({ label, tone = "neutral", off }: { label: string; tone?: "neutral" | "good" | "bad"; off?: boolean }) {
  return <Label text={label} tone={tone} off={off} />;
}
