# Button

Buttons start an action; their label says exactly what happens.

- **Shape:** every button is a pill (`radius-pill`), filled, with no border.
- **Primary** (`ap-btn ap-btn-primary`): honey fill, `on-honey` text. At most one per view: the action the page exists for (**Add route**, **Save changes**).
- **Secondary** (`ap-btn`): a `sunken` fill, for everything else that changes something.
- **Ghost** (`ap-btn ap-btn-ghost`): text in `honey-text` with no fill, for Cancel, Close and links that act; icon-only toolbar buttons.
- **Danger** (`ap-btn ap-btn-danger`): only inside a confirmation dialog, for the destructive action itself.
- **Sizes:** `ap-btn-sm` (28px) in tables and filter bars, default 36px, `ap-btn-lg` (44px) on setup screens and touch layouts.
- **Icon only** (`ap-btn-icon`): needs `aria-label` and a tooltip.

**Copy:** verb plus object, sentence case: **Add route**, **Rotate root key**, **Delete route**. Never "OK", "Submit" or "Yes" on their own.

**Disabled:** use `disabled` and always explain why in a caption or tooltip next to it.

**The consumer provides:** the label, an optional Lucide icon placed before it, and the handler.
