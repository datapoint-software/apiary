# Table

Tables list objects of one kind (routes, certificates, users) so people can scan, sort, select and act on them.

- The table sits flush inside a card. Header labels are small and `ink-3`, with no fill; rows divide with hairline `line`; no zebra stripes.
- **Grouped by project:** each project starts with a group row (`ap-group`) holding a disclosure button (`ap-group-title`, `aria-expanded`), the project name and a summary ("2 routes · 8 205 req/min"). Collapsing a group hides its rows.
- The first column names the object in the data face (a hostname), with its secondary detail under it in `caption`.
- Numbers align right in `ap-num` (data face, tabular figures). Missing values show "—".
- Status columns use Status, never colour alone. Feature lists use Tags.
- Selection: a checkbox column; selected rows get `aria-selected="true"` and `honey-soft`. Bulk actions appear above the table when something is selected.
- Row actions sit in a last ⋯ column opening a Menu. Clicking the row itself opens the object's detail.
- Sortable headers use `ap-sort` with `aria-sort`.
- Pagination (`ap-pager`) below, as "1–5 of 42 routes". Under 640px the table scrolls inside `ap-table-wrap`; long lists become cards (name, status, one key value).

**The consumer provides:** columns, rows, sort state, selection and the row actions.
