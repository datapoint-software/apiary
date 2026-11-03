# Banner

A banner reports a condition that affects the whole page or cluster and stays until the condition ends.

- **Critical:** something is not working (writes paused, a replica down, an action that failed). Give it `role="alert"` when it appears after the page loaded, so screen readers announce it.
- **Warn:** something will stop working unless someone acts (certificates expiring, rotation stalled).
- **Info:** a process is running (rotation in progress, an update rolling out).
- **Ok:** a lasting confirmation that needs a follow-up, such as how to store a backup. A short confirmation is a Toast instead.
- Title says what is happening; the body says the consequence and what still works; an optional link says what to do.
- At most two banners per page, most severe first. Inside a dialog, a critical banner reports why its action failed.
- The icon follows the tone: Lucide `circle-alert`, `triangle-alert`, `info` and `circle-check`.

**In the library:** `<ap-banner tone heading role>` picks the icon; actions go in an element marked `bannerActions`.

**The consumer provides:** the tone, the title, body, optional actions and, when it should be announced, the role.
