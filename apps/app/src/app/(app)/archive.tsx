import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Loading, Notice, PAGE_TOP, Row, Screen, T, toneOf } from "@/components/ui";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { keys, useArchive } from "@/lib/queries";

/** Finished games from groups you left. Opening one shows the read-only result; removing one only hides it for you. */
export default function Archive() {
  const { t, locale, signedMoney } = useLanguage();
  const archive = useArchive();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string>();

  const hide = useMutation({
    mutationFn: (gameId: string) => parseResponse(api.games[":gameId"].hide.$post({ param: { gameId } })),
    onSuccess: (_, gameId) => {
      setConfirmId(undefined);
      qc.removeQueries({ queryKey: keys.game(gameId) });
      void qc.invalidateQueries({ queryKey: keys.archive });
    },
  });

  if (archive.isPending) return <Loading />;

  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.archive.title}</T>
      <T tone="muted" size={13}>{t.archive.hint}</T>
      {archive.data?.length === 0 && <T tone="muted" style={{ marginTop: 12 }}>{t.archive.empty}</T>}
      {archive.data?.map((h) => (
        <Row key={h.gameId}>
          <Pressable
            onPress={() => router.push(`/game/${h.gameId}`)}
            accessibilityRole="button"
            style={{ flex: 1 }}
          >
            <T>{h.title}</T>
            <T tone="muted" size={12}>
              {h.groupName} · {new Date(h.startedAt).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit" })} · {t.overview.placeOf(h.rank, h.players)}
            </T>
          </Pressable>
          <T weight="700" tone={toneOf(h.netCents)}>{signedMoney(h.netCents)}</T>
          {confirmId === h.gameId ? (
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Pressable onPress={() => hide.mutate(h.gameId)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.archive.removeLabel(h.title)}>
                <T tone="neg" size={13} weight="700">{t.archive.removeConfirm}</T>
              </Pressable>
              <Pressable onPress={() => setConfirmId(undefined)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.common.cancel}>
                <T tone="muted" size={13}>{t.common.cancel}</T>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmId(h.gameId)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.archive.removeLabel(h.title)}>
              <T tone="neg" size={13} weight="600">{t.archive.remove}</T>
            </Pressable>
          )}
        </Row>
      ))}
      {hide.isError && <Notice>{hide.error.message}</Notice>}
    </Screen>
  );
}
