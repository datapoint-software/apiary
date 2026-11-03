# Split

A split bar shows how a route's traffic is divided between target groups by weight.

- Segment widths match the weights exactly. The first group is `ink`, the canary `honey`, a third `line-strong`; more than three groups are listed, not drawn.
- Label each segment with the group and its share; when a segment is too narrow, keep only the share.
- Give the bar `role="img"` and an `aria-label` with every group and share.
- A caption below names anything else that changes who goes where: sticky sessions, header or cookie selection.

**The consumer provides:** the groups and their weights.
