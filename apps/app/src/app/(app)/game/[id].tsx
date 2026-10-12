import { useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Avatar, Button, Chip, Field, Heading, Hero, Loading, Notice, Row, Screen, T, Tile, toneOf } from "@/components/ui";
import { api, type GameState } from "@/lib/api";
import { money, parseCents, signedMoney } from "@/lib/money";
import { useGame, useGameMutation, useGroup } from "@/lib/queries";
import { c } from "@/lib/theme";

/** One game: live table with rebuys, then chip count and settlement, then the final result. */
export default function Game() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const [settling, setSettling] = useState(false);

  if (!game.data) return <Loading />;
  if (game.data.game.status === "finished") return <Result state={game.data} />;
  return settling ? <Settle state={game.data} onBack={() => setSettling(false)} /> : <Table state={game.data} onSettle={() => setSettling(true)} />;
}

function useTotals(state: GameState) {
  const bySeat = (seatId: string) => state.buyIns.filter((b) => b.seatId === seatId);
  const resultOf = (memberId: string) => state.summary.players.find((p) => p.playerId === memberId);
  const nameOf = (memberId: string) => state.seats.find((s) => s.memberId === memberId)?.name ?? "?";
  return { bySeat, resultOf, nameOf };
}

function Table({ state, onSettle }: { state: GameState; onSettle: () => void }) {
  const { game, seats, summary } = state;
  const { bySeat } = useTotals(state);
  const group = useGroup(game.groupId);
  const notSeated = group.data?.members.filter((m) => !seats.some((s) => s.memberId === m.id)) ?? [];

  const rebuy = useGameMutation(game.id, (seatId: string) =>
    parseResponse(api.games[":gameId"]["buy-ins"].$post({ param: { gameId: game.id }, json: { seatId } })),
  );
  const undo = useGameMutation(game.id, (buyInId: string) =>
    parseResponse(api.games[":gameId"]["buy-ins"][":buyInId"].$delete({ param: { gameId: game.id, buyInId } })),
  );
  const seatMember = useGameMutation(game.id, (memberId: string) =>
    parseResponse(api.games[":gameId"].seats.$post({ param: { gameId: game.id }, json: { memberId } })),
  );

  const recent = [...state.buyIns].reverse().slice(0, 5);
  const seatName = (seatId: string) => seats.find((s) => s.id === seatId)?.name ?? "?";

  return (
    <Screen footer={<Button title="Abrechnen" onPress={onSettle} />}>
      <Hero style={{ alignItems: "center", marginTop: 44 }}>
        <T tone="muted">Pot · {game.title}</T>
        <T size={44} weight="800">{money(summary.potCents)}</T>
        <T tone="muted" size={13}>Buy-in {money(game.buyInCents)} · {state.buyIns.length} Buy-ins</T>
      </Hero>

      {seats.map((s) => {
        const ins = bySeat(s.id);
        const out = s.cashOutCents !== null;
        return (
          <Row key={s.id} dim={out}>
            <Avatar id={s.memberId} name={s.name} />
            <View style={{ flex: 1, gap: 4 }}>
              <T>{out ? `${s.name} · raus` : s.name}</T>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {ins.map((b) => <View key={b.id} style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: c.accent }} />)}
              </View>
            </View>
            <T tone="muted">{money(ins.reduce((sum, b) => sum + b.amountCents, 0))}</T>
            {out ? <T tone="pos">{money(s.cashOutCents ?? 0)}</T> : <Chip title={`+${money(game.buyInCents)}`} onPress={() => rebuy.mutate(s.id)} />}
          </Row>
        );
      })}

      {notSeated.length > 0 && (
        <>
          <Heading title="Später dazu" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {notSeated.map((m) => <Chip key={m.id} title={`+ ${m.displayName}`} onPress={() => seatMember.mutate(m.id)} />)}
          </View>
        </>
      )}

      <Heading title="Verlauf" />
      {recent.map((b) => (
        <Row key={b.id}>
          <T tone="muted" size={13}>{new Date(b.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</T>
          <T style={{ flex: 1 }} size={14}>{seatName(b.seatId)} {money(b.amountCents)}</T>
          <Pressable onPress={() => undo.mutate(b.id)} hitSlop={10}><T tone="muted">✕</T></Pressable>
        </Row>
      ))}
      {[rebuy, undo, seatMember].map((m, i) => (m.isError ? <Notice key={i}>{m.error.message}</Notice> : null))}
    </Screen>
  );
}

function Settle({ state, onBack }: { state: GameState; onBack: () => void }) {
  const { game, seats, summary, transfers } = state;
  const { bySeat, nameOf } = useTotals(state);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const cashOut = useGameMutation(game.id, ({ seatId, cashOutCents }: { seatId: string; cashOutCents: number | null }) =>
    parseResponse(api.games[":gameId"].seats[":seatId"]["cash-out"].$put({ param: { gameId: game.id, seatId }, json: { cashOutCents } })),
  );
  const finish = useGameMutation(game.id, (distributeDifference: boolean) =>
    parseResponse(api.games[":gameId"].finish.$post({ param: { gameId: game.id }, json: { distributeDifference } })),
  );

  const allIn = seats.every((s) => s.cashOutCents !== null);
  const diff = summary.differenceCents;

  function commit(seatId: string) {
    const raw = drafts[seatId];
    if (raw === undefined) return;
    cashOut.mutate({ seatId, cashOutCents: raw.trim() === "" ? null : parseCents(raw) });
  }

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Button title="Zurück" variant="ghost" onPress={onBack} /></View>
          <View style={{ flex: 2 }}>
            <Button title={diff === 0 ? "Abschließen" : "Verteilen & abschließen"} disabled={!allIn} loading={finish.isPending} onPress={() => finish.mutate(diff !== 0)} />
          </View>
        </View>
      }
    >
      <T size={28} weight="800" style={{ marginTop: 48 }}>Abrechnen</T>
      <T tone="muted">Chips pro Spieler in € eintragen.</T>

      {allIn && diff !== 0 && (
        <Notice>
          Chips gezählt {money(summary.cashedOutCents)}, Pot {money(summary.potCents)}. Differenz {money(Math.abs(diff))} wird anteilig verteilt.
        </Notice>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {seats.map((s) => (
          <View key={s.id} style={{ width: "48%", flexGrow: 1 }}>
            <Field
              label={`${s.name} · rein ${money(bySeat(s.id).reduce((sum, b) => sum + b.amountCents, 0))}`}
              value={drafts[s.id] ?? (s.cashOutCents === null ? "" : String(s.cashOutCents / 100))}
              onChangeText={(t) => setDrafts((d) => ({ ...d, [s.id]: t }))}
              onBlur={() => commit(s.id)}
              onSubmitEditing={() => commit(s.id)}
              keyboardType="decimal-pad"
              placeholder="tippen…"
            />
          </View>
        ))}
      </View>

      {transfers.length > 0 && (
        <>
          <Heading title="Wer zahlt wen" right={<T tone="muted">{transfers.length}</T>} />
          {transfers.map((t) => <Transfer key={`${t.from}-${t.to}`} from={t.from} to={t.to} cents={t.amountCents} nameOf={nameOf} />)}
        </>
      )}
      {cashOut.isError && <Notice>{cashOut.error.message}</Notice>}
      {finish.isError && <Notice>{finish.error.message}</Notice>}
    </Screen>
  );
}

function Result({ state }: { state: GameState }) {
  const { game, summary, transfers } = state;
  const { nameOf } = useTotals(state);
  const winner = summary.players[0];

  const shareText = [
    `♠ ${game.title}`,
    ...summary.players.map((p) => `${nameOf(p.playerId)}: ${signedMoney(p.netCents)}`),
    "",
    ...transfers.map((t) => `${nameOf(t.from)} → ${nameOf(t.to)}: ${money(t.amountCents)}`),
  ].join("\n");

  return (
    <Screen footer={<Button title="Teilen" onPress={() => Share.share({ message: shareText })} />}>
      <Hero style={{ marginTop: 44 }}>
        <T tone="muted">{game.title} · abgeschlossen</T>
        <T size={44} weight="800">{money(summary.potCents)}</T>
        <T tone="muted" size={13}>{summary.players.length} Spieler</T>
      </Hero>

      {winner && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Tile label="Gewinner" value={nameOf(winner.playerId)} />
          <Tile label="Plus" value={signedMoney(winner.netCents)} tone="pos" />
        </View>
      )}

      <Heading title="Ergebnis" />
      {summary.players.map((p) => (
        <Row key={p.playerId}>
          <Avatar id={p.playerId} name={nameOf(p.playerId)} />
          <View style={{ flex: 1 }}>
            <T>{nameOf(p.playerId)}</T>
            <T tone="muted" size={12}>{money(p.buyInCents)} → {money(p.cashOutCents)}</T>
          </View>
          <T weight="700" tone={toneOf(p.netCents)}>{signedMoney(p.netCents)}</T>
        </Row>
      ))}

      {transfers.length > 0 && (
        <>
          <Heading title="Wer zahlt wen" right={<T tone="muted">{transfers.length}</T>} />
          {transfers.map((t) => <Transfer key={`${t.from}-${t.to}`} from={t.from} to={t.to} cents={t.amountCents} nameOf={nameOf} />)}
        </>
      )}
    </Screen>
  );
}

function Transfer({ from, to, cents, nameOf }: { from: string; to: string; cents: number; nameOf: (id: string) => string }) {
  return (
    <Row>
      <Avatar id={from} name={nameOf(from)} />
      <View style={{ width: 28, height: 2, borderRadius: 1, backgroundColor: c.neg }} />
      <Avatar id={to} name={nameOf(to)} />
      <T tone="muted" size={13} style={{ flex: 1 }} numberOfLines={1}>{nameOf(from)} an {nameOf(to)}</T>
      <T weight="700" size={16}>{money(cents)}</T>
    </Row>
  );
}
