# Table

Tables list objects of one kind (routes, certificates, users) so people can scan, filter, select and act on them.

- The table sits flush inside a panel. Header labels are small and `ink-3`, with no fill; rows divide with hairline `line`; no zebra stripes.
- **Filters** sit above the table in a toolbar (`ap-toolbar`, `role="search"`): a text filter (`ap-filter`, with a search icon), a Segmented control for status and a select for the project. Filters only change what's shown.
- **Grouped by project:** when every project is shown, each project starts with a group row (`ap-group`) with its name and a summary ("2 routes · 8 205 req/min").
- The first column names the object in the data face, as the link to its page (`ap-cell-main`), with its secondary detail under it in `caption`.
- Numbers align right in `ap-num` (data face, tabular figures). Missing values show "–". Changes show when and who: "2 h ago by ana@example.com".
- Status columns use Status, never color alone.
- **Selection:** a checkbox column, only for people who can act on the rows; selected rows get `aria-selected="true"` and `honey-soft`. A selection bar (`ap-selectbar`) appears above the table with the count, the bulk actions and **Clear selection**.
- **Row actions** are up to three ghost icon buttons in the last column (`ap-col-actions`), each with an `aria-label` naming the object: disable or enable, purge, delete.
- Under 640px the table scrolls inside `ap-table-wrap`.
- **Not used in the app yet:** sortable headers (`ap-sort`, `aria-sort`), collapsible groups, a ⋯ menu per row and pagination (`ap-pager`).

**The consumer provides:** columns, rows, filters, selection and the row actions.
