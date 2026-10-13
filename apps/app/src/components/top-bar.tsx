import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { useSelectedGroup } from "@/lib/group";
import { t } from "@/lib/i18n";
import { shareInvite } from "@/lib/invite";
import { useGroup, useGroups } from "@/lib/queries";
import { avatarColor, c } from "@/lib/theme";
import { T } from "./ui";

type Menu = "group" | "profile" | null;

/**
 * Header for tab screens: group switcher on the left, profile menu on the right.
 * `left` replaces the group pill, e.g. with the live game's timer.
 */
export function TopBar({ left }: { left?: ReactNode }) {
  const [menu, setMenu] = useState<Menu>(null);
  const { groupId, setGroupId } = useSelectedGroup();
  const groups = useGroups();
  const page = useGroup(groupId);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const current = groups.data?.find((g) => g.id === groupId);
  const close = () => setMenu(null);
  const go = (href: "/group/new" | "/join" | "/account") => {
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
          <T size={13} weight="600">{current?.name ?? t.topBar.group} ▾</T>
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
          <Item key={g.id} onPress={() => { setGroupId(g.id); close(); }} selected={g.id === groupId} right={g.id === groupId ? "✓" : undefined}>
            {g.name}
          </Item>
        ))}
        <Item onPress={() => go("/group/new")} right="+">{t.topBar.newGroup}</Item>
        <Item onPress={() => go("/join")} right="›">{t.topBar.join}</Item>
      </Sheet>

      <Sheet open={menu === "profile"} onClose={close} side="right">
        <View style={s.who}>
          <T weight="700">{user?.name}</T>
          <T tone="muted" size={12}>{user?.email}</T>
        </View>
        {page.data && (
          <Item onPress={() => { close(); void shareInvite(page.data.group); }} right="›">
            {t.topBar.invite(page.data.group.name)}
          </Item>
        )}
        <Item onPress={() => go("/group/new")} right="+">{t.topBar.newGroup}</Item>
        <Item onPress={() => go("/account")} right="›">{t.common.account}</Item>
        <Item onPress={() => { close(); void authClient.signOut(); }} danger>{t.topBar.signOut}</Item>
      </Sheet>
    </View>
  );
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/** Dropdown panel anchored under the header, over a dimmed backdrop. */
function Sheet({ open, onClose, side, children }: { open: boolean; onClose: () => void; side: "left" | "right"; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t.common.close} />
      <View style={[s.sheet, { top: insets.top + 56 }, side === "left" ? { left: 14 } : { right: 14 }]}>{children}</View>
    </Modal>
  );
}

/** Menu row. `right` is a decorative glyph (check, chevron), so it stays out of the spoken label. */
function Item({ children, onPress, right, selected, danger }: { children: string; onPress: () => void; right?: string; selected?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.item, pressed && { backgroundColor: c.faint }]}
    >
      <T style={danger ? { color: c.neg } : undefined}>{children}</T>
      {right ? <T tone="muted" importantForAccessibility="no">{right}</T> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 2 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: c.faint },
  me: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    width: 240,
    borderRadius: 22,
    padding: 8,
    backgroundColor: "rgba(36,31,56,0.97)",
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
  },
  who: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  item: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14 },
});
