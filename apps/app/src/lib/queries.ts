import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import { api, type GameState } from "./api";

export type Season = number | "all";

export const keys = {
  groups: ["groups"] as const,
  group: (id: string, season: Season) => ["group", id, season] as const,
  game: (id: string) => ["game", id] as const,
  archive: ["archive"] as const,
};

export const useGroups = () =>
  useQuery({ queryKey: keys.groups, queryFn: () => parseResponse(api.groups.$get()) });

/** Finished games from groups the caller left. */
export const useArchive = () =>
  useQuery({ queryKey: keys.archive, queryFn: () => parseResponse(api.archive.$get()) });

export const useGroup = (groupId: string | undefined, season: Season = "all") =>
  useQuery({
    queryKey: keys.group(groupId ?? "", season),
    enabled: !!groupId,
    queryFn: () => parseResponse(api.groups[":groupId"].$get({ param: { groupId: groupId ?? "" }, query: { season: String(season) } })),
  });

/** Live games poll every few seconds so every phone at the table sees rebuys. */
export const useGame = (gameId: string) =>
  useQuery({
    queryKey: keys.game(gameId),
    queryFn: () => parseResponse(api.games[":gameId"].$get({ param: { gameId } })),
    refetchInterval: (q) => (q.state.data?.game.status === "live" ? 4000 : false),
  });

/**
 * Wraps a game mutation. Every game endpoint returns the fresh state, which goes
 * straight into the cache; group pages are invalidated so standings stay current. `onDone` runs
 * after that, for callers that navigate once the server has accepted the change.
 */
export function useGameMutation<V>(gameId: string, run: (vars: V) => Promise<GameState>, onDone?: (state: GameState) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (state) => {
      qc.setQueryData(keys.game(gameId), state);
      void qc.invalidateQueries({ queryKey: ["group", state.game.groupId] });
      onDone?.(state);
    },
  });
}
