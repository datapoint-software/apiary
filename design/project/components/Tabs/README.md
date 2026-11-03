# Tabs

Tabs split one object's settings or one area into views of the same level.

- **Link tabs** (`nav.ap-tabs` with `a.ap-tab`) when each view has its own URL, as in Account: Profile, Security, Active sessions. The current one has `aria-current="page"`.
- **Panel tabs** (`role="tablist"`, `button.ap-tab[role=tab]`) when the views share one page; the selected tab has `aria-selected="true"`.
- The current tab is `ink`, semibold, with a 2px `ink` underline; others are `ink-2`.
- Two to six tabs, named with nouns. A count (`ap-count`) only when it helps decide where to look.
- Tabs never hide unsaved changes: switching keeps what was typed.
- Under 640px the tab row scrolls sideways.

**The consumer provides:** the tab labels, the current tab and the links or panels (`role="tabpanel"`).
