# Menu

A menu lists actions or places, opened from a button: in the app, the account menu behind the avatar in the top bar.

- Menus (`ap-menu`) are a solid `surface` with `shadow-float`: they float above content, and nothing shows through. The highlighted item fills with honey, like a macOS menu.
- The account menu starts with a head (`ap-menu-head`): a large avatar, the name, the email and the role.
- Items are links when they go somewhere (`a.ap-menu-item`) and buttons when they act. Order by frequency; Sign out goes last, after a separator.
- Destructive items go last, after a separator, in `ap-menu-danger`, and end with "…" because they open a confirmation.
- Menus close on Escape, on selection and on a click outside; arrow keys move between items. The app uses the Angular CDK menu (`cdkMenu`, `cdkMenuItem`).
- The search results in the top bar reuse `ap-menu` as a `listbox`.
- **Not used in the app yet:** a ⋯ menu per row (tables use inline icon buttons), keyboard shortcuts (`ap-kbd`) and the tooltip (`ap-tooltip`).

**The consumer provides:** the items, their handlers, and the anchor button with `aria-haspopup="menu"`.
