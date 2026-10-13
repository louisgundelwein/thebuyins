import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/lib/language";
import { avatarColor, c, radius } from "@/lib/theme";
import { CloseIcon } from "./icons";

/** Height kept free at the bottom of tab screens for the floating dock. Content scrolls up to it. */
export const DOCK_SPACE = 92;

/** Top offset of page titles under the transparent stack header, so every screen's title lines up. */
export const PAGE_TOP = 48;

/**
 * Scrollable page with the violet top glow. Content is capped in width so web stays phone-shaped.
 * Tab screens pass `dock` so content scrolls up to the floating tab bar; a footer then sits above
 * the dock instead. The footer stays pinned and lifts above the keyboard.
 */
export function Screen({ children, footer, dock }: { children: ReactNode; footer?: ReactNode; dock?: boolean }) {
  // Modal sheets report a zero bottom inset, so keep the footer clear of the home indicator anyway.
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[c.bgTop, c.bg]} locations={[0, 0.45]} style={s.fill}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={s.fill} edges={["top", "bottom"]}>
          <ScrollView contentContainerStyle={[s.scroll, dock && !footer && { paddingBottom: DOCK_SPACE }]} keyboardShouldPersistTaps="handled">
            <View style={s.column}>{children}</View>
          </ScrollView>
          {footer ? <View style={[s.column, s.footer, { paddingBottom: dock ? DOCK_SPACE : Math.max(insets.bottom, 24) }]}>{footer}</View> : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
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

/** List row. Pass `label` to read the whole row as one element, e.g. "Alex, 20 € buy-in, balance +25 €". */
export const Row = ({ children, dim, label }: { children: ReactNode; dim?: boolean; label?: string }) => (
  <View accessible={label !== undefined} accessibilityLabel={label} style={[s.row, dim && { opacity: 0.55 }]}>
    {children}
  </View>
);

/**
 * Member avatar. Accounts get a filled colour and a teal badge, guests a dashed outline,
 * so it's always visible who has their own login.
 */
export function Avatar({ id, name, guest, size = 34 }: { id: string; name: string; guest?: boolean; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        guest ? s.guest : { backgroundColor: avatarColor(id) },
      ]}
    >
      <T size={size > 40 ? 15 : 12} weight="700" tone={guest ? "muted" : undefined} maxFontSizeMultiplier={1.3}>{initials}</T>
      {!guest && <View style={s.badge} />}
    </View>
  );
}

export function Button({ title, onPress, variant = "primary", disabled, loading, selected }: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "soft";
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
}) {
  const { t } = useLanguage();
  // Disabled drops to a neutral fill with muted text, so the label stays readable.
  const bg = disabled ? c.faint : variant === "primary" ? c.accent : variant === "soft" ? c.accentSoft : c.faint;
  const fg = disabled ? c.muted : variant === "primary" ? c.onAccent : variant === "soft" ? "#c4b5fd" : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading, selected }}
      style={({ pressed }) => [s.button, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={fg} accessibilityLabel={t.common.loading} />
      ) : (
        <Text maxFontSizeMultiplier={1.6} style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}

/** Small inline action, e.g. the "+20" rebuy chip. `label` overrides the spoken title when it's cryptic. */
export function Chip({ title, label, onPress, active }: { title: string; label?: string; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[s.chip, active && { backgroundColor: c.accent }]}
    >
      <Text style={{ color: active ? c.onAccent : "#c4b5fd", fontWeight: "700", fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <T tone="muted" size={12}>{label}</T> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor="rgba(255,255,255,0.5)" {...rest} style={[s.field, style]} />
    </View>
  );
}

export const Heading = ({ title, right }: { title: string; right?: ReactNode }) => (
  <View style={s.heading}>
    <T size={15} weight="600">{title}</T>
    {right}
  </View>
);

/** Dismiss control for modals. Sits in the native header, so it gets the header's hit area. */
export function CloseButton({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={t.common.close}>
      <CloseIcon color={c.text} size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={s.notice}>
      <T size={13} style={{ color: c.warn }}>{children}</T>
    </View>
  );
}

export const Loading = () => {
  const { t } = useLanguage();
  return (
    <Screen>
      <ActivityIndicator color={c.accent} style={{ marginTop: 80 }} accessibilityLabel={t.common.loading} />
    </Screen>
  );
};

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
