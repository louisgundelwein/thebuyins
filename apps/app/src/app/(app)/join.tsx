import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { View } from "react-native";
import { Avatar, Button, Field, Heading, Hero, Notice, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Join a group by invite code. If the host already added you as a guest, you can take over that history. */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? "");
  const [claim, setClaim] = useState<string>();
  const qc = useQueryClient();
  const valid = code.trim().length === 6;

  const invite = useQuery({
    queryKey: ["invite", code],
    enabled: valid,
    retry: false,
    queryFn: () => parseResponse(api.invites[":code"].$get({ param: { code: code.trim() } })),
  });

  const join = useMutation({
    mutationFn: () => parseResponse(api.invites[":code"].join.$post({ param: { code: code.trim() }, json: { claimMemberId: claim } })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.replace("/");
    },
  });

  return (
    <Screen footer={<Button title="Beitreten" disabled={!invite.data} loading={join.isPending} onPress={() => join.mutate()} />}>
      <T size={28} weight="800" style={{ marginTop: 48 }}>Beitreten</T>
      <Field label="Einladungscode" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} placeholder="K7Q2XZ" />
      {invite.isError && <Notice>Code unbekannt</Notice>}
      {join.isError && <Notice>{join.error.message}</Notice>}

      {invite.data && (
        <>
          <Hero>
            <T tone="muted">Gruppe</T>
            <T size={28} weight="800">{invite.data.group.name}</T>
          </Hero>
          {invite.data.guests.length > 0 && (
            <>
              <Heading title="Bist du schon als Gast dabei?" />
              {invite.data.guests.map((g) => (
                <Row key={g.id} dim={claim !== undefined && claim !== g.id}>
                  <Avatar id={g.id} name={g.displayName} />
                  <View style={{ flex: 1 }}>
                    <T onPress={() => setClaim(claim === g.id ? undefined : g.id)}>{g.displayName}</T>
                  </View>
                  <T tone={claim === g.id ? "pos" : "muted"} onPress={() => setClaim(claim === g.id ? undefined : g.id)}>
                    {claim === g.id ? "Das bin ich ✓" : "Das bin ich"}
                  </T>
                </Row>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
