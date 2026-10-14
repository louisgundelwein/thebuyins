# Review notes (Apple App Review and Google Play app access)

## What the app is
The Buy-Ins is a ledger and scorekeeper for private home poker games among friends. Users record who bought in, who rebought and who cashed out, and the app calculates the result per player and a short list of who pays whom.

## Guideline 5.3 (gambling) positioning
- The app moves no money. There are no payments, no payment links, no wallet, no in-app purchases.
- There is no betting, no wagering, no odds, no cards, no dealing and no gameplay of any kind. Poker is played offline at a real table. The app is not a game.
- Nothing can be won or lost inside the app. Amounts are plain numbers typed in by users, like entries in a notebook.
- The "who pays whom" screen is a calculation only. Players settle among themselves outside the app.
- The app does not connect users with games, operators or strangers. Groups are private and join-by-invite (link or six-character code).
- Category: Utilities.

## Guideline 4.3: what makes the app different
The Buy-Ins is built for a regular group of friends over many game nights, not for a single evening:
- Private groups shared by all members. During a live game every phone at the table stays in sync, so everyone sees the same pot and rebuys.
- The host can add friends without an account as guests. When they sign up later, they take over their history.
- Random seat draw for the table.
- Settle-up with as few payments as possible. If the chip count does not match the pot, the difference can be spread fairly across the cash-outs.
- History, leaderboard and a balance chart across all game nights of a group.

The app is built from scratch by us, with its own design. No template and no app generation service. The source code is public: https://github.com/louisgundelwein/thebuyins (full commit history).

## Accounts and group content
- An account is required because games are shared: several phones edit the same game, invites need an identity, and guests take over their history after sign-up.
- Other users only see display names, group names and game titles inside a private, invite-only group. No public content, no chat, no way to find strangers.
- Group admins can remove members, anyone can leave a group. Concerns can be reported via https://thebuyins.com/support or lmgzero@proton.me.

## Demo account
- Email: `<DEMO_EMAIL>`
- Password: `<DEMO_PASSWORD>`
The demo user is a member of the group "Freitagsrunde" with four guests, three finished games (history, leaderboard and balance chart are filled) and one running game "Heute" for the live tab.

## Quick test flow
1. Sign in with the demo account (email and password).
2. On the Overview tab, open the group (the group switcher is top left).
3. Tap "Neues Spiel" (new game), choose players, tap "Spiel starten".
4. On the live game screen, tap the "+" chip next to a player to add a rebuy. Remove an entry with the cross in the list.
5. Optionally use "Plätze auslosen" (seat draw).
6. Tap "Abrechnen" (settle), enter chips per player (a cash-out), tap "Abschließen".
7. The result screen shows each player's net and "Wer zahlt wen" (who pays whom). The finished game appears in the history tab with the leaderboard and balance chart.

The app UI is available in English and German. It follows the device language and can be switched in the profile menu (avatar top right, "Language"). Amounts are in euros.

## Other features
- Members screen: group switcher, top left, "Members".
- "Remove from my history" on a finished game hides it only for the current user; other players keep it.
- Games of groups you left are in the profile menu under "Archive".

## Account deletion
Account deletion is in the app: tap the avatar at the top right, then "Account", then "Account löschen" and confirm with the password. Deletion is also possible through the support page at `<origin>/support`.

## Other
- Sign-in is email and password only. No third-party login.
- No ads, no third-party analytics, no tracking.
