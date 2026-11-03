# Panel

A panel groups one topic on a page: a settings section, a list, a table.

- `ap-panel` is a `surface` card with `shadow-card`. Give it a `section` with `aria-labelledby` pointing at its heading.
- **Head** (`ap-panel-head`): an `h2` in `title-3` and an optional description (`ap-panel-desc`, at most two lines); panel-level actions sit on the right.
- **Body** (`ap-panel-body`) for content with padding; tables sit flush, without a body.
- **Foot** (`ap-panel-foot`) for the panel's own Save, aligned right, when the panel saves on its own.
- **Lists** (`ap-list`, `ap-list-row`): one setting or action per row, its text (`ap-list-text`, a bold name and a `muted` sentence) on the left and its control on the right.
- **Danger zone** (`ap-panel-danger`, a faint critical ring): the last panel on a page, titled "Danger zone", for actions that can't be undone. Each is a list row with a danger button that ends in "…" and opens a confirmation.

**The consumer provides:** the heading, the description and the content.
