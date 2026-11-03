# SaveBar

The save bar sits at the bottom of a long form, like the route editor, and stays visible while you scroll.

- `ap-savebar` is sticky, 16px above the bottom of the window, a `surface` with `shadow-float`.
- Cancel is a ghost link back to where you came from; the primary button is last and names the result: "Create route" for a new object, "Save route" for an existing one, "Saving…" while it runs.
- Short forms end with their buttons in the panel foot instead.

**The consumer provides:** the labels and the submit and cancel handlers.
