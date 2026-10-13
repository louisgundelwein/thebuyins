# Privacy and rating answers

Status: source-based draft, not a verified submission declaration. See [release audit](release-audit.md) for evidence and outstanding checks.

Server: own API and Postgres database. No third-party analytics, ads or crash SDKs were found in the application source/dependency declarations reviewed. Production URLs use HTTPS; local development permits HTTP. Verify the submitted binaries, hosting, logs and processors before finalizing these answers.

## Apple: App Privacy

Does the app collect data? Yes.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info > Email Address | Yes | Yes | No | App Functionality (account, sign-in) |
| Contact Info > Name | Yes | Yes | No | App Functionality (shown to the group) |
| User Content > Other User Content (group names, game titles, guest names) | Yes | Yes | No | App Functionality |
| Identifiers > User ID | Yes | Yes | No | App Functionality (account and record relationships) |
| Financial Info > Other Financial Info (buy-ins, cash-outs, balances / settlement amounts) | Yes | Yes | No | App Functionality |
| Session IP address and user-agent; API request/error logs | Stored or logged by the server; final category requires review | Sessions are linked to user | No tracking found | Account security; review operational log use |
| Payment Info, Credit Info, Location, Contacts, Photos | Not found in reviewed app flows | | | |

- Payment/card processing: none found. This does not mean no financial information is collected: amounts are stored against players and used to calculate balances and who owes whom. The proposed Other Financial Info classification follows the stores' broad definitions, including debts.
- Do not answer all Identifiers, Usage Data or Diagnostics as “No”: user IDs exist, sessions store IP/user-agent, and the API logs method/path/status/duration and errors. Apple classifies IP data by its actual use; verify hosting and SDK behavior before selecting additional categories.
- Tracking: No. No data is shared with data brokers or used for advertising. No ATT prompt needed.
- Privacy policy URL: `https://thebuyins.com/privacy`
- Support URL: `https://thebuyins.com/support`

## Google Play: Data safety

- Data collected: Yes. No advertising/data-broker sharing was found. Confirm hosting/support processors and the applicable service-provider and user-initiated sharing exceptions before selecting “not shared”; group members see names and records.
- Personal info > Email address: collected, not shared, required, purpose: App functionality, Account management.
- Personal info > Name: collected, not shared, required, purpose: App functionality, Account management.
- Personal info > User IDs: collected, required for accounts, purpose: App functionality, Account management.
- App activity > Other user-generated content (group names, game titles, guest names): collected, purpose: App functionality. Creating these records is user-initiated; verify the required/optional answer per feature rather than marking all content required.
- Financial info > Other financial info: collected (player-linked buy-ins, cash-outs and calculated balances / debts), purpose: App functionality. No payment-card or bank-account collection found.
- Session IP/user-agent and API request/error logs: assess final categories, required/optional status and security purpose against production behavior. Stored session data is not ephemeral. Do not infer location collection merely from IP storage.
- Location, contacts and photos: no collection found in reviewed app flows. Verify device/other IDs and diagnostics against the actual release binary and infrastructure.
- Data encrypted in transit: production endpoints are configured for HTTPS; verify all release-binary traffic before confirming Yes.
- Users can request data deletion: Yes. In the app (profile > Account > Delete account) and via `https://thebuyins.com/support`.
- Data deletion URL: `https://thebuyins.com/support`
- Independent security review: No.

## Rating

The following are provisional positioning notes, not verified console answers or a guarantee of store eligibility. Complete the current questionnaires against the actual product.

### Apple age rating
- Complete the current age-rating questionnaire; do not select a rating merely as a “safe choice”. No simulated gambling mechanics were found in the reviewed code.
- Real-money gambling / contests: None.
- Unrestricted web access: No. User-generated content: only names and group names visible to invited members.
- Category: Utilities (fallback Lifestyle).

### Google Play content rating (IARC)
- Category: Utility, Productivity, Communication or Other (not Game).
- Gambling: the app has no real-money gambling. Simulated gambling: No. Poker is only the theme of the records kept.
- Users can interact or exchange content: only invited group members see names and game records.
- Shares location: No. Digital purchases: No.
- Target audience: 18+ only. Not designed for children. Not in Families program.
- Declarations: Contains ads: No. Is a gambling app (Play gambling declaration): No, is not established by the absence of payment processing. Review the applicable gambling policy for a companion ledger that records offline poker amounts and settlements before answering.

## Implemented deletion and remaining submission checks

The profile > Account screen calls `authClient.deleteUser({ password })`; the server enables Better Auth deletion. Public `/privacy` and `/support` routes are implemented. The support page offers an email deletion request without app access, not an automated web deletion form.

Deleting an account cascades its sessions, auth accounts and hidden-history rows. It sets `member.userId` and `buy_in.createdBy` to null, but preserves member display names, group/game records and amounts. This is not full erasure or guaranteed anonymization. Document retained data, purpose and retention periods in the public policy and verify the deletion workflow with a disposable account before submission.

Final store declarations, production processors/log retention, public-page rendering, demo access, age-rating/gambling classification and submission state remain unverified; see [release audit](release-audit.md).
