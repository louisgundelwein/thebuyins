import { settle, summarize, type Entry } from "@thebuyins/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Share, View } from "react-native";
import { Avatar, Button, Chip, Field, Heading, Hero, Loading, Notice, PAGE_TOP, Row, Screen, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";
import { createQuickGame, loadQuickGame, saveQuickGame, type QuickGame } from "@/lib/quick-game";

/** Parse euros without rounding; cap amounts at the same limit for each player. */
function cents(value: string): number | null {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

const formLayout = { gap: 12, footerGap: 8 } as const;

export default function QuickStart() {
  const { t, money, signedMoney } = useLanguage();
  const q = t.quickStart;
  const [game, setGame] = useState<QuickGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<"load" | "save" | "share" | null>(null);
  const [pending, setPending] = useState(false);
  const writing = useRef(false);
  const [names, setNames] = useState(["", ""]);
  const [buyIn, setBuyIn] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState(false);
  const [retryGame, setRetryGame] = useState<QuickGame | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const saved = await loadQuickGame();
      setGame(saved);
      if (saved) {
        setDrafts(Object.fromEntries(saved.entries
          .filter((entry) => entry.kind === "cash_out")
          .map((entry) => [entry.playerId, String(entry.amountCents / 100)])));
      }
      setLoaded(true);
    } catch {
      setError("load");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(next: QuickGame) {
    if (writing.current) return;
    writing.current = true;
    setPending(true);
    setError(null);
    try {
      await saveQuickGame(next);
      setGame(next);
      setRetryGame(null);
      if (next.phase === "live" && !next.entries.some((entry) => entry.kind === "cash_out")) setDrafts({});
    } catch {
      setRetryGame(next);
      setError("save");
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  function start() {
    const amount = cents(buyIn);
    const clean = names.map((name) => name.trim());
    if (clean.length < 2 || clean.some((name) => !name) || amount === null || amount <= 0) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void save(createQuickGame(clean, amount));
  }

  if (!loaded) {
    if (!error) return <Loading />;
    return (
      <Screen footer={<Button title={q.retry} onPress={() => void load()} />}>
        <View style={{ marginTop: PAGE_TOP }}><Notice>{q.loadError}</Notice></View>
      </Screen>
    );
  }

  if (!game) {
    return (
      <Screen footer={<Button title={q.start} loading={pending} disabled={error === "save"} onPress={start} />}>
        <View style={{ marginTop: PAGE_TOP, gap: formLayout.gap }}>
          <T size={28} weight="800">{q.title}</T>
          <T tone="muted">{q.intro}</T>
          <Field label={q.buyIn} value={buyIn} onChangeText={setBuyIn} keyboardType="decimal-pad" maxLength={10} editable={!pending && !error} />
          <Heading title={q.players} />
          {names.map((name, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "flex-end", gap: formLayout.footerGap }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={q.name(index + 1)}
                  value={name}
                  maxLength={60}
                  editable={!pending && !error}
                  onChangeText={(value) => setNames((current) => current.map((item, row) => row === index ? value : item))}
                />
              </View>
              {names.length > 2 && !pending && !error && (
                <Chip title="×" label={q.remove(name || q.name(index + 1))} onPress={() => setNames((current) => current.filter((_, row) => row !== index))} />
              )}
            </View>
          ))}
          {!pending && !error && <Chip title={q.add} onPress={() => setNames((current) => [...current, ""])} />}
          <T tone="muted">{q.offline}</T>
          {invalid && <Notice>{q.invalid}</Notice>}
          {error === "save" && retryGame && <>
            <Notice>{q.saveError}</Notice>
            <Button title={q.retry} loading={pending} onPress={() => void save(retryGame)} />
          </>}
        </View>
      </Screen>
    );
  }

  const current = game;
  const summary = summarize(current.entries);
  const nameOf = (id: string) => {
    const player = current.players.find((candidate) => candidate.id === id);
    if (!player) throw new Error(`Unknown local player: ${id}`);
    return player.name;
  };
  const buyIns = current.entries.filter((entry) => entry.kind === "buy_in");
  const cashOuts = current.players.flatMap<Entry>((player) => {
    const amount = cents(drafts[player.id] ?? "");
    return amount === null ? [] : [{ playerId: player.id, kind: "cash_out", amountCents: amount }];
  });
  const draftSummary = summarize([...buyIns, ...cashOuts]);
  const allCash = current.players.length === cashOuts.length;
  const lastRebuy = current.phase === "live" && buyIns.length > current.players.length ? buyIns.at(-1) : undefined;
  const transfers = current.phase === "complete" ? settle(summary.players) : [];
  const locked = pending || error === "save";

  async function share() {
    const message = [
      `♠ ${t.game.shareHeader}`,
      ...summary.players.map((player) => `${nameOf(player.playerId)}: ${signedMoney(player.netCents)}`),
      "",
      ...transfers.map(({ from, to, amountCents }) => `${nameOf(from)} → ${nameOf(to)}: ${money(amountCents)}`),
    ].join("\n");
    try {
      setError(null);
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      } else {
        await Share.share({ message });
      }
    } catch {
      setError("share");
    }
  }

  return (
    <Screen footer={
      <View style={{ gap: formLayout.footerGap }}>
        {current.phase === "live" && <Button title={q.end} loading={pending} disabled={locked} onPress={() => void save({ ...current, phase: "cashout" })} />}
        {current.phase === "cashout" && <>
          <Button
            title={q.finish}
            loading={pending}
            disabled={locked || !allCash || draftSummary.differenceCents !== 0}
            onPress={() => void save({ ...current, entries: [...buyIns, ...cashOuts], phase: "complete" })}
          />
          <Button title={q.returnToLive} variant="ghost" disabled={locked} onPress={() => void save({ ...current, entries: buyIns, phase: "live" })} />
        </>}
        {current.phase === "complete" && <>
          <Button title={t.game.share} disabled={locked} onPress={() => void share()} />
          <Button title={q.edit} variant="ghost" disabled={locked} onPress={() => void save({ ...current, phase: "cashout" })} />
          <Button title={q.replay} variant="ghost" loading={pending} disabled={locked} onPress={() => {
            setCopied(false);
            void save(createQuickGame(current.players.map((player) => player.name), current.buyInCents));
          }} />
        </>}
      </View>
    }>
      <View style={{ marginTop: PAGE_TOP, gap: formLayout.gap }}>
        <T size={28} weight="800">{current.phase === "live" ? q.live : current.phase === "cashout" ? q.cashout : q.result}</T>
        <T tone="muted">{current.phase === "cashout" ? q.cashoutHint : q.saved}</T>
        <Hero>
          <T tone="muted">{q.pot}</T>
          <T size={40} weight="800">{money(summary.potCents)}</T>
          <T tone="muted">{t.game.playersCount(current.players.length)} · {t.game.buyInCount(buyIns.length)}</T>
        </Hero>
        {error === "save" && retryGame && <>
          <Notice>{q.saveError}</Notice>
          <Button title={q.retry} loading={pending} onPress={() => void save(retryGame)} />
        </>}
        {error === "share" && <Notice>{q.shareError}</Notice>}
        {current.phase === "live" && <>
          <Heading title={q.table} />
          {current.players.map((player) => {
            const playerBuyIns = buyIns.filter((entry) => entry.playerId === player.id);
            const count = t.game.buyInCount(playerBuyIns.length);
            return (
              <Row key={player.id}>
                <Avatar id={player.id} name={player.name} guest />
                <View style={{ flex: 1 }}>
                  <T weight="700">{player.name}</T>
                  <T tone="muted">{money(playerBuyIns.reduce((total, entry) => total + entry.amountCents, 0))} · {count}</T>
                </View>
                <Button
                  title={q.rebuy}
                  variant="soft"
                  disabled={locked}
                  onPress={() => void save({
                    ...current,
                    entries: [...current.entries, { playerId: player.id, kind: "buy_in", amountCents: current.buyInCents }],
                  })}
                />
              </Row>
            );
          })}
          {lastRebuy && <View accessibilityLiveRegion="polite" style={{ gap: formLayout.footerGap }}>
            <T tone="pos">{q.rebuyAdded(nameOf(lastRebuy.playerId), money(lastRebuy.amountCents))}</T>
            <Button title={q.undo} variant="soft" disabled={locked} onPress={() => void save({ ...current, entries: buyIns.slice(0, -1) })} />
          </View>}
        </>}
        {current.phase === "cashout" && <>
          {current.players.map((player) => (
            <Field
              key={player.id}
              label={t.settle.paidIn(player.name, money(buyIns
                .filter((entry) => entry.playerId === player.id)
                .reduce((total, entry) => total + entry.amountCents, 0)))}
              value={drafts[player.id] ?? ""}
              onChangeText={(value) => setDrafts((previous) => ({ ...previous, [player.id]: value }))}
              onBlur={() => {
                const entries = [...buyIns, ...cashOuts];
                if (JSON.stringify(entries) !== JSON.stringify(current.entries)) void save({ ...current, entries });
              }}
              editable={error !== "save"}
              maxLength={10}
              keyboardType="decimal-pad"
            />
          ))}
          {allCash && draftSummary.differenceCents !== 0 && <Notice>{q.mismatch(money(Math.abs(draftSummary.differenceCents)))}</Notice>}
        </>}
        {current.phase === "complete" && <>
          <Heading title={q.transfers} />
          {transfers.length === 0 && <T>{q.noTransfers}</T>}
          {transfers.map((transfer) => (
            <Row key={`${transfer.from}-${transfer.to}`}>
              <T style={{ flex: 1 }}>{t.settle.pays(nameOf(transfer.from), nameOf(transfer.to))}</T>
              <T weight="700">{money(transfer.amountCents)}</T>
            </Row>
          ))}
          <Heading title={q.cashout} />
          {summary.players.map((player) => (
            <Row key={player.playerId}>
              <T style={{ flex: 1 }}>{nameOf(player.playerId)}</T>
              <T>{money(player.cashOutCents)} · {signedMoney(player.netCents)}</T>
            </Row>
          ))}
          {copied && <T accessibilityLiveRegion="polite" tone="pos">{q.copied}</T>}
        </>}
      </View>
    </Screen>
  );
}
