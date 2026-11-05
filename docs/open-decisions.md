# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

- **A path redirect next to a redirect of the whole hostname.** The prototype allows both on one hostname (`old.example.com` to one site, `old.example.com/docs` to another), with the longest path winning. Keep it, or allow only one kind per hostname?
- **Chains of redirects.** Redirecting `/a` to `/b` while `/b` redirects to `/c` is allowed, since it isn't a loop. Warn about it in the dialog, or leave it?
- **Editing redirects.** Redirects have no edit action, only delete and add again; with paths, a typo costs more. Add an edit action if people ask.
- **A visitor page for 413.** Apiary shows its own pages for 403, 404, 429 and 503, but a request over a route's size limit gets Kestrel's 413 with no body, so a browser uploading a form shows a blank error. Docker and other API clients only read the status. A page would need Apiary to answer the 413 itself, before Kestrel does, and is only worth it if browser uploads start hitting the limit.
- **Error codes for stacks.** The prototype proposes `route.declaredInStack` (changing a field a label sets), `route.hostInUse` (a hostname used outside the stack), `stack.removesEverything` and `auth.invalidToken`. Settle the names under [engineering.md](engineering.md#errors-are-codes-not-messages) when milestone 18 is built.
- **When a pipeline token needs a look.** The Pipeline tokens page flags tokens never used 7 days after they were created, unused for 30 days, or expiring within 30 days. The numbers are guesses; adjust them once teams use it.
- **Requiring a commit.** An apply with no commit or pipeline link found goes ahead with a warning. A `--require-commit` option could fail it instead, for teams that want every apply traced to a commit; add it if someone asks.
- **Reading `Forwarded` from trusted proxies.** Apiary reads only `X-Forwarded-For` and `X-Forwarded-Proto`. [RFC 7239](https://datatracker.ietf.org/doc/html/rfc7239)'s `Forwarded` is the standard, but few proxies send it; add it when one that only sends `Forwarded` needs to be trusted.
- **The PROXY protocol.** Load balancers that work at the TCP level, and stream routes, can't send headers. Accepting the PROXY protocol from trusted proxies would cover them; it needs its own design, since it changes how every connection on a port starts.
- **Presets for well-known CDNs.** Adding a CDN's published ranges by hand is tedious, but a list in the image goes stale between releases. For now, the help points at each provider's own list.
