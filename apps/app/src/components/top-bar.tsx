import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { languageChoices } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import { useSelectedGroup } from "@/lib/group";
import { shareInvite } from "@/lib/invite";
import { useGroup, useGroups } from "@/lib/queries";
import { avatarColor, c } from "@/lib/theme";
import { CheckIcon, ChevronIcon, PlusIcon } from "./icons";
import { T } from "./ui";

type Menu = "group" | "profile" | null;

/**
 * Header for tab screens: group switcher on the left, profile menu on the right.
 * `left` replaces the group pill, e.g. with the live game's timer.
 */
export function TopBar({ left }: { left?: ReactNode }) {
  const { t, setChoice, choice } = useLanguage();
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
          <T size={12} weight="700" maxFontSizeMultiplier={1.3}>{initials(user?.name ?? "")}</T>
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
                style={[s.segment, choice === option && { backgroundColor: c.accent }]}
              >
                <T size={13} weight="700" numberOfLines={1} style={{ color: choice === option ? c.onAccent : "#c4b5fd" }}>{t.language[option]}</T>
              </Pressable>
            ))}
          </View>
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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.common.close} />
      <View style={[s.sheet, { top: insets.top + 62 }, side === "left" ? { left: 18 } : { right: 18 }]}>{children}</View>
    </Modal>
  );
}

const icons = {
  check: <CheckIcon color={c.muted} />,
  plus: <PlusIcon color={c.muted} />,
  chevron: <ChevronIcon direction="right" color={c.muted} />,
} as const;

/** Menu row. `icon` is decorative (check, plus, chevron), so it stays out of the spoken label. */
function Item({ children, onPress, icon, selected, danger, disabled }: {
  children: string;
  onPress: () => void;
  icon?: keyof typeof icons;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [s.item, disabled && { opacity: 0.4 }, pressed && { backgroundColor: c.faint }]}
    >
      <T numberOfLines={1} style={[s.label, danger && { color: c.neg }]}>{children}</T>
      {icon && <View style={s.slot} importantForAccessibility="no">{icons[icon]}</View>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 2 },
  pill: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: c.faint },
  pillContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  shrink: { flexShrink: 1 },
  me: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    width: 248,
    borderRadius: 22,
    padding: 8,
    backgroundColor: "rgba(36,31,56,0.97)",
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
  },
  who: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14 },
  slot: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  language: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  segments: { flexDirection: "row", gap: 4, padding: 3, borderRadius: 12, backgroundColor: c.faint },
  segment: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9 },
  label: { flex: 1 },
});
