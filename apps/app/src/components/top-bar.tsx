import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { useTheme } from "@/lib/appearance";
import { languageChoices } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import { useSelectedGroup } from "@/lib/group";
import { shareInvite } from "@/lib/invite";
import { useGroup, useGroups } from "@/lib/queries";
import { appearanceChoices, avatarColor, control, type Colors } from "@/lib/theme";
import { CheckIcon, ChevronIcon, PlusIcon } from "./icons";
import { Notice, T } from "./ui";

type Menu = "group" | "profile" | null;

/**
 * Header for tab screens: group switcher on the left, profile menu on the right.
 * `left` replaces the group pill, e.g. with the live game's timer.
 */
export function TopBar({ left }: { left?: ReactNode }) {
  const { t, setChoice, choice } = useLanguage();
  const appearance = useTheme();
  const { c } = appearance;
  const s = useMemo(() => createStyles(c), [c]);
  const [menu, setMenu] = useState<Menu>(null);
  const { groupId, setGroupId } = useSelectedGroup();
  const groups = useGroups();
  const page = useGroup(groupId);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const current = groups.data?.find((g) => g.id === groupId);
  const close = () => setMenu(null);
  const go = (href: "/group/new" | "/group/members" | "/join" | "/account" | "/archive") => {
    close();
    router.push(href);
  };

  return (
    <View style={s.bar}>
      {left ?? (
        <Pressable
          style={s.pill}
          onPress={() => setMenu("group")}
          accessibilityRole="button"
          accessibilityLabel={`${t.topBar.switchGroup}: ${current?.name ?? t.topBar.group}`}
          hitSlop={8}
        >
          <View style={s.pillContent}>
            <T size={13} weight="600" numberOfLines={1} style={s.shrink}>{current?.name ?? t.topBar.group}</T>
            <ChevronIcon direction="down" size={12} color={c.muted} />
          </View>
        </Pressable>
      )}
      <Pressable
        onPress={() => setMenu("profile")}
        accessibilityRole="button"
        accessibilityLabel={t.topBar.profile}
        hitSlop={6}
      >
        <View style={[s.me, { backgroundColor: avatarColor(user?.id ?? "") }]}>
          <T size={12} weight="700" maxFontSizeMultiplier={1.3} style={{ color: c.onAvatar }}>{initials(user?.name ?? "")}</T>
        </View>
      </Pressable>

      <Sheet open={menu === "group"} onClose={close} side="left">
        {groups.data?.map((g) => (
          <Item key={g.id} onPress={() => { setGroupId(g.id); close(); }} selected={g.id === groupId} icon={g.id === groupId ? "check" : undefined}>
            {g.name}
          </Item>
        ))}
        <Item onPress={() => go("/group/new")} icon="plus">{t.topBar.newGroup}</Item>
        <Item onPress={() => go("/join")} icon="chevron">{t.topBar.join}</Item>
        {page.data && <Item onPress={() => go("/group/members")} icon="chevron">{t.topBar.members}</Item>}
      </Sheet>

      <Sheet open={menu === "profile"} onClose={close} side="right">
        <View style={s.who}>
          <T weight="700" numberOfLines={1}>{user?.name}</T>
          <T tone="muted" size={12} numberOfLines={1}>{user?.email}</T>
        </View>
        {current && (
          // Shares while the menu is still open, then closes it. Dismissing the Modal first would
          // leave the share sheet with no presenting view controller on iOS.
          <Item disabled={!page.data} onPress={() => { if (page.data) void shareInvite(page.data.group, t).finally(close); }} icon="chevron">
            {t.topBar.invite(current.name)}
          </Item>
        )}
        <Item onPress={() => go("/group/new")} icon="plus">{t.topBar.newGroup}</Item>
        <Item onPress={() => go("/archive")} icon="chevron">{t.archive.title}</Item>
        <Item onPress={() => go("/account")} icon="chevron">{t.common.account}</Item>
        <View style={s.language}>
          <T tone="muted" size={12}>{t.language.title}</T>
          <View style={s.segments}>
            {languageChoices.map((option) => (
              <Pressable
                key={option}
                onPress={() => setChoice(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: choice === option }}
                aria-pressed={choice === option}
                style={[s.segment, choice === option && { backgroundColor: c.accent }]}
              >
                <T size={13} weight="700" style={{ color: choice === option ? c.onAccent : c.accentText }}>{t.language[option]}</T>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.language}>
          <T tone="muted" size={12}>{t.appearance.title}</T>
          <View style={s.segments}>
            {appearanceChoices.map((option) => (
              <Pressable
                key={option}
                onPress={() => { void appearance.setChoice(option); }}
                disabled={appearance.pending}
                accessibilityRole="button"
                accessibilityLabel={t.appearance[option]}
                accessibilityState={{ selected: appearance.choice === option, disabled: appearance.pending, busy: appearance.pending }}
                aria-pressed={appearance.choice === option}
                aria-disabled={appearance.pending}
                aria-busy={appearance.pending}
                style={[s.segment, appearance.choice === option && { backgroundColor: c.accent }]}
              >
                <T size={13} weight="700" style={{ color: appearance.choice === option ? c.onAccent : c.accentText }}>{t.appearance[option]}</T>
              </Pressable>
            ))}
          </View>
          {appearance.pending ? (
            <View accessibilityLiveRegion="polite"><T tone="muted" size={12}>{t.appearance.saving}</T></View>
          ) : appearance.choice === "system" ? (
            <T tone="muted" size={12}>{t.appearance.systemUsing(t.appearance[appearance.scheme])}</T>
          ) : null}
          {appearance.error && <View accessibilityLiveRegion="polite"><Notice>{t.appearance.saveFailed}</Notice></View>}
        </View>
        <Item onPress={() => { close(); void authClient.signOut(); }} danger>{t.topBar.signOut}</Item>
      </Sheet>
    </View>
  );
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/** Dropdown panel anchored under the header, over a dimmed backdrop. Edges line up with the page's 18 pt padding. */
function Sheet({ open, onClose, side, children }: { open: boolean; onClose: () => void; side: "left" | "right"; children: ReactNode }) {
  const { t } = useLanguage();
  const { c } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const top = insets.top + control.menuTop;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.common.close} />
      <ScrollView
        style={[
          s.sheet,
          { top, width: Math.min(control.menuWidth, width - control.menuInset * 2), maxHeight: Math.max(control.minHeight, height - top - insets.bottom - control.menuInset) },
          side === "left" ? { left: control.menuInset } : { right: control.menuInset },
        ]}
        contentContainerStyle={s.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Modal>
  );
}

/** Menu row. `icon` is decorative (check, plus, chevron), so it stays out of the spoken label. */
function Item({ children, onPress, icon, selected, danger, disabled }: {
  children: string;
  onPress: () => void;
  icon?: "check" | "plus" | "chevron";
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const icons = {
    check: <CheckIcon color={c.muted} />,
    plus: <PlusIcon color={c.muted} />,
    chevron: <ChevronIcon direction="right" color={c.muted} />,
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      aria-disabled={disabled}
      style={({ pressed }) => [s.item, disabled && { opacity: 0.4 }, pressed && { backgroundColor: c.faint }]}
    >
      <T numberOfLines={1} style={[s.label, danger && { color: c.neg }]}>{children}</T>
      {icon && <View style={s.slot} importantForAccessibility="no">{icons[icon]}</View>}
    </Pressable>
  );
}

/** Menu geometry with colours resolved from the current appearance. */
const createStyles = (c: Colors) => StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 2 },
  pill: { flexShrink: 1, minHeight: control.minHeight, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: c.faint },
  pillContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  shrink: { flexShrink: 1 },
  me: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.avatarBorder },
  backdrop: { backgroundColor: c.backdrop },
  sheet: {
    position: "absolute",
    width: control.menuWidth,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: c.sheet,
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: c.sheetShadow,
  },
  sheetContent: { padding: control.menuPadding },
  who: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  item: { minHeight: control.minHeight, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14 },
  slot: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  language: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  segments: { flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 3, borderRadius: 12, backgroundColor: c.faint },
  segment: { flexGrow: 1, flexShrink: 0, flexBasis: "auto", paddingHorizontal: control.menuPadding, minHeight: control.minHeight, alignItems: "center", justifyContent: "center", paddingVertical: 7, borderRadius: 9 },
  label: { flex: 1 },
});
