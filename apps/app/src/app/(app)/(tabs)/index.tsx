import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BalanceChart } from "@/components/balance-chart";
import { TopBar } from "@/components/top-bar";
import { Avatar, Button, Chip, Heading, Hero, Loading, Row, Screen, T, toneOf } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { useSelectedGroup } from "@/lib/group";
import { money, signedMoney } from "@/lib/money";
import { useGroup, useGroups } from "@/lib/queries";

const RANGES = [
  { label: "1M", days: 31 },
  { label: "3M", days: 92 },
  { label: "1J", days: 365 },
  { label: "Alles", days: Infinity },
] as const;
type Range = (typeof RANGES)[number]["label"];

const DAY = 86_400_000;
const date = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

/** Overview tab: your balance as a stock-style chart, your game history and the group standings. */
export default function Overview() {
  const groups = useGroups();
  const { groupId } = useSelectedGroup();
  const page = useGroup(groupId);
  const [range, setRange] = useState<Range>("Alles");

  if (groups.isPending) return <Loading />;

  if (!groups.data?.length) {
    return (
      <Screen dock>
        <Hero style={{ marginTop: 40, gap: 10 }}>
          <T size={28} weight="800">Willkommen</T>
          <T tone="muted">Leg eine Gruppe für deine Runde an oder tritt mit einem Code bei.</T>
        </Hero>
        <Button title="Gruppe erstellen" onPress={() => router.push("/group/new")} />
        <Button title="Mit Code beitreten" variant="ghost" onPress={() => router.push("/join")} />
        <Button title="Ausloggen" variant="ghost" onPress={() => authClient.signOut()} />
      </Screen>
    );
  }

  const data = page.data;
  const days = RANGES.find((r) => r.label === range)?.days ?? Infinity;
  const history = (data?.history ?? []).filter((h) => Date.now() - new Date(h.startedAt).getTime() <= days * DAY);
  let running = 0;
  const points = history.map((h) => (running += h.netCents));
  const last = history.at(-1);
  const nameOf = (memberId: string) => data?.members.find((m) => m.id === memberId);

  return (
    <Screen dock>
      <TopBar />

      <Hero>
        <T tone="muted" size={13}>Dein Saldo</T>
        <T size={40} weight="800" tone={toneOf(running)}>{signedMoney(running)}</T>
        <T size={13} tone="muted">
          {last ? (
            <>
              <T size={13} tone={toneOf(last.netCents)}>{last.netCents >= 0 ? "▲" : "▼"} {money(Math.abs(last.netCents))}</T> letztes Spiel
            </>
          ) : (
            "Noch keine abgeschlossenen Spiele"
          )}
        </T>
        <BalanceChart points={points} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          {RANGES.map((r) => <Chip key={r.label} title={r.label} active={range === r.label} onPress={() => setRange(r.label)} />)}
        </View>
      </Hero>

      {history.length > 0 && (
        <>
          <Heading title="Historie" right={<T tone="muted" size={12}>{history.length} Spiele</T>} />
          {[...history].reverse().map((h) => (
            <Link key={h.gameId} href={`/game/${h.gameId}`} asChild>
              <Pressable>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T>{h.title}</T>
                    <T tone="muted" size={12}>{date(h.startedAt)} · Platz {h.rank} von {h.players}</T>
                  </View>
                  <T weight="700" tone={toneOf(h.netCents)}>{signedMoney(h.netCents)}</T>
                </Row>
              </Pressable>
            </Link>
          ))}
        </>
      )}

      {data && data.standings.length > 0 && (
        <>
          <Heading title="Rangliste" />
          {data.standings.map((s) => {
            const m = nameOf(s.memberId);
            return (
              <Row key={s.memberId}>
                <Avatar id={s.memberId} name={m?.displayName ?? "?"} guest={!m?.userId} />
                <View style={{ flex: 1 }}>
                  <T>{m?.displayName}</T>
                  <T tone="muted" size={12}>{s.games} Spiele · {s.wins} im Plus</T>
                </View>
                <T weight="700" tone={toneOf(s.netCents)}>{signedMoney(s.netCents)}</T>
              </Row>
            );
          })}
        </>
      )}
    </Screen>
  );
}
