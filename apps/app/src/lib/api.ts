import type { Api } from "@thebuyins/server";
import { hc, type InferResponseType } from "hono/client";
import { Platform } from "react-native";
import { API_URL, authClient } from "./auth";

/**
 * Typed client for our own API. On web the browser sends the session cookie;
 * on native Better Auth keeps it in SecureStore and we attach it manually.
 */
export const api = hc<Api>(`${API_URL}/api`, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    if (Platform.OS === "web") return fetch(input, { ...init, credentials: "include" });
    const headers = new Headers(init?.headers);
    headers.set("Cookie", await authClient.getCookie());
    return fetch(input, { ...init, headers, credentials: "omit" });
  },
});

export type GroupPage = InferResponseType<(typeof api.groups)[":groupId"]["$get"], 200>;
export type GameState = InferResponseType<(typeof api.games)[":gameId"]["$get"], 200>;
