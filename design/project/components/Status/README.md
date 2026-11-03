# Status

A status is a small dot and a word.

- Always both: the dot for scanning, the word for meaning. `ok` and `critical` have similar lightness, so color alone is never enough.
- Tones: `ap-status-ok` (Healthy, Valid, Approved), `ap-status-warn` (Degraded, Expires in N days, In maintenance), `ap-status-critical` (Down, Failed, Refused), `ap-status-info` (Catching up, Joining), `ap-status-off` (Disabled, Not configured).
- Words describe the state from the user's side: "Expires in 9 days", not "WARN".
- **Not used in the app yet:** `ap-status-honey` (for the leader) and the ring (`ap-dot-ring`, not yet in effect: pending approval, waiting for a deploy). The styles exist; the `<ap-status>` component's tones don't include them.

**In the library:** `<ap-status tone="ok">Healthy</ap-status>`, with the tones `ok`, `info`, `warn`, `critical` and `off`.

**The consumer provides:** the tone and the word.
