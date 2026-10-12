import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { View } from "react-native";
import { Button, Chip, Field, Heading, Loading, Notice, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { money, parseCents } from "@/lib/money";
import { useGroup } from "@/lib/queries";

/** Pick who's playing (adding guests on the fly) and start the table. */
export default function NewGame() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const page = useGroup(groupId);
  const qc = useQueryClient();
  const [title, setTitle] = useState(() => `${new Date().toLocaleDateString("de-DE", { weekday: "long" })}abend`);
  const [buyIn, setBuyIn] = useState<string>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [guest, setGuest] = useState("");

  const addGuest = useMutation({
    mutationFn: () => parseResponse(api.groups[":groupId"].members.$post({ param: { groupId }, json: { displayName: guest } })),
    onSuccess: async (m) => {
      setGuest("");
      setSelected((s) => new Set(s).add(m.id));
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });

  const start = useMutation({
    mutationFn: (buyInCents: number) =>
      parseResponse(api.groups[":groupId"].games.$post({ param: { groupId }, json: { title, buyInCents, memberIds: [...selected] } })),
    onSuccess: (game) => router.replace(`/game/${game.id}`),
  });

  if (!page.data) return <Loading />;
  const cents = parseCents(buyIn ?? String(page.data.group.defaultBuyInCents / 100));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <Screen
      footer={
        <Button
          title={cents ? `Starten · ${selected.size} × ${money(cents)}` : "Starten"}
          disabled={selected.size < 2 || !cents || !title.trim()}
          loading={start.isPending}
          onPress={() => cents && start.mutate(cents)}
        />
      }
    >
      <T size={28} weight="800" style={{ marginTop: 48 }}>Neues Spiel</T>
      <Field label="Titel" value={title} onChangeText={setTitle} />
      <Field label="Buy-in in €" value={buyIn ?? String(page.data.group.defaultBuyInCents / 100)} onChangeText={setBuyIn} keyboardType="decimal-pad" />

      <Heading title="Wer spielt mit?" right={<T tone="muted">{selected.size}</T>} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {page.data.members.map((m) => (
          <Chip key={m.id} title={m.displayName} active={selected.has(m.id)} onPress={() => toggle(m.id)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Field value={guest} onChangeText={setGuest} placeholder="Gast hinzufügen" onSubmitEditing={() => guest.trim() && addGuest.mutate()} />
        </View>
        <Chip title="+" onPress={() => guest.trim() && addGuest.mutate()} />
      </View>
      {start.isError && <Notice>{start.error.message}</Notice>}
    </Screen>
  );
}
