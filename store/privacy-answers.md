# Privacy and rating answers

Server: own API and Postgres database. No third-party analytics, ads or crash SDKs. Data is sent over HTTPS only.

## Apple: App Privacy

Does the app collect data? Yes.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info > Email Address | Yes | Yes | No | App Functionality (account, sign-in) |
| Contact Info > Name | Yes | Yes | No | App Functionality (shown to the group) |
| User Content > Other User Content (groups, games, buy-ins, cash-outs, results) | Yes | Yes | No | App Functionality |
| Identifiers, Usage Data, Diagnostics, Location, Financial Info | No | | | |

- Financial Info: No. The app stores plain numbers typed by users and handles no payments or card data.
- Tracking: No. No data is shared with data brokers or used for advertising. No ATT prompt needed.
- Privacy policy URL: `<origin>/privacy`
- Support URL: `<origin>/support`

## Google Play: Data safety

- Data collected: Yes. Data shared with third parties: No.
- Personal info > Email address: collected, not shared, required, purpose: App functionality, Account management.
- Personal info > Name: collected, not shared, required, purpose: App functionality, Account management.
- App activity > Other user-generated content (groups, games, buy-ins, results): collected, not shared, required, purpose: App functionality.
- Financial info: not collected.
- Location, contacts, photos, device or other IDs, diagnostics: not collected.
- Data encrypted in transit: Yes.
- Users can request data deletion: Yes. In the app (profile menu, delete account) and via `<origin>/support`.
- Data deletion URL: `<origin>/support`
- Independent security review: No.

## Rating

### Apple age rating
- Chosen: 4+. Gambling and Simulated Gambling: None, since the app has no gambling mechanics.
- Real-money gambling / contests: None.
- Unrestricted web access: No. User-generated content: only names and group names visible to invited members.
- Category: Utilities (fallback Lifestyle).

### Google Play content rating (IARC)
- Category: Utility, Productivity, Communication or Other (not Game).
- Gambling: the app has no real-money gambling. Simulated gambling: No. Poker is only the theme of the records kept.
- Users can interact or exchange content: only invited group members see names and game records.
- Shares location: No. Digital purchases: No.
- Target audience: 18+ only. Not designed for children. Not in Families program.
- Declarations: Contains ads: No. Is a gambling app (Play gambling declaration): No, because it offers no gambling and does not facilitate real-money play.
