import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";
import { useTheme } from "@/lib/appearance";

/** Design size from the mock; the whole table scales from this to the available width. */
const BASE_W = 300;
const BASE_H = 420;
const SEAT_W = 70;

/**
 * Oval poker table seen from above. Seats sit on an ellipse, clockwise from the top,
 * in the given order; seat 1 gets the dealer button.
 */
export function SeatingTable({ seats }: { seats: readonly { id: string; name: string; guest: boolean }[] }) {
  const { t } = useLanguage();
  const { c } = useTheme();
  const [width, setWidth] = useState(BASE_W);
  // Side seats stick out of the box by ~14px each, so leave room for them.
  const k = Math.min(width - 28, 320) / BASE_W;
  const w = BASE_W * k;
  const h = BASE_H * k;
  const avatar = Math.round(42 * Math.min(k, 1.1));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={s.wrap}>
      <View style={{ width: w, height: h }}>
        <LinearGradient
          colors={[c.tableFrom, c.tableTo, c.tableFrom]}
          locations={[0, 0.5, 1]}
          accessible
          accessibilityLabel={t.seating.seats(seats.length)}
          style={[s.felt, { borderColor: c.tableBorder, left: 60 * k, top: 84 * k, width: 180 * k, height: 260 * k, borderRadius: 90 * k }]}
        >
          <T size={28} weight="800">{seats.length}</T>
          <T tone="muted" size={12}>{t.seating.seatsShort}</T>
        </LinearGradient>

        {seats.map((seat, i) => {
          const a = -Math.PI / 2 + (2 * Math.PI * i) / seats.length;
          const cx = w / 2 + Math.cos(a) * 128 * k;
          const cy = h / 2 + Math.sin(a) * 196 * k;
          return (
            <View
              key={seat.id}
              accessible
              accessibilityLabel={`${seat.name}, ${t.seating.seat(i + 1)}${i === 0 ? `, ${t.seating.dealer}` : ""}`}
              style={[s.seat, { left: cx - SEAT_W / 2, top: cy - avatar / 2 - 7 }]}
            >
              <Avatar id={seat.id} name={seat.name} guest={seat.guest} size={avatar} />
              <T size={12} numberOfLines={1} maxFontSizeMultiplier={1.3}>{seat.name}</T>
              <T tone="muted" size={10} maxFontSizeMultiplier={1.3}>{t.seating.seat(i + 1)}</T>
              {i === 0 && (
                <View style={[s.dealer, { backgroundColor: c.dealer, left: SEAT_W / 2 + avatar / 2 - 4, top: avatar - 14 }]}>
                  <T size={11} weight="800" style={{ color: c.onDealer }} maxFontSizeMultiplier={1.3} importantForAccessibility="no">D</T>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", marginTop: 8 },
  felt: { position: "absolute", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  seat: { position: "absolute", width: SEAT_W, alignItems: "center", gap: 3 },
  dealer: { position: "absolute", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
