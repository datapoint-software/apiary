# Banner

A banner reports a condition that affects the whole page or cluster and stays until the condition ends.

- **Critical:** something is not working (writes paused, a replica down). Use `role="alert"`.
- **Warn:** something will stop working unless someone acts (certificates expiring, rotation stalled).
- **Info:** a process is running (rotation in progress, an update rolling out).
- **Ok:** a lasting confirmation that needs a follow-up, such as how to store a backup. A short confirmation is a Toast instead.
- Title says what is happening; the body says the consequence and what still works; an optional link says what to do.
- At most two banners per page, most severe first. Banners never stack inside panels.

**The consumer provides:** the tone, an icon (Lucide `octagon-alert`, `triangle-alert`, `info`, `circle-check`), the title, body and optional actions.
