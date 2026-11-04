# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

- **A visitor page for 413.** Apiary shows its own pages for 403, 404, 429 and 503, but a request over a route's size limit gets Kestrel's 413 with no body, so a browser uploading a form shows a blank error. Docker and other API clients only read the status. A page would need Apiary to answer the 413 itself, before Kestrel does, and is only worth it if browser uploads start hitting the limit.
- **Error codes for stacks.** The prototype proposes `route.declaredInStack` (changing a field a label sets), `route.hostInUse` (a hostname used outside the stack), `stack.removesEverything` and `auth.invalidToken`. Settle the names under [engineering.md](engineering.md#errors-are-codes-not-messages) when milestone 18 is built.
- **When a pipeline token needs a look.** The Pipeline tokens page flags tokens never used 7 days after they were created, unused for 30 days, or expiring within 30 days. The numbers are guesses; adjust them once teams use it.
- **Requiring a commit.** An apply with no commit or pipeline link found goes ahead with a warning. A `--require-commit` option could fail it instead, for teams that want every apply traced to a commit; add it if someone asks.
