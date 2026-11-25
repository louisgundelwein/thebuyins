# The Buy-Ins · poker night draft

Audience: US adult private poker hosts. English. 8 seconds, 9:16. Draft for review.

| Start | Duration | Message / action | Source / sound |
| --- | --- | --- | --- |
| 0 | 2 | “Wait, who bought in twice?” over a warm kitchen table and scattered chips | Original illustrated scene; synthesized chip clacks |
| 2 | 4 | Hard cut to genuine USD results, “Who pays whom” legible | Unchanged app at 05418b4, isolated local web build, fictional mock API |
| 6 | 2 | “Settle your poker night. The Buy-Ins.” | Brand purple closing lockup |

Assumption: illustrated kitchen setting is suitable for this first draft. Subtitles carry the exact script; no voice provider was requested. No music needed for this brisk cut. Sound is original synthesized chip clacks, not a field recording.

Fictional fixture: Alex buys in $40 and cashes out $70; Jamie buys in $40 and cashes out $25; Sam buys in $20 and cashes out $5. Pot $100; Jamie and Sam each pay Alex $15. These are demonstration records, not customer data.

Capture: temporary archive of commit 05418b4 at /tmp/buyins-ad-build. Only its local environment config changes; original app source stays unchanged. Dedicated ports 18764 (app), 18765 (mock). No production or existing preview touched.

Editable composition uses HyperFrames 0.9.96 and GSAP. The source includes the frozen app capture. Rendered previews live outside git. Run instructions and verification are recorded after capture.

Verification: encoded draft is exactly 8.000 seconds, 1080×1920, 30 fps, with video and audio streams (ffprobe). Decoded result frame confirms both $15 transfers remain visible. HyperFrames check passed with zero errors; remaining warnings include social-platform safe zones and decorative contrast. Encoded audio measured; not auditioned. Draft and proof frames: `/home/louis/.t3/attachments/buyins-poker-night/{draft.mp4,hook.png,result.png,close.png}`.
