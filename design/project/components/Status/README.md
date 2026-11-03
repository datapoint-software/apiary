# Status

A status is a small dot and a word.

- Always both: the dot for scanning, the word for meaning. `ok` and `critical` have similar lightness, so color alone is never enough.
- Tones: `ap-status-ok` (Healthy, Valid, Approved), `ap-status-warn` (Degraded, Expires in N days), `ap-status-critical` (Down, Failed, Refused), `ap-status-info` (Catching up, Follower), `ap-status-off` (Disabled, Not configured), `ap-status-honey` (Leader only).
- A ring (`ap-dot-ring`) instead of a dot means not yet in effect: pending approval, draft, waiting for a deploy.
- Words describe the state from the user's side: "Expires in 9 days", not "WARN".

**The consumer provides:** the tone and the word.
