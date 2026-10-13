import { router } from "expo-router";
import { View } from "react-native";
import { GameView } from "@/components/game-view";
import { TopBar } from "@/components/top-bar";
import { Button, Chip, Loading, Screen, T } from "@/components/ui";
import { useSelectedGroup } from "@/lib/group";
import { useLanguage } from "@/lib/language";
import { useGroup } from "@/lib/queries";

/** The group's running game, or an empty state pointing at the plus button. */
export default function Live() {
  const { t } = useLanguage();
  const { groupId } = useSelectedGroup();
  const page = useGroup(groupId);
  if (groupId && page.isPending) return <Loading />;

  const live = page.data?.games.find((g) => g.status === "live");
  if (live) return <GameView id={live.id} dock header={<TopBar left={<Chip title={`● Live · ${live.title}`} label={`Live · ${live.title}`} />} />} />;

  return (
    <Screen dock>
      <TopBar />
      <View style={{ alignItems: "center", gap: 10, marginTop: 140 }}>
        <T size={44} importantForAccessibility="no" accessibilityElementsHidden>♠</T>
        <T size={20} weight="800">{t.live.none}</T>
        <T tone="muted" style={{ textAlign: "center" }}>{t.live.noneText}</T>
        <View style={{ width: 200, marginTop: 10 }}>
          <Button title={t.live.enterCode} variant="ghost" onPress={() => router.push("/join")} />
        </View>
      </View>
    </Screen>
  );
}
