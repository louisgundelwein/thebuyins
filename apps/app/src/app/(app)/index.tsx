import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Avatar, Button, Chip, Heading, Hero, Loading, Row, Screen, T, Tile, toneOf } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { money, signedMoney } from "@/lib/money";
import { useGroup, useGroups, type Season } from "@/lib/queries";

const THIS_YEAR = new Date().getFullYear();

/** Home: group switcher, your balance, live games, standings and past games. */
export default function Home() {
  const groups = useGroups();
  const [picked, setPicked] = useState<string>();
  const [season, setSeason] = useState<Season>(THIS_YEAR);
  const groupId = picked ?? groups.data?.[0]?.id;
  const page = useGroup(groupId, season);

  if (groups.isPending) return <Loading />;

  if (!groups.data?.length) {
    return (
      <Screen>
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
  const myRank = data ? data.standings.findIndex((s) => s.memberId === data.me.id) : -1;
  const mine = data?.standings[myRank];
  const nameOf = (memberId: string) => data?.members.find((m) => m.id === memberId)?.displayName ?? "?";
  const live = data?.games.filter((g) => g.status === "live") ?? [];
  const finished = data?.games.filter((g) => g.status === "finished") ?? [];

  return (
    <Screen footer={groupId && <Button title="Neues Spiel" onPress={() => router.push({ pathname: "/game/new", params: { groupId } })} />}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        {groups.data.map((g) => (
          <Chip key={g.id} title={g.name} active={g.id === groupId} onPress={() => setPicked(g.id)} />
        ))}
        <Chip title="+" onPress={() => router.push("/group/new")} />
        <Chip title="Beitreten" onPress={() => router.push("/join")} />
      </View>

      <Hero>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T tone="muted">Dein Saldo {season === "all" ? "gesamt" : season}</T>
          <Pressable onPress={() => setSeason(season === "all" ? THIS_YEAR : "all")}>
            <T size={13} style={{ color: "#c4b5fd" }}>{season === "all" ? THIS_YEAR : "Gesamt"} ›</T>
          </Pressable>
        </View>
        <T size={44} weight="800" tone={toneOf(mine?.netCents ?? 0)}>{signedMoney(mine?.netCents ?? 0)}</T>
        <T tone="muted" size={13}>
          {mine ? `#${myRank + 1} von ${data?.standings.length} · ${mine.games} Spiele · Bestes Spiel ${signedMoney(mine.bestCents)}` : "Noch keine abgeschlossenen Spiele"}
        </T>
      </Hero>

      {mine && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Tile label="Gewinnquote" value={`${Math.round((mine.wins / mine.games) * 100)} %`} />
          <Tile label="Ø pro Abend" value={signedMoney(Math.round(mine.netCents / mine.games))} tone={toneOf(mine.netCents)} />
        </View>
      )}

      {live.map((g) => (
        <Link key={g.id} href={`/game/${g.id}`} asChild>
          <Pressable>
            <Row>
              <T style={{ color: "#5eead4" }}>●</T>
              <View style={{ flex: 1 }}>
                <T weight="600">{g.title}</T>
                <T tone="muted" size={12}>Live · Buy-in {money(g.buyInCents)}</T>
              </View>
              <T tone="muted">›</T>
            </Row>
          </Pressable>
        </Link>
      ))}

      {data && data.standings.length > 0 && (
        <>
          <Heading title="Rangliste" />
          {data.standings.map((s) => (
            <Row key={s.memberId}>
              <Avatar id={s.memberId} name={nameOf(s.memberId)} />
              <View style={{ flex: 1 }}>
                <T>{nameOf(s.memberId)}</T>
                <T tone="muted" size={12}>{s.games} Spiele · {s.wins} im Plus</T>
              </View>
              <T weight="700" tone={toneOf(s.netCents)}>{signedMoney(s.netCents)}</T>
            </Row>
          ))}
        </>
      )}

      {finished.length > 0 && (
        <>
          <Heading title="Spiele" />
          {finished.map((g) => (
            <Link key={g.id} href={`/game/${g.id}`} asChild>
              <Pressable>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T>{g.title}</T>
                    <T tone="muted" size={12}>{new Date(g.startedAt).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</T>
                  </View>
                  <T tone="muted">›</T>
                </Row>
              </Pressable>
            </Link>
          ))}
        </>
      )}

      {data && (
        <>
          <Heading title="Einladen" />
          <Row>
            <View style={{ flex: 1 }}>
              <T tone="muted" size={12}>Code für {data.group.name}</T>
              <T size={22} weight="800" style={{ letterSpacing: 3 }}>{data.group.inviteCode}</T>
            </View>
            <Chip title="Teilen" onPress={() => Share.share({ message: `Komm in unsere Pokerrunde "${data.group.name}": Code ${data.group.inviteCode}` })} />
          </Row>
        </>
      )}

      <Button title="Ausloggen" variant="ghost" onPress={() => authClient.signOut()} />
    </Screen>
  );
}
