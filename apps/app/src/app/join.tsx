import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { View } from "react-native";
import { AuthForm } from "@/components/auth-form";
import { Avatar, Button, Chip, Field, Heading, Hero, Notice, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { keys } from "@/lib/queries";

/**
 * Target of invite links (`/join?code=XXXXXX`). Lives outside the auth guards so new people
 * can sign up right here; once a session exists the same screen turns into the join view.
 */
export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data: session } = authClient.useSession();

  if (session) return <JoinGroup initialCode={code ?? ""} />;

  return (
    <Screen>
      <Hero style={{ marginTop: 40, alignItems: "center", paddingVertical: 32 }}>
        <T size={32} weight="800">Einladung</T>
        <T tone="muted" style={{ textAlign: "center" }}>Melde dich an oder registriere dich, um beizutreten.</T>
      </Hero>
      <AuthForm />
    </Screen>
  );
}

/** Join a group by invite code. If the host already added you as a guest, you can take over that history. */
function JoinGroup({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
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

  const toggleClaim = (id: string) => setClaim(claim === id ? undefined : id);

  return (
    <Screen footer={<Button title="Beitreten" disabled={!invite.data} loading={join.isPending} onPress={() => join.mutate()} />}>
      <View style={{ flexDirection: "row", marginTop: 8 }}>
        <Chip title="‹ Zurück" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
      <T size={28} weight="800" style={{ marginTop: 16 }}>Beitreten</T>
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
                    <T onPress={() => toggleClaim(g.id)}>{g.displayName}</T>
                  </View>
                  <T tone={claim === g.id ? "pos" : "muted"} onPress={() => toggleClaim(g.id)}>
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
