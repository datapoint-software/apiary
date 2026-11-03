# Button

Buttons start an action; their label says exactly what happens.

- **Shape:** every button is a pill (`radius-pill`), filled, with no border.
- **Primary** (`ap-btn ap-btn-primary`): honey fill, `on-honey` text. At most one per view: the action the page exists for (**Add route**, **Save changes**).
- **Secondary** (`ap-btn`): a `sunken` fill, for everything else that changes something.
- **Ghost** (`ap-btn ap-btn-ghost`): text in `honey-text` with no fill, for Cancel, Close and links that act; icon-only toolbar buttons.
- **Danger** (`ap-btn ap-btn-danger`): the destructive action itself, in a confirmation dialog, or a button in a danger zone that opens one ("Start recovery…", ending in "…").
- **Sizes:** `ap-btn-sm` (28px) in tables and filter bars, default 36px, `ap-btn-lg` (44px) on sign-in and setup screens.
- **Icon only** (`ap-btn-icon`): needs `aria-label` and a tooltip.
- **Busy:** while its action runs, a button is disabled with `aria-busy="true"` and its label says what is happening: "Saving…", "Working…", "Checking…".

**Copy:** verb plus object, sentence case: **Add route**, **Rotate root key**, **Delete route**. Never "OK", "Submit" or "Yes" on their own.

**Disabled:** use `disabled` and always explain why in a caption or tooltip next to it.

**In the library:** the `apButton` directive on a `<button>` or `<a>`: `apButton="primary"`, `"ghost"` or `"danger"`, and `size="small"`. Large buttons add `ap-btn-lg` themselves.

**The consumer provides:** the label, an optional Lucide icon placed before it, and the handler.
