# Menu

A menu lists actions on one object, opened from a row's ⋯ button; the tooltip explains a control in one sentence.

- Menus (`ap-menu`) are a solid `surface` with `shadow-float`: they float above content, and nothing shows through. The highlighted item fills with honey, like a macOS menu.
- Order items by frequency; destructive items go last, after a separator, in `ap-menu-danger`, and end with "…" because they open a confirmation.
- Show a keyboard shortcut with `ap-kbd` only when one exists.
- Menus close on Escape, on selection and on a click outside; arrow keys move between items.
- **Tooltip** (`ap-tooltip`): for icon-only buttons and disabled controls. One sentence, no actions inside, never the only place important information lives.

**The consumer provides:** the items, their handlers, and the anchor button with `aria-haspopup="menu"`.
