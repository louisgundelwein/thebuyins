import type { ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";

type IconProps = { color: string; size?: number };

/** Rising line, used for the overview tab. */
export const ChartIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 17l5-5 4 3 8-8" />
    <Path d="M15 7h5v5" />
  </Svg>
);

/** Poker chip, used for the live game tab. */
export const ChipIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Circle cx={12} cy={12} r={9} />
    <Circle cx={12} cy={12} r={4} />
    <Path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </Svg>
);

type GlyphProps = IconProps & { strokeWidth?: number };

/** Stroked glyph on a 16 pt box, so menus and chips share one icon weight. */
const Glyph = ({ color, size = 16, strokeWidth = 2, children }: GlyphProps & { children: ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

export const ChevronIcon = ({ direction, ...props }: GlyphProps & { direction: "up" | "down" | "left" | "right" }) => {
  const d = { up: "M4 10l4-4 4 4", down: "M4 6l4 4 4-4", left: "M10 4l-4 4 4 4", right: "M6 4l4 4-4 4" }[direction];
  return <Glyph {...props}><Path d={d} /></Glyph>;
};

export const CheckIcon = (props: GlyphProps) => (
  <Glyph {...props}><Path d="M3.5 8.5l3 3 6-6.5" /></Glyph>
);

export const PlusIcon = (props: GlyphProps) => (
  <Glyph {...props}><Path d="M8 3v10M3 8h10" /></Glyph>
);

export const CloseIcon = (props: GlyphProps) => (
  <Glyph {...props}><Path d="M4 4l8 8M12 4l-8 8" /></Glyph>
);
