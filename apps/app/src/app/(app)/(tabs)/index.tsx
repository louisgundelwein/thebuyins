import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BalanceChart } from "@/components/balance-chart";
import { ChevronIcon } from "@/components/icons";
import { TopBar } from "@/components/top-bar";
import { Avatar, Button, Chip, Heading, Hero, Loading, Row, Screen, T, toneOf } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { useSelectedGroup } from "@/lib/group";
import { useLanguage } from "@/lib/language";
import { useGroup, useGroups } from "@/lib/queries";
import { c } from "@/lib/theme";

const RANGES = [
  { key: "m1", days: 31 },
  { key: "m3", days: 92 },
  { key: "y1", days: 365 },
  { key: "all", days: Infinity },
] as const;
type Range = (typeof RANGES)[number]["key"];

const DAY = 86_400_000;
const date = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit" });

/** Overview tab: your balance as a stock-style chart, your game history and the group standings. */
export default function Overview() {
  const { t, locale, money, signedMoney } = useLanguage();
  const groups = useGroups();
  const { groupId } = useSelectedGroup();
  const page = useGroup(groupId);
  const [range, setRange] = useState<Range>("all");

  if (groups.isPending) return <Loading />;

  if (!groups.data?.length) {
    return (
      <Screen dock>
        <Hero style={{ marginTop: 40, gap: 10 }}>
          <T size={28} weight="800">{t.overview.welcome}</T>
          <T tone="muted">{t.overview.welcomeText}</T>
        </Hero>
        <Button title={t.overview.createGroup} onPress={() => router.push("/group/new")} />
        <Button title={t.topBar.join} variant="ghost" onPress={() => router.push("/join")} />
        <Button title={t.topBar.signOut} variant="ghost" onPress={() => authClient.signOut()} />
      </Screen>
    );
  }

  const data = page.data;
  const days = RANGES.find((r) => r.key === range)?.days ?? Infinity;
  const history = (data?.history ?? []).filter((h) => Date.now() - new Date(h.startedAt).getTime() <= days * DAY);
  let running = 0;
  const points = history.map((h) => (running += h.netCents));
  const last = history.at(-1);
  const nameOf = (memberId: string) => data?.members.find((m) => m.id === memberId);

  return (
    <Screen dock>
      <TopBar />

      <Hero>
        <T tone="muted" size={13}>{t.overview.balance}</T>
        <T size={40} weight="800" tone={toneOf(running)}>{signedMoney(running)}</T>
        {last ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ChevronIcon direction={last.netCents >= 0 ? "up" : "down"} size={12} color={last.netCents >= 0 ? c.pos : c.neg} />
            <T size={13} tone={toneOf(last.netCents)}>{money(Math.abs(last.netCents))}</T>
            <T size={13} tone="muted">{t.overview.lastGame}</T>
          </View>
        ) : (
          <T size={13} tone="muted">{t.overview.noGames}</T>
        )}
        <BalanceChart points={points} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          {RANGES.map((r) => (
            <Chip key={r.key} title={t.overview.ranges[r.key]} active={range === r.key} onPress={() => setRange(r.key)} />
          ))}
        </View>
      </Hero>

      {history.length > 0 && (
        <>
          <Heading title={t.overview.history} right={<T tone="muted" size={12}>{t.overview.games(history.length)}</T>} />
          {[...history].reverse().map((h) => (
            <Link key={h.gameId} href={`/game/${h.gameId}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={[h.title, date(h.startedAt, locale), t.overview.placeOf(h.rank, h.players), signedMoney(h.netCents)].join(", ")}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T>{h.title}</T>
                    <T tone="muted" size={12}>{date(h.startedAt, locale)} · {t.overview.placeOf(h.rank, h.players)}</T>
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
          <Heading title={t.overview.standings} />
          {data.standings.map((s) => {
            const m = nameOf(s.memberId);
            const name = m?.displayName ?? "?";
            return (
              <Row
                key={s.memberId}
                label={[name, t.overview.standingLine(s.games, s.wins), signedMoney(s.netCents)].join(", ")}
              >
                <Avatar id={s.memberId} name={name} guest={!m?.userId} />
                <View style={{ flex: 1 }}>
                  <T>{name}</T>
                  <T tone="muted" size={12}>{t.overview.standingLine(s.games, s.wins)}</T>
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
