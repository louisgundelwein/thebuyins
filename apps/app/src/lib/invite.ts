import { Platform, Share } from "react-native";
import type { Dict } from "./i18n";

/**
 * Public web origin used in shared links. On web it's the current origin (read lazily, the
 * static web render has no `location`); native builds read EXPO_PUBLIC_WEB_URL so friends
 * without the app can join in the browser.
 */
const webUrl = () =>
  Platform.OS === "web" && typeof location !== "undefined"
    ? location.origin
    : (process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:8081");

export const inviteUrl = (code: string) => `${webUrl()}/join?code=${code}`;

/** Opens the system share sheet (or Web Share / clipboard fallback) with a group invite link. */
export async function shareInvite(group: { name: string; inviteCode: string }, t: Dict) {
  const url = inviteUrl(group.inviteCode);
  const message = t.invite.message(group.name, url);
  if (Platform.OS === "web" && !navigator.share) {
    await navigator.clipboard.writeText(message);
    return "copied" as const;
  }
  await Share.share({ message });
  return "shared" as const;
}
