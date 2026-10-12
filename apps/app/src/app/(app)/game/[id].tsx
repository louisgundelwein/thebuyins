import { useLocalSearchParams } from "expo-router";
import { GameView } from "@/components/game-view";

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GameView id={id} />;
}
