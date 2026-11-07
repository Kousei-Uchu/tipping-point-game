import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useSettings } from "../app/SettingsProvider";
import { colors, fonts, fontState, type, type TypeVariant } from "../theme/tokens";

interface Props extends TextProps {
  variant?: TypeVariant;
  color?: string;
  center?: boolean;
  /** Fixed-size print (px at 100% text size), for things drawn at a set size such as a card. Overrides the variant's size. */
  size?: number;
  /** Cap on the text-size setting for this text. A card is a fixed object, so its print stops growing at this; the same words are in the panels beside it. */
  maxScale?: number;
}

function familyFor(variant: TypeVariant, weight: string): string | undefined {
  if (!fontState.custom) return undefined;
  if (variant === "display" || variant === "title") return fonts.display;
  if (variant === "stamp") return fonts.stamp;
  return parseInt(weight, 10) >= 600 ? fonts.bodyBold : fonts.body;
}

/** Every piece of text in the app goes through this, so the text size setting reaches all of it. */
export function Text({ variant = "body", color = colors.ink, center, size, maxScale, style, ...rest }: Props) {
  const { settings } = useSettings();
  const t = type[variant];
  const family = familyFor(variant, t.weight);
  const scale = maxScale ? Math.min(settings.textScale, maxScale) : settings.textScale;
  const px = size ?? t.size;
  const base: TextStyle = {
    fontSize: Math.round(px * scale),
    lineHeight: Math.round((size ? size * 1.25 : t.line) * scale),
    // A named custom family already is the weight; asking for bold on top fakes it twice on web.
    fontWeight: family ? "normal" : t.weight,
    color,
    fontFamily: family,
    textAlign: center ? "center" : undefined,
    ...(variant === "stamp" ? { textTransform: "uppercase" as const, letterSpacing: 1 } : null),
  };
  return <RNText {...rest} style={[base, style]} />;
}
