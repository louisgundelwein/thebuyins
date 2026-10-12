import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { avatarColor, c, radius } from "@/lib/theme";

/** Height kept free at the bottom of tab screens for the floating dock. */
export const DOCK_SPACE = 92;

/**
 * Scrollable page with the violet top glow. Content is capped in width so web stays phone-shaped.
 * Tab screens pass `dock` so content and footer stay above the floating tab bar.
 */
export function Screen({ children, footer, dock }: { children: ReactNode; footer?: ReactNode; dock?: boolean }) {
  return (
    <LinearGradient colors={[c.bgTop, c.bg]} locations={[0, 0.45]} style={s.fill}>
      <SafeAreaView style={[s.fill, dock && { paddingBottom: DOCK_SPACE }]} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.column}>{children}</View>
        </ScrollView>
        {footer ? <View style={[s.column, s.footer]}>{footer}</View> : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function T({ style, tone, size = 15, weight, ...rest }: TextProps & { tone?: "muted" | "pos" | "neg"; size?: number; weight?: "400" | "600" | "700" | "800" }) {
  const color = tone === "muted" ? c.muted : tone === "pos" ? c.pos : tone === "neg" ? c.neg : c.text;
  return <Text {...rest} style={[{ color, fontSize: size, fontWeight: weight, fontVariant: ["tabular-nums"] }, style]} />;
}

/** Colour a result: positive teal, negative rose, zero neutral. */
export const toneOf = (cents: number) => (cents > 0 ? "pos" : cents < 0 ? "neg" : undefined);

export function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={["rgba(167,139,250,0.2)", "rgba(167,139,250,0.03)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, style]}>
      {children}
    </LinearGradient>
  );
}

export function Tile({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "muted" }) {
  return (
    <View style={s.tile}>
      <T tone="muted" size={12}>{label}</T>
      <T size={20} weight="700" tone={tone} style={{ marginTop: 2 }}>{value}</T>
    </View>
  );
}

export const Row = ({ children, dim }: { children: ReactNode; dim?: boolean }) => (
  <View style={[s.row, dim && { opacity: 0.55 }]}>{children}</View>
);

/**
 * Member avatar. Accounts get a filled colour and a teal badge, guests a dashed outline,
 * so it's always visible who has their own login.
 */
export function Avatar({ id, name, guest, size = 34 }: { id: string; name: string; guest?: boolean; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        guest ? s.guest : { backgroundColor: avatarColor(id) },
      ]}
    >
      <T size={size > 40 ? 15 : 12} weight="700" tone={guest ? "muted" : undefined}>{initials}</T>
      {!guest && <View style={s.badge} />}
    </View>
  );
}

export function Button({ title, onPress, variant = "primary", disabled, loading }: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "soft";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg = variant === "primary" ? c.accent : variant === "soft" ? c.accentSoft : c.faint;
  const fg = variant === "primary" ? c.onAccent : variant === "soft" ? "#c4b5fd" : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

/** Small inline action, e.g. the "+20" rebuy chip. */
export function Chip({ title, onPress, active }: { title: string; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: c.accent }]}>
      <Text style={{ color: active ? c.onAccent : "#c4b5fd", fontWeight: "700", fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <T tone="muted" size={12}>{label}</T> : null}
      <TextInput placeholderTextColor="rgba(255,255,255,0.35)" {...rest} style={[s.field, style]} />
    </View>
  );
}

export const Heading = ({ title, right }: { title: string; right?: ReactNode }) => (
  <View style={s.heading}>
    <T size={15} weight="600">{title}</T>
    {right}
  </View>
);

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={s.notice}>
      <T size={13} style={{ color: c.warn }}>{children}</T>
    </View>
  );
}

export const Loading = () => (
  <Screen>
    <ActivityIndicator color={c.accent} style={{ marginTop: 80 }} />
  </Screen>
);

const s = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
  column: { width: "100%", maxWidth: 520, alignSelf: "center", gap: 10 },
  footer: { paddingHorizontal: 18, paddingBottom: 8, paddingTop: 4 },
  hero: { borderRadius: radius.hero, padding: 20, borderWidth: 1, borderColor: c.border, gap: 4 },
  tile: { flex: 1, backgroundColor: c.faint, borderRadius: radius.tile, padding: 14, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: radius.row, paddingVertical: 10, paddingHorizontal: 12 },
  avatar: { alignItems: "center", justifyContent: "center" },
  guest: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.4)" },
  badge: { position: "absolute", right: -2, bottom: -2, width: 13, height: 13, borderRadius: 7, backgroundColor: c.pos, borderWidth: 2, borderColor: c.bg },
  button: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: c.accentSoft },
  field: { height: 48, borderRadius: 14, backgroundColor: c.faint, borderWidth: 1, borderColor: c.border, color: c.text, paddingHorizontal: 14, fontSize: 16 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  notice: { borderRadius: 16, padding: 12, backgroundColor: c.warnSoft },
});
