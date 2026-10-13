import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SeatingTable } from "@/components/seating-table";
import { Avatar, Button, Chip, Field, Loading, Notice, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { t, locale } from "@/lib/i18n";
import { shareInvite } from "@/lib/invite";
import { money, parseCents } from "@/lib/money";
import { useGroup } from "@/lib/queries";
import { c } from "@/lib/theme";

/** Fisher–Yates shuffle into a new array. */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Splits a list into rows of `size`, so the tile grid can use plain flex rows. */
const chunk = <T,>(items: readonly T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/**
 * Two steps: pick who's playing (adding guests on the fly), then draw seats around the table.
 * Starting sends the drawn order; the server seats players in that order and seat 1 deals first.
 */
export default function NewGame() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const page = useGroup(groupId);
  const qc = useQueryClient();
  const [title, setTitle] = useState(() => t.newGame.defaultTitle(new Date().toLocaleDateString(locale, { weekday: "long" })));
  const [buyIn, setBuyIn] = useState<string>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [guest, setGuest] = useState<string>();
  const [order, setOrder] = useState<readonly string[]>();
  const [copied, setCopied] = useState(false);

  const addGuest = useMutation({
    mutationFn: (displayName: string) =>
      parseResponse(api.groups[":groupId"].members.$post({ param: { groupId }, json: { displayName } })),
    onSuccess: async (m) => {
      setGuest(undefined);
      setSelected((s) => new Set(s).add(m.id));
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });

  const start = useMutation({
    mutationFn: ({ buyInCents, memberIds }: { buyInCents: number; memberIds: string[] }) =>
      parseResponse(api.groups[":groupId"].games.$post({ param: { groupId }, json: { title, buyInCents, memberIds } })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      router.replace("/live");
    },
  });

  if (!page.data) return <Loading />;
  const { group, me, members } = page.data;
  const cents = parseCents(buyIn ?? String(group.defaultBuyInCents / 100));
  const byName = (a: { displayName: string }, b: { displayName: string }) => a.displayName.localeCompare(b.displayName, "de");
  const sorted = [
    ...members.filter((m) => m.id === me.id),
    ...members.filter((m) => m.id !== me.id && m.userId !== null).sort(byName),
    ...members.filter((m) => m.userId === null).sort(byName),
  ];
  const submitGuest = () => {
    const name = guest?.trim();
    if (name) addGuest.mutate(name);
  };

  if (order && cents) {
    const seats = order.flatMap((id) => {
      const m = members.find((x) => x.id === id);
      return m ? [{ id, name: m.displayName, guest: m.userId === null }] : [];
    });
    return (
      <Screen
        footer={
          <View style={s.footer}>
            <View style={{ flex: 1 }}>
              <Button title={t.newGame.redraw} variant="ghost" onPress={() => setOrder(shuffle(order))} />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                title={t.newGame.start}
                loading={start.isPending}
                onPress={() => start.mutate({ buyInCents: cents, memberIds: [...order] })}
              />
            </View>
          </View>
        }
      >
        <View style={s.top}>
          <T size={22} weight="800">{t.newGame.seats}</T>
          <Chip title={t.common.back} onPress={() => setOrder(undefined)} />
        </View>
        <SeatingTable seats={seats} />
        {start.isError && <Notice>{start.error.message}</Notice>}
      </Screen>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const guestNames = sorted.filter((m) => m.userId === null && selected.has(m.id)).map((m) => m.displayName);
  const tiles = [...sorted.map((m) => m.id), "add"];

  return (
    <Screen
      footer={
        <Button
          title={t.newGame.draw}
          disabled={selected.size < 2 || !cents || !title.trim()}
          onPress={() => setOrder(shuffle(sorted.filter((m) => selected.has(m.id)).map((m) => m.id)))}
        />
      }
    >
      <View style={s.top}>
        <T size={22} weight="800">{t.newGame.whoPlays}</T>
        <T tone="muted">{selected.size} · {cents ? money(selected.size * cents) : "?"}</T>
      </View>
      <View style={s.fields}>
        <View style={{ flex: 2 }}>
          <Field value={title} onChangeText={setTitle} placeholder={t.newGame.title} />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            value={buyIn ?? String(group.defaultBuyInCents / 100)}
            onChangeText={setBuyIn}
            keyboardType="decimal-pad"
            placeholder={t.newGame.buyIn}
          />
        </View>
      </View>

      {chunk(tiles, 3).map((row, r) => (
        <View key={r} style={s.gridRow}>
          {[0, 1, 2].map((col) => {
            const id = row[col];
            const m = sorted.find((x) => x.id === id);
            if (id === "add")
              return (
                <Pressable
                  key="add"
                  style={[s.tile, s.addTile]}
                  onPress={() => setGuest((g) => (g === undefined ? "" : undefined))}
                  accessibilityRole="button"
                  accessibilityLabel={t.newGame.addGuest}
                >
                  <Avatar id="add" name="+" guest size={46} />
                  <T tone="muted">{t.common.guest}</T>
                </Pressable>
              );
            if (!m) return <View key={`empty-${col}`} style={{ flex: 1 }} />;
            const on = selected.has(m.id);
            const isMe = m.id === me.id;
            const isGuest = m.userId === null;
            const tag = isMe ? t.common.you : isGuest ? t.common.guest : t.common.account;
            return (
              <Pressable
                key={m.id}
                style={[s.tile, on ? s.tileOn : s.tileOff]}
                onPress={() => toggle(m.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${m.displayName}, ${tag}`}
              >
                <Avatar id={m.id} name={m.displayName} guest={isGuest} size={46} />
                <T numberOfLines={1}>{m.displayName}</T>
                <View style={[s.tag, !isGuest && s.tagAccount]}>
                  <T size={10} weight="600" style={{ color: isGuest ? c.muted : c.pos }}>
                    {tag}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {guest !== undefined && (
        <View style={s.fields}>
          <View style={{ flex: 1 }}>
            <Field value={guest} onChangeText={setGuest} placeholder={t.common.name} autoFocus onSubmitEditing={submitGuest} />
          </View>
          <Chip title={addGuest.isPending ? "…" : t.common.add} onPress={submitGuest} />
        </View>
      )}

      {guestNames.length > 0 && (
        <View style={s.hint}>
          <T size={13}>
            {t.newGame.guestsNoAccount(t.common.names(guestNames), guestNames.length > 1)}{" "}
            <T
              size={13}
              weight="700"
              style={{ color: "#c4b5fd" }}
              onPress={() => void shareInvite(group).then((r) => setCopied(r === "copied"))}
            >
              {copied ? t.newGame.linkCopied : t.newGame.shareInvite}
            </T>
            , {t.newGame.takeOver(guestNames.length > 1)}
          </T>
        </View>
      )}
      {addGuest.isError && <Notice>{addGuest.error.message}</Notice>}
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 48, marginBottom: 2 },
  fields: { flexDirection: "row", gap: 8, alignItems: "center" },
  footer: { flexDirection: "row", gap: 10 },
  gridRow: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, borderWidth: 2 },
  tileOn: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: c.accent },
  tileOff: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "transparent", opacity: 0.5 },
  addTile: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.15)" },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: c.faint },
  tagAccount: { backgroundColor: "rgba(94,234,212,0.14)" },
  hint: { borderRadius: 18, padding: 12, backgroundColor: c.accentSoft, marginTop: 2 },
});
