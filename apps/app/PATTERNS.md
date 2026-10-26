# Screen anatomy

- Overview and Live: group or timer at top left, profile at top right, one floating dock with Overview, new game, Live.
- Pushed screens: native back at top left. Focused creation flows keep their existing close and footer actions.
- Primary actions use violet; positive results use signed teal amounts, negative results signed rose amounts. Colour never replaces the sign.
- Status messages stay beside the initiating action. Lists, forms and notices use shared components in `src/components/ui.tsx`.

# Appearance

Louis selected **A · Klar** on 26 October 2026: white canvas, quiet pale-violet hero, dark text, grouped history and standings with fine dividers. Dark appearance keeps the existing violet design. Semantic colours live in `src/lib/theme.ts`; components read them through `useTheme()`.

The profile menu offers **Hell / Dunkel / System**, alongside language. The selection persists on this device and changes colours without remounting routes, clearing forms or closing the menu. System follows device changes while the app is open. With no device preference, the neutral appearance is light.

- Assumption: first use follows System; devices without an appearance preference use light. Wait for the saved preference before showing the app.
- Saving: disable the appearance controls and show pending feedback. Commit the new choice after storage succeeds.
- Save failure: retain the previous appearance and show a translated notice inviting another selection. Storage read failures surface through the root error boundary and its retry action.
- Selection is reversible. Appearance changes need no connection or server request. No quota, permission or stale-data state applies to the device preference.
- Empty, loading, error and offline data views retain their existing actions and use the same theme surfaces and readable text.
- Selected controls remain visibly marked and expose selection to accessibility tools. Native accessibilityState is paired with supported ARIA states for web: pressed on toggle buttons, selected on tabs, checked on checkboxes. Targets are at least 44 points. Appearance and language options wrap with their text at large font sizes; they never overlap or truncate. Normal text meets 4.5:1 contrast.
- Native headers, sheets, status bars, inputs, diagram baselines, seating surfaces and avatars follow the selected appearance. Avatar foreground is independent of page text.
- Small sign of care: the live buy-in dots remain static, match the number of actual buy-in records, and expose that count in the spoken player label. They are information; adjacent rebuy controls remain distinct. No new animation is required.

Do not build: alternate navigation, an additional appearance settings screen, decorative poker textures, or money celebration effects as part of this change.
