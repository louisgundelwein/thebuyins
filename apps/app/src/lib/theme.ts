/** Semantic colours shared by the existing dark theme and “A · Klar”. */
const dark = {
  bg: "#0c0b12",
  bgTop: "#17122a",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.6)",
  faint: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  accent: "#a78bfa",
  onAccent: "#140b2e",
  accentSoft: "rgba(167,139,250,0.16)",
  accentText: "#c4b5fd",
  pos: "#5eead4",
  posSoft: "rgba(94,234,212,0.14)",
  neg: "#fb7185",
  warn: "#fcd34d",
  warnSoft: "rgba(251,191,36,0.1)",
  row: "rgba(255,255,255,0.04)",
  heroFrom: "rgba(167,139,250,0.2)",
  heroTo: "rgba(167,139,250,0.03)",
  placeholder: "rgba(255,255,255,0.5)",
  guestBorder: "rgba(255,255,255,0.4)",
  avatarBorder: "rgba(255,255,255,0.18)",
  onAvatar: "#ffffff",
  backdrop: "rgba(0,0,0,0.45)",
  sheet: "rgba(36,31,56,0.97)",
  sheetShadow: "0 20px 50px rgba(0,0,0,0.6)",
  dock: "rgba(30,26,46,0.92)",
  dockShadow: "0 12px 32px rgba(0,0,0,0.45)",
  plusShadow: "0 10px 28px rgba(167,139,250,0.4)",
  chartLine: "rgba(255,255,255,0.18)",
  tableFrom: "#1a1530",
  tableTo: "#2a1f4d",
  tableBorder: "rgba(167,139,250,0.35)",
  dealer: "#ffffff",
  onDealer: "#000000",
  buyInBorder: "rgba(255,255,255,0.35)",
  dashedBorder: "rgba(255,255,255,0.15)",
  transparent: "transparent",
} as const;

export type Colors = { [Key in keyof typeof dark]: string };
export type ColorScheme = "light" | "dark";
export type AppearanceChoice = ColorScheme | "system";
export const appearanceChoices = ["light", "dark", "system"] as const;

const light: Colors = {
  bg: "#fcfcfd",
  bgTop: "#fcfcfd",
  text: "#211c2f",
  muted: "#686371",
  faint: "#f3f1f7",
  border: "#eae7ef",
  accent: "#7043d7",
  onAccent: "#ffffff",
  accentSoft: "#eee8fb",
  accentText: "#7043d7",
  pos: "#087965",
  posSoft: "#e5f4ef",
  neg: "#b33252",
  warn: "#805800",
  warnSoft: "#fff4d6",
  row: "#ffffff",
  heroFrom: "#f5f2fc",
  heroTo: "#f5f2fc",
  placeholder: "#686371",
  guestBorder: "#8a8494",
  avatarBorder: "#eae7ef",
  onAvatar: "#ffffff",
  backdrop: "rgba(30,25,43,0.24)",
  sheet: "#ffffff",
  sheetShadow: "0 18px 60px rgba(31,21,49,0.18)",
  dock: "#ffffff",
  dockShadow: "0 8px 25px rgba(41,24,69,0.08)",
  plusShadow: "0 8px 25px rgba(41,24,69,0.08)",
  chartLine: "#eae7ef",
  tableFrom: "#f5f2fc",
  tableTo: "#eee8fb",
  tableBorder: "#d7c8f4",
  dealer: "#211c2f",
  onDealer: "#ffffff",
  buyInBorder: "#d7c8f4",
  dashedBorder: "#8a8494",
  transparent: "transparent",
};

export const palettes: Record<ColorScheme, Colors> = { light, dark };
export const radius = { tile: 20, row: 18, hero: 28, pill: 999 } as const;
export const control = { minHeight: 44, menuWidth: 280, menuInset: 18, menuTop: 62, menuPadding: 8 } as const;

/** Transparent native header for pushed screens. Derived at render so back buttons update too. */
export function stackHeader(c: Colors) {
  return {
    headerShown: true,
    headerTransparent: true,
    headerTitle: "",
    headerTintColor: c.text,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: c.bg },
  } as const;
}

/** Stable avatar colour per member, with a separate foreground in both appearances. */
const AVATAR = ["#7c3aed", "#0f766e", "#db2777", "#8f6515", "#2563eb", "#c2410c", "#15803d", "#9333ea"];
export function avatarColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR[Math.abs(h) % AVATAR.length] ?? AVATAR[0];
}
