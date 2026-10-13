/** Direction "C · Chips": dark violet, big numbers. */
export const c = {
  bg: "#0c0b12",
  bgTop: "#17122a",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.6)",
  faint: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  accent: "#a78bfa",
  onAccent: "#140b2e",
  accentSoft: "rgba(167,139,250,0.16)",
  pos: "#5eead4",
  neg: "#fb7185",
  warn: "#fcd34d",
  warnSoft: "rgba(251,191,36,0.1)",
} as const;

export const radius = { tile: 20, row: 18, hero: 28, pill: 999 } as const;

/** Transparent native header for pushed screens. Titles below it start at `PAGE_TOP`. */
export const stackHeader = {
  headerShown: true,
  headerTransparent: true,
  headerTitle: "",
  headerTintColor: c.text,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: c.bg },
} as const;

/** Stable avatar colour per member. */
const AVATAR = ["#7c3aed", "#0d9488", "#db2777", "#ca8a04", "#2563eb", "#ea580c", "#16a34a", "#9333ea"];
export function avatarColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR[Math.abs(h) % AVATAR.length] ?? AVATAR[0];
}
