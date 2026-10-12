import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Button, Field, Notice, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { parseCents } from "@/lib/money";
import { keys } from "@/lib/queries";

export default function NewGroup() {
  const [name, setName] = useState("");
  const [buyIn, setBuyIn] = useState("20");
  const qc = useQueryClient();
  const cents = parseCents(buyIn);

  const create = useMutation({
    mutationFn: (defaultBuyInCents: number) => parseResponse(api.groups.$post({ json: { name, defaultBuyInCents } })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.back();
    },
  });

  return (
    <Screen footer={<Button title="Gruppe erstellen" disabled={!name.trim() || !cents} loading={create.isPending} onPress={() => cents && create.mutate(cents)} />}>
      <T size={28} weight="800" style={{ marginTop: 48 }}>Neue Gruppe</T>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Freitagsrunde" autoFocus />
      <Field label="Standard Buy-in in €" value={buyIn} onChangeText={setBuyIn} keyboardType="decimal-pad" />
      {create.isError && <Notice>{create.error.message}</Notice>}
    </Screen>
  );
}
