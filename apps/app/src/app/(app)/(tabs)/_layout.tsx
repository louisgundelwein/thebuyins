import { router, Tabs } from "expo-router";
import { useMemo, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChartIcon, ChipIcon } from "@/components/icons";
import { useSelectedGroup } from "@/lib/group";
import { useLanguage } from "@/lib/language";
import { useGroup } from "@/lib/queries";
import { control, type Colors } from "@/lib/theme";
import { useTheme } from "@/lib/appearance";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export default function TabsLayout() {
  const { t } = useLanguage();
  const { c } = useTheme();
  return (
    <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: t.tab.overview }} />
      <Tabs.Screen name="live" options={{ title: t.tab.live }} />
    </Tabs>
  );
}

/** Floating glass dock: overview, a raised plus for a new game, and Live with a dot while a game runs. */
function Dock({ state, navigation }: TabBarProps) {
  const { t } = useLanguage();
  const { c } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { groupId } = useSelectedGroup();
  const page = useGroup(groupId);
  const hasLive = page.data?.games.some((g) => g.status === "live") ?? false;
  const active = state.routes[state.index]?.name;

  const tab = (name: "index" | "live", label: string, Icon: typeof ChartIcon, dot = false) => {
    const on = active === name;
    return (
      <Pressable
        style={s.tab}
        onPress={() => navigation.navigate(name)}
        accessibilityRole="tab"
        accessibilityLabel={dot ? `${label}, ${t.tab.running}` : label}
        accessibilityState={{ selected: on }}
        aria-selected={on}
      >
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <Icon color={on ? c.accent : c.muted} />
          {dot && <View style={s.dot} />}
        </View>
        <Text maxFontSizeMultiplier={1.4} style={[s.label, on && { color: c.text }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[s.dock, { bottom: Math.max(insets.bottom, 12) + 4 }]} pointerEvents="box-none">
      {tab("index", t.tab.overview, ChartIcon)}
      <Pressable
        style={({ pressed }) => [s.plus, pressed && { opacity: 0.85 }]}
        disabled={!groupId}
        onPress={() => groupId && router.push({ pathname: "/game/new", params: { groupId } })}
        accessibilityRole="button"
        accessibilityLabel={t.tab.newGame}
        accessibilityState={{ disabled: !groupId }}
        aria-disabled={!groupId}
      >
        <Text style={s.plusText} importantForAccessibility="no">+</Text>
      </Pressable>
      {tab("live", t.tab.live, ChipIcon, hasLive)}
    </View>
  );
}

/** Floating dock geometry with appearance-specific surfaces. */
const createStyles = (c: Colors) => StyleSheet.create({
  dock: {
    position: "absolute",
    alignSelf: "center",
    width: "92%",
    maxWidth: 420,
    height: 66,
    borderRadius: 26,
    backgroundColor: c.dock,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: c.dockShadow,
  },
  tab: { width: 90, minHeight: control.minHeight, alignItems: "center", justifyContent: "center", gap: 4 },
  dot: { position: "absolute", right: -3, top: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: c.pos, borderWidth: 2, borderColor: c.dock },
  label: { fontSize: 11, color: c.muted, fontWeight: "600" },
  plus: {
    width: 58,
    height: 58,
    marginTop: -26,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: c.plusShadow,
  },
  plusText: { color: c.onAccent, fontSize: 30, fontWeight: "500", marginTop: -2 },
});
