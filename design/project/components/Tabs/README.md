# Tabs

Tabs split one object's settings or one list into views of the same level.

- The selected tab is `ink`, semibold, with a 2px `ink` underline and `aria-selected="true"`; others are `ink-2`.
- Two to six tabs, named with nouns. A count (`ap-count`) only when it helps decide where to look.
- Tabs never hide unsaved changes: switching keeps what was typed.
- Under 640px the tab row scrolls sideways.

**The consumer provides:** the tab labels, the selected tab and the panels (`role="tabpanel"`).
