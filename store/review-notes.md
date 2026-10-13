# Review notes (Apple App Review and Google Play app access)

## What the app is
The Buy-Ins is a ledger and scorekeeper for private home poker games among friends. Users record who bought in, who rebought and who cashed out, and the app calculates the result per player and a short list of who pays whom.

## Guideline 5.3 (gambling) positioning
- The app moves no money. There are no payments, no payment links, no wallet, no in-app purchases.
- There is no betting, no wagering, no odds, no cards, no dealing and no gameplay of any kind. Poker is played offline at a real table. The app is not a game.
- Nothing can be won or lost inside the app. Amounts are plain numbers typed in by users, like entries in a notebook.
- The "who pays whom" screen is a calculation only. Players settle among themselves outside the app.
- The app does not connect users with games, operators or strangers. Groups are private and join-by-invite (link or six-character code).
- Category: Utilities. Intended audience: adults, 18+.

## Demo access — not yet verified
No working review login or populated demo group has been verified in this audit. Do not submit these notes until the access checks in [release audit](release-audit.md#demo-access-checklist) pass.

Provide the actual email/password only in App Store Connect review information and Google Play Console app access, never in this repository, PR comments, screenshots or logs. The app implements email/password sign-in; the server enables that provider without requiring email verification in its explicit configuration. Actual production access must still be tested.

Required fixture (to create or verify, not a claim that it exists): a dedicated demo account with access to “Freitagsrunde”, four synthetic guests, three finished games and one running game “Heute”. Give the reviewer admin permissions if admin removal/deletion features are to be exercised. Use synthetic records and keep a reset procedure ready after destructive review actions.

## Quick test flow
After verifying the fixture and credentials:
1. Sign in with the demo account (email and password).
2. On the Overview tab, open the group (the group switcher is top left).
3. Tap "New game" / "Neues Spiel", choose players, tap "Start game" / "Spiel starten". If a live game already exists, inspect and settle that game first before creating another.
4. On the live game screen, tap the "+" chip next to a player to add a rebuy. Remove an entry with the cross in the list.
5. Optionally use "Plätze auslosen" (seat draw).
6. Tap "Abrechnen" (settle), enter chips per player (a cash-out), tap "Abschließen".
7. The result screen shows each player's net and "Wer zahlt wen" (who pays whom). The finished game appears in the history tab with the leaderboard and balance chart.

The app UI is available in English and German. It follows the device language and can be switched in the profile menu (avatar top right, "Language"). Amounts are in euros.

## Other features
- Members screen (group switcher, top left, "Members"): see members, leave the group. Group admins can remove members.
- "Remove from my history" on a finished game hides it only for the current user; other players keep it.
- Games of groups you left are in the profile menu under "Archive".

## Account deletion
Account deletion is in the app: tap the avatar at the top right, then "Account", then "Account löschen" and confirm with the password. Without app access, request deletion by emailing the contact on https://thebuyins.com/support from the registered email address. The page promises processing within 30 days; this is a manual support process, not a web deletion form.

Account deletion removes authentication records but keeps group member names and game amounts/history as guest records. Do not describe it as erasing all player data. Validate deletion with a separate disposable account and restore review access if the demo account is deleted.

## Other
- Sign-in is email and password only. No third-party login.
- No ads, no third-party analytics, no tracking.
- Contact: `lmgzero@proton.me`
