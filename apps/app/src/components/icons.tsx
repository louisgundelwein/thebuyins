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
