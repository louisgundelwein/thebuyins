import { expoClient } from "@better-auth/expo/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/** Base URL of the Hono server. Set EXPO_PUBLIC_API_URL to your LAN IP when testing on a phone. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({ scheme: "homegame", storagePrefix: "homegame", storage: SecureStore }),
    magicLinkClient(),
  ],
});
