# Privacy and rating answers

Server: own API and Postgres database. Since 1.0.2 the iOS and Android apps show Google AdMob ads (Google Mobile Ads SDK with Google UMP consent) and sell ad-free through Apple/Google in-app purchase (expo-iap, talks only to the store; no data to us). No other third-party SDKs. Data is sent over HTTPS only.

Ad rows below follow Google's SDK privacy manifest (checked in GoogleMobileAds 13.13.0; the app ships 13.10.0) and Google's Play data disclosure page.

## Apple: App Privacy

Does the app collect data? Yes.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info > Email Address | Yes | Yes | No | App Functionality (account, sign-in) |
| Contact Info > Name | Yes | Yes | No | App Functionality (shown to the group) |
| User Content > Other User Content (groups, games, buy-ins, cash-outs, results) | Yes | Yes | No | App Functionality |
| Identifiers > Device ID (AdMob) | Yes | Yes | Yes | Third-Party Advertising, Developer's Advertising or Marketing, Analytics |
| Location > Coarse Location (AdMob, from IP) | Yes | Yes | No | Third-Party Advertising, Developer's Advertising or Marketing, Analytics |
| Usage Data > Advertising Data (AdMob) | Yes | Yes | No | Third-Party Advertising, Developer's Advertising or Marketing, Analytics |
| Usage Data > Product Interaction (AdMob) | Yes | Yes | No | Third-Party Advertising, Developer's Advertising or Marketing, Analytics |
| Diagnostics > Performance Data, Other Diagnostic Data (AdMob) | Yes | No | No | Third-Party Advertising, Developer's Advertising or Marketing, Analytics |
| Diagnostics > Crash Data (AdMob) | Yes | No | No | Analytics |
| Financial Info, Precise Location, Contacts | No | | | |

Precise location stays "No": the app never asks for location permission, so neither Google nor its ad partners (listed in the consent dialog) can read GPS. The consent dialog still offers the precise-geolocation purpose because it is Google's standard partner text.

- Financial Info: No. The app stores plain numbers typed by users and handles no payments or card data. The "Werbefrei" in-app purchase runs through Apple and Google; the app keeps no purchase data on its server.
- Tracking: Yes. The advertising identifier is used for personalized ads after Apple's tracking prompt (ATT).
- Privacy policy URL: `<origin>/privacy`
- Support URL: `<origin>/support`

## Google Play: Data safety

- Data collected: Yes. Data shared with third parties: Yes (Google AdMob, for ads).
- Personal info > Email address: collected, not shared, required, purpose: App functionality, Account management.
- Personal info > Name: collected, not shared, required, purpose: App functionality, Account management.
- App activity > Other user-generated content (groups, games, buy-ins, results): collected, not shared, required, purpose: App functionality.
- Location > Approximate location (AdMob, from IP): collected and shared, required, purpose: Advertising or marketing, Analytics, Fraud prevention.
- App activity > App interactions (AdMob): collected and shared, required, purpose: Advertising or marketing, Analytics, Fraud prevention.
- App info and performance > Diagnostics (AdMob): collected and shared, required, purpose: Advertising or marketing, Analytics, Fraud prevention.
- Device or other IDs > advertising ID, app set ID (AdMob): collected and shared, required, purpose: Advertising or marketing, Analytics, Fraud prevention.
- Financial info, precise location, contacts, photos: not collected.
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
- Shares location: No. Digital purchases: Yes (one-time "Werbefrei" in-app purchase).
- Target audience: 18+ only. Not designed for children. Not in Families program.
- Declarations: Contains ads: Yes. Advertising ID: Yes, used for Advertising or marketing, Analytics and Fraud prevention. Is a gambling app (Play gambling declaration): No, because it offers no gambling and does not facilitate real-money play.
