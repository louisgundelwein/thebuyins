import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { useLanguage } from "@/lib/language";
import { c } from "@/lib/theme";

/**
 * Stock-style area chart of a running balance. `points` are cumulative cents, one per game;
 * a leading 0 is added so the line starts at the baseline. Colour follows the final sign.
 */
export function BalanceChart({ points, height = 120 }: { points: readonly number[]; height?: number }) {
  const { t, signedMoney } = useLanguage();
  const [width, setWidth] = useState(0);
  const values = [0, ...points];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const pad = 8;
  const x = (i: number) => (values.length < 2 ? 0 : (width * i) / (values.length - 1));
  const y = (v: number) => pad + (height - 2 * pad) * (1 - (v - min) / span);
  const color = (values.at(-1) ?? 0) >= 0 ? c.pos : c.neg;

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = values.length - 1;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.chart.balance(signedMoney(values.at(-1) ?? 0))}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
          {values.length > 1 && (
            <>
              <Path d={area} fill="url(#fill)" />
              <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              <Circle cx={Math.min(x(last), width - 4)} cy={y(values[last] ?? 0)} r={4} fill={color} />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
