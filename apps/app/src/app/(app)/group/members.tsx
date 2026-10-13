import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar, Button, Heading, Loading, Notice, PAGE_TOP, Row, Screen, T } from "@/components/ui";
import { api, type GroupPage } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useSelectedGroup } from "@/lib/group";
import { useLanguage } from "@/lib/language";
import { keys, useGroup } from "@/lib/queries";

type Member = GroupPage["members"][number];

/**
 * Members of the selected group. Admins can remove anyone but themselves; guests who already
 * played can't be removed because their results would go with them. Everyone can leave; their
 * games move to their archive.
 */
export default function Members() {
  const { t } = useLanguage();
  const { groupId } = useSelectedGroup();
  const page = useGroup(groupId);
  const qc = useQueryClient();
  const myId = authClient.useSession().data?.user.id;
  const [confirmId, setConfirmId] = useState<string>();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      parseResponse(api.groups[":groupId"].members[":memberId"].$delete({ param: { groupId: groupId ?? "", memberId } })),
    onSuccess: () => {
      setConfirmId(undefined);
      void qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });

  const leave = useMutation({
    mutationFn: () => parseResponse(api.groups[":groupId"].leave.$post({ param: { groupId: groupId ?? "" } })),
    onSuccess: () => {
      router.replace("/");
      void qc.invalidateQueries({ queryKey: keys.groups });
      void qc.invalidateQueries({ queryKey: keys.archive });
    },
  });

  if (!page.data) return <Loading />;
  const { me, members } = page.data;
  const canRemove = (m: Member) => me.role === "admin" && m.id !== me.id && (m.userId !== null || !m.played);

  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.members.title}</T>
      <Heading title={t.members.count(members.length)} />
      {members.map((m) => (
        <Row key={m.id}>
          <Avatar id={m.id} name={m.displayName} guest={!m.userId} />
          <View style={{ flex: 1 }}>
            <T>
              {m.displayName}
              {m.userId === myId ? <T tone="muted" size={12}>  {t.common.you}</T> : null}
            </T>
            <T tone="muted" size={12}>
              {[m.role === "admin" && t.members.admin, !m.userId && t.common.guest].filter(Boolean).join(" · ")}
            </T>
          </View>
          {canRemove(m) &&
            (confirmId === m.id ? (
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Pressable onPress={() => remove.mutate(m.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.members.removeConfirmLabel(m.displayName)}>
                  <T tone="neg" size={13} weight="700">{t.members.removeConfirm}</T>
                </Pressable>
                <Pressable onPress={() => setConfirmId(undefined)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.common.cancel}>
                  <T tone="muted" size={13}>{t.common.cancel}</T>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmId(m.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.members.removeLabel(m.displayName)}>
                <T tone="neg" size={13} weight="600">{t.members.remove}</T>
              </Pressable>
            ))}
        </Row>
      ))}
      {remove.isError && <Notice>{remove.error.message}</Notice>}

      <Heading title={t.members.leave} />
      <T tone="muted" size={13}>{t.members.leaveText}</T>
      {confirmLeave ? (
        <>
          <Button title={t.members.leaveConfirm} onPress={() => leave.mutate()} loading={leave.isPending} />
          <Button title={t.common.cancel} variant="ghost" onPress={() => setConfirmLeave(false)} />
        </>
      ) : (
        <Button title={t.members.leave} variant="ghost" onPress={() => setConfirmLeave(true)} />
      )}
      {leave.isError && <Notice>{leave.error.message}</Notice>}
    </Screen>
  );
}
