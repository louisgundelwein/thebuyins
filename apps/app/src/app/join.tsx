import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AuthForm } from "@/components/auth-form";
import { Avatar, Button, Field, Heading, Hero, Notice, PAGE_TOP, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { keys } from "@/lib/queries";

/**
 * Target of invite links (`/join?code=XXXXXX`). Lives outside the auth guards so new people
 * can sign up right here; once a session exists the same screen turns into the join view.
 */
export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data: session } = authClient.useSession();
  const { t } = useLanguage();

  if (session) return <JoinGroup initialCode={code ?? ""} />;

  return (
    <Screen>
      <Hero style={{ marginTop: PAGE_TOP, alignItems: "center", paddingVertical: 32 }}>
        <T size={32} weight="800">{t.join.invitation}</T>
        <T tone="muted" style={{ textAlign: "center" }}>{t.join.signInText}</T>
      </Hero>
      <AuthForm />
    </Screen>
  );
}

/** Join a group by invite code. If the host already added you as a guest, you can take over that history. */
function JoinGroup({ initialCode }: { initialCode: string }) {
  const { t } = useLanguage();
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
      await qc.invalidateQueries({ queryKey: keys.archive });
      router.replace("/");
    },
  });

  const toggleClaim = (id: string) => setClaim(claim === id ? undefined : id);

  return (
    <Screen footer={<Button title={t.join.join} disabled={!invite.data} loading={join.isPending} onPress={() => join.mutate()} />}>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.join.title}</T>
      <Field label={t.join.code} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} placeholder="K7Q2XZ" />
      {invite.isError && <Notice>{t.join.unknownCode}</Notice>}
      {join.isError && <Notice>{join.error.message}</Notice>}

      {invite.data && (
        <>
          <Hero>
            <T tone="muted">{t.join.group}</T>
            <T size={28} weight="800">{invite.data.group.name}</T>
          </Hero>
          {invite.data.guests.length > 0 && (
            <>
              <Heading title={t.join.guestQuestion} />
              {invite.data.guests.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => toggleClaim(g.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: claim === g.id }}
                  accessibilityLabel={`${g.displayName}, ${t.join.thatsMe}`}
                >
                  <Row dim={claim !== undefined && claim !== g.id}>
                    <Avatar id={g.id} name={g.displayName} />
                    <View style={{ flex: 1 }}>
                      <T>{g.displayName}</T>
                    </View>
                    <T tone={claim === g.id ? "pos" : "muted"}>
                      {claim === g.id ? t.join.thatsMeChecked : t.join.thatsMe}
                    </T>
                  </Row>
                </Pressable>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
