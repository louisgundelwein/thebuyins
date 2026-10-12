import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Base URL of the Hono server. Native builds and local dev set EXPO_PUBLIC_API_URL
 * (see .env.development and eas.json); the production website is served by the API itself,
 * so it falls back to its own origin.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "web" ? location.origin : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "thebuyins", storagePrefix: "thebuyins", storage: SecureStore })],
});
