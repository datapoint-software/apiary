# Shell

The shell frames every page: sidebar, top bar and content area.

- **Sidebar** (`ap-side`, `sidebar` wide): on `ground` with a hairline edge, with the Apiary name after a honey hexagon, the Overview, then navigation grouped under an `overline`: Projects (each with its route count), Traffic, Cluster, Access. Up to 7 items per group. The current page has `aria-current="page"` and `honey-soft`. Counts in `ap-count`; an item needing attention shows a status dot instead of a number.
- **Attribution:** the sidebar footer shows the Datapoint logo, "Based on Apiary by Datapoint - Sistemas de Informação, Lda.", the version, the licence and a link to the source. Required by the licence in every version: never remove it.
- **Top bar** (`ap-top`, 52px, sticky, on `ground` with a hairline below): the sidebar button, global search with its shortcut, the cluster's write status (Status: "3 of 3 voters"), the display and accessibility button, and the account.
- **Account menu:** the avatar is a button (`aria-haspopup="menu"`) that opens a Menu anchored below it, right-aligned: a header with the user's name, email and role, then Your account, Security, Active sessions, and Sign out last, after a separator. Sign out is a plain item, not a danger one: it loses nothing. Arrow keys move, Escape closes and returns focus to the avatar.
- **Content** (`ap-content`): breadcrumb starting with the cluster's name, the page title (`title-1`, one per page), then the page. At most `content-max` wide.
- **Collapsing:** the sidebar button at the left of the top bar (or Ctrl or ⌘ + B) collapses the sidebar to icons (`sidebar-collapsed`, 68px) with a 300ms animation; labels and group titles fade, and each icon shows its label in a tooltip on hover and focus. The button stays in the same place in both states. The choice is remembered in the browser; below 1024px the sidebar starts collapsed.
- **Phones:** under 640px the same button opens the sidebar as a drawer that slides in from the left over a scrim. Focus moves into it and stays there; Escape or the scrim closes it.
- **About Apiary:** the last sidebar item opens a dialog with the version, the attribution, the licence and a link to the source, so the attribution stays reachable when the sidebar is collapsed.
- **Skip link:** "Skip to content" is the first focusable element and jumps to `main`.

**The consumer provides:** the cluster name, the navigation with counts, the page title and content.
