# Store readiness audit — 2026-10-13

## Scope and current state

Reviewed `main` at `7c71db3609a9b21cc06dde8b711adeb6ebab39c2`, including the changes merged from PR #4 and the subsequent PR #6 fixes. GitHub reports [PR #4](https://github.com/louisgundelwein/thebuyins/pull/4) merged at 2026-10-13 12:52:04 UTC. Its `release/stores` branch no longer exists. Corrections therefore belong in a follow-up PR, not in the merged PR.

This is a static source/configuration audit plus public HTTP checks. No production database, credentials, signed mobile binary or store-console submission history was available for verification. No account was created/deleted and no release/upload script was executed. No successful Apple/Google submission is confirmed.

## Evidence and conclusions

| Area | Source evidence | Implemented / remaining |
|---|---|---|
| Languages | `apps/app/src/lib/i18n.ts`, `language.tsx`, `components/top-bar.tsx`, `app.json` | DE and EN dictionaries; device default and profile language switch. Review notes already describe both languages on current main. Device/binary UI checks remain. |
| Account deletion | `apps/app/src/app/(app)/account.tsx`, `apps/server/src/auth.ts` | Password-confirmed `deleteUser` call and enabled server deletion. End-to-end deletion remains untested. |
| Retained data | `apps/server/src/db/schema/auth.ts`, `poker.ts` and migrations | Auth accounts/sessions/hidden-game entries cascade on user deletion; member user ID and buy-in creator become null. Member display names and shared game/seat/buy-in amounts survive. Names make these records potentially identifiable. |
| Guest claiming | `apps/server/src/routes/groups.ts` | Invite join can claim an unlinked guest and attach a new user ID. A deleted account's surviving guest record can therefore be re-linked; do not call it irreversibly anonymized. |
| Public policy/support | `apps/app/src/app/privacy.tsx`, `support.tsx`, `_layout.tsx`, `apps/server/src/index.ts` | Public routes outside authenticated app group; SPA fallback serves web build. HTTPS HEAD requests returned 200 for both production URLs on audit date. Both responses were 1,216-byte HTML: this verifies an HTTP shell, not that policy/support content renders without login. Browser rendering remains unverified. |
| Manual deletion request | `apps/app/src/lib/i18n.ts`, `legal.ts` | Support text asks for email from the registered address and promises deletion within 30 days. Mailbox access, identity checks, processing and retention handling are operational prerequisites. |
| Identifiers and security data | `apps/server/src/db/schema/auth.ts`, `auth.ts` | Assigned user IDs; session token, expiry, user ID, IP address and user-agent fields. IP is configured from `x-forwarded-for`. Determine which fields production actually populates; stored security sessions cannot be dismissed as ephemeral. |
| Financial records | `apps/server/src/db/schema/poker.ts`, `packages/core/src/settlement.ts`, server routes | Buy-in/rebuy amounts and cash-outs in cents, linked to members; balances and settlements calculated from records. No payment/card processing found. Proposed Other Financial Info classification includes debts; absence of payments does not justify “no financial data”. |
| Logs | `apps/server/src/app.ts` | API method/path/status/duration logging and `console.error`. Review actual error payloads, reverse-proxy logs, processors, access and retention before deciding diagnostics/app activity categories. No third-party crash SDK does not mean no logs. |
| Optional schema fields | `apps/server/src/db/schema/auth.ts`, `components/auth-form.tsx` | Image and OAuth token columns exist, but reviewed UI enables name/email/password only. Schema capacity alone is not proof that photos or OAuth data are collected. |
| Dependencies/traffic | app/server package manifests, `apps/app/src/lib/api.ts`, `auth.ts`, `.env.production` | Own API configured at `https://thebuyins.com`, native cookies via SecureStore; no ads/analytics integration found. Release SDK/manifests/network capture and hosting processor review remain necessary. Development HTTP fallback exists. |
| Review access | `components/auth-form.tsx`, `apps/server/src/auth.ts` | Email/password supported; no explicit verification requirement. No demo provisioning/seed procedure found in repository search. Existing production demo account/fixture is unknown. |
| Release scripts | `apps/app/scripts/release-ios.sh`, `release-android.sh` | Scripts exist; this proves neither successful signing nor submission. iOS uploads by default unless `--no-upload`; Android builds an AAB. Do not execute upload without explicit authorization. |

## Demo access checklist

- [ ] Confirm or create a dedicated synthetic review account on the same backend used by the submitted builds. Keep credentials in a secret manager and store-console access fields only.
- [ ] Verify fresh email/password login on signed iOS and Android builds, including session restoration after restart. Ensure no OTP, private network, expired account or device-specific restriction blocks reviewers.
- [ ] Confirm “Freitagsrunde”, four synthetic guests, three finished games and one live “Heute” game; verify history, leaderboard and balance chart against actual records. Screenshots are not evidence of production fixtures.
- [ ] Confirm admin role if reviewing member removal and game deletion. Test invite join, rebuy, seating, settlement and language switching with the supplied instructions.
- [ ] Keep demo data isolated from real players; reset it after destructive tests. Use a separate disposable account for deletion checks and re-create review access if reviewers delete the demo account.
- [ ] Transfer tested credentials privately into both consoles and record test date/build versions in private release records. Remove unverified fixture assertions from submitted review notes.

## Remaining submission prerequisites

1. **Deletion/retention:** test deletion against a disposable account and inspect database effects/session revocation. Decide how retained names and game records are handled, including guest re-linking. Public policy currently omits retention periods and retained records after deletion; resolve before submission. In both languages the policy calls passwords “encrypted”; confirm Better Auth's actual password storage and use accurate wording. The policy's EU-hosting claim needs infrastructure evidence.
2. **Public pages:** verify rendered policy and support content in a signed-out browser on desktop/mobile. The shared language provider uses SecureStore without a visible web fallback; specifically test this path rather than trusting HTTP 200. Confirm support-mailbox operation and the advertised 30-day request process.
3. **Final declarations:** verify actual populated auth fields, SDK/binary traffic, native privacy manifests/permissions, proxy/application log contents, retention, backups and hosting/support processors. Finalize Apple/Google category, purpose, sharing and optionality answers against that evidence; source code cannot establish all production behavior.
4. **Policy/rating:** review current gambling/companion-app policies and age-rating questionnaires against the ledger's actual offline-money purpose. No payment processing or gameplay is useful evidence, not an eligibility guarantee. Confirm listings and screenshots match the submitted versions in both languages.
5. **Build/console:** confirm signing, unique build numbers/version codes, production backend, device launch/navigation, store metadata and tested reviewer access. Consult console records to establish any actual uploads/submissions. Do not equate scripts or checked-in screenshots with successful release.

## Validation performed

- Read app authentication, language/profile/account/legal flows, server authentication, routing/middleware, schema/migrations, settlement logic, manifests and release scripts.
- Searched the repository for demo/seed provisioning and analytics/crash integrations; no demo implementation was found.
- Public HTTPS HEAD checks returned 200 for `/privacy` and `/support`; full browser/mobile rendering was not tested.
- Documentation-only changes: no runtime code changed. `git diff --check` and Markdown link/placeholder checks are run before committing; app lint/typecheck/mobile tests are not claimed.

## References for declaration review

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/): account IDs, other financial information and classification of IP data by actual use.
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469): user IDs, financial data, off-device collection, sharing exceptions and ephemeral processing.

The financial category is a source-backed interpretation of these definitions, not a reviewed console declaration. Operational data and store eligibility still need confirmation.
