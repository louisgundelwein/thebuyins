import { parseResponse } from "hono/client";
import { useState, type ReactNode } from "react";
import { Pressable, Share, View } from "react-native";
import { Avatar, Button, Chip, Field, Heading, Hero, Loading, Notice, Row, Screen, T, Tile, toneOf } from "@/components/ui";
import { api, type GameState } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { t, locale } from "@/lib/i18n";
import { money, parseCents, signedMoney } from "@/lib/money";
import { useGame, useGameMutation, useGroup } from "@/lib/queries";
import { c } from "@/lib/theme";

/** Where a game is shown: its own route (below a back header) or the Live tab (own top bar, above the dock). */
type Frame = { header?: ReactNode; dock?: boolean };

/** One game: live table with rebuys, then chip count and settlement, then the final result. */
export function GameView({ id, ...frame }: { id: string } & Frame) {
  const game = useGame(id);
  const [settling, setSettling] = useState(false);

  if (!game.data) return <Loading />;
  if (game.data.game.status === "finished") return <Result state={game.data} frame={frame} />;
  return settling ? (
    <Settle state={game.data} frame={frame} onBack={() => setSettling(false)} />
  ) : (
    <Table state={game.data} frame={frame} onSettle={() => setSettling(true)} />
  );
}

/** Space under the transparent stack header when there's no top bar. */
const topGap = (frame: Frame) => (frame.header ? 4 : 44);

function useTotals(state: GameState) {
  const bySeat = (seatId: string) => state.buyIns.filter((b) => b.seatId === seatId);
  const resultOf = (memberId: string) => state.summary.players.find((p) => p.playerId === memberId);
  const nameOf = (memberId: string) => state.seats.find((s) => s.memberId === memberId)?.name ?? "?";
  return { bySeat, resultOf, nameOf };
}

function Table({ state, frame, onSettle }: { state: GameState; frame: Frame; onSettle: () => void }) {
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

  const myId = authClient.useSession().data?.user.id;
  const recent = [...state.buyIns].reverse().slice(0, 5);
  const seatName = (seatId: string) => seats.find((s) => s.id === seatId)?.name ?? "?";

  return (
    <Screen dock={frame.dock} footer={<Button title={t.game.settle} onPress={onSettle} />}>
      {frame.header}
      <Hero style={{ alignItems: "center", marginTop: topGap(frame) }}>
        <T tone="muted">{t.game.potOf(game.title)}</T>
        <T size={44} weight="800">{money(summary.potCents)}</T>
        <T tone="muted" size={13}>{t.game.buyInOf(money(game.buyInCents), state.buyIns.length)}</T>
      </Hero>

      {seats.map((s) => {
        const ins = bySeat(s.id);
        const out = s.cashOutCents !== null;
        const paidIn = ins.reduce((sum, b) => sum + b.amountCents, 0);
        return (
          <Row key={s.id} dim={out}>
            <View
              accessible
              accessibilityLabel={t.game.seatRow(s.name, money(paidIn), out ? money(s.cashOutCents ?? 0) : undefined)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <T tone="muted" size={13} style={{ width: 16 }}>{s.position || ""}</T>
              <Avatar id={s.memberId} name={s.name} guest={!s.userId} />
              <View style={{ flex: 1, gap: 4 }}>
                <T>
                  {s.name}
                  {s.userId === myId ? <T tone="muted" size={12}>  {t.common.you}</T> : null}
                  {out ? <T tone="muted" size={12}>  {t.game.out}</T> : null}
                </T>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {ins.map((b) => <View key={b.id} style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: c.accent }} />)}
                </View>
              </View>
              <T tone="muted">{money(paidIn)}</T>
              {out && <T tone="pos">{money(s.cashOutCents ?? 0)}</T>}
            </View>
            {!out && <Chip title={`+${money(game.buyInCents)}`} label={t.game.rebuyFor(s.name)} onPress={() => rebuy.mutate(s.id)} />}
          </Row>
        );
      })}

      {notSeated.length > 0 && (
        <>
          <Heading title={t.game.seatLater} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {notSeated.map((m) => <Chip key={m.id} title={`+ ${m.displayName}`} label={t.game.seatChip(m.displayName)} onPress={() => seatMember.mutate(m.id)} />)}
          </View>
        </>
      )}

      <Heading title={t.game.history} />
      {recent.map((b) => (
        <Row key={b.id}>
          <T tone="muted" size={13}>{new Date(b.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</T>
          <T style={{ flex: 1 }} size={14}>{seatName(b.seatId)} {money(b.amountCents)}</T>
          <Pressable
            onPress={() => undo.mutate(b.id)}
            accessibilityRole="button"
            accessibilityLabel={t.game.undo(seatName(b.seatId), money(b.amountCents))}
            hitSlop={8}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <T tone="muted" importantForAccessibility="no">✕</T>
          </Pressable>
        </Row>
      ))}
      {[rebuy, undo, seatMember].map((m, i) => (m.isError ? <Notice key={i}>{m.error.message}</Notice> : null))}
    </Screen>
  );
}

function Settle({ state, frame, onBack }: { state: GameState; frame: Frame; onBack: () => void }) {
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
      dock={frame.dock}
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Button title={t.settle.back} variant="ghost" onPress={onBack} /></View>
          <View style={{ flex: 2 }}>
            <Button title={diff === 0 ? t.settle.finish : t.settle.splitAndFinish} disabled={!allIn} loading={finish.isPending} onPress={() => finish.mutate(diff !== 0)} />
          </View>
        </View>
      }
    >
      {frame.header}
      <T size={28} weight="800" style={{ marginTop: topGap(frame) }}>{t.settle.title}</T>
      <T tone="muted">{t.settle.hint}</T>

      {allIn && diff !== 0 && (
        <Notice>{t.settle.difference(money(summary.cashedOutCents), money(summary.potCents), money(Math.abs(diff)))}</Notice>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {seats.map((s) => (
          <View key={s.id} style={{ width: "48%", flexGrow: 1 }}>
            <Field
              label={t.settle.paidIn(s.name, money(bySeat(s.id).reduce((sum, b) => sum + b.amountCents, 0)))}
              value={drafts[s.id] ?? (s.cashOutCents === null ? "" : String(s.cashOutCents / 100))}
              onChangeText={(t) => setDrafts((d) => ({ ...d, [s.id]: t }))}
              onBlur={() => commit(s.id)}
              onSubmitEditing={() => commit(s.id)}
              keyboardType="decimal-pad"
              placeholder={t.settle.tap}
            />
          </View>
        ))}
      </View>

      {transfers.length > 0 && (
        <>
          <Heading title={t.settle.whoPaysWhom} right={<T tone="muted">{transfers.length}</T>} />
          {transfers.map((tr) => <Transfer key={`${tr.from}-${tr.to}`} from={tr.from} to={tr.to} cents={tr.amountCents} nameOf={nameOf} />)}
        </>
      )}
      {cashOut.isError && <Notice>{cashOut.error.message}</Notice>}
      {finish.isError && <Notice>{finish.error.message}</Notice>}
    </Screen>
  );
}

function Result({ state, frame }: { state: GameState; frame: Frame }) {
  const { game, summary, transfers } = state;
  const { nameOf } = useTotals(state);
  const winner = summary.players[0];

  const shareText = [
    `♠ ${game.title} · ${t.game.shareHeader}`,
    ...summary.players.map((p) => `${nameOf(p.playerId)}: ${signedMoney(p.netCents)}`),
    "",
    ...transfers.map((t) => `${nameOf(t.from)} → ${nameOf(t.to)}: ${money(t.amountCents)}`),
  ].join("\n");

  return (
    <Screen dock={frame.dock} footer={<Button title={t.game.share} onPress={() => Share.share({ message: shareText })} />}>
      {frame.header}
      <Hero style={{ marginTop: topGap(frame) }}>
        <T tone="muted">{t.game.finished(game.title)}</T>
        <T size={44} weight="800">{money(summary.potCents)}</T>
        <T tone="muted" size={13}>{t.game.playersCount(summary.players.length)}</T>
      </Hero>

      {winner && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Tile label={t.game.topBalance} value={nameOf(winner.playerId)} />
          <Tile label={t.game.balance} value={signedMoney(winner.netCents)} tone="pos" />
        </View>
      )}

      <Heading title={t.game.result} />
      {summary.players.map((p) => (
        <Row
          key={p.playerId}
          label={t.game.resultRow(nameOf(p.playerId), money(p.buyInCents), signedMoney(p.netCents))}
        >
          <Avatar id={p.playerId} name={nameOf(p.playerId)} />
          <View style={{ flex: 1 }}>
            <T>{nameOf(p.playerId)}</T>
            <T tone="muted" size={12}>{t.game.buyInCashLine(money(p.buyInCents), money(p.cashOutCents))}</T>
          </View>
          <T weight="700" tone={toneOf(p.netCents)}>{signedMoney(p.netCents)}</T>
        </Row>
      ))}

      {transfers.length > 0 && (
        <>
          <Heading title={t.settle.whoPaysWhom} right={<T tone="muted">{transfers.length}</T>} />
          {transfers.map((tr) => <Transfer key={`${tr.from}-${tr.to}`} from={tr.from} to={tr.to} cents={tr.amountCents} nameOf={nameOf} />)}
        </>
      )}
    </Screen>
  );
}

function Transfer({ from, to, cents, nameOf }: { from: string; to: string; cents: number; nameOf: (id: string) => string }) {
  return (
    <Row label={t.settle.transferRow(nameOf(from), nameOf(to), money(cents))}>
      <Avatar id={from} name={nameOf(from)} />
      <View style={{ width: 28, height: 2, borderRadius: 1, backgroundColor: c.neg }} />
      <Avatar id={to} name={nameOf(to)} />
      <T tone="muted" size={13} style={{ flex: 1 }} numberOfLines={1}>{t.settle.pays(nameOf(from), nameOf(to))}</T>
      <T weight="700" size={16}>{money(cents)}</T>
    </Row>
  );
}
