# DisplaySettings

Display settings let each person adjust Apiary to how they see and read: appearance, text size, contrast and motion.

- Opened from the accessibility button in the top bar, as a solid popover (`ap-popover`, `role="dialog"`). Like every floating element it is solid, so nothing behind it competes with its controls. Escape or a click outside closes it and returns focus to the button.
- Each setting is a Segmented control. **Automatic** follows the operating system (`prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-motion`); the other options override it.
- The choice is set as an attribute on the root element (`data-theme`, `data-text`, `data-contrast`, `data-motion`), which `bundle.css` responds to, and saved in the browser's local storage only. Nothing reaches the server.
- **Text size** scales every font size, set in `rem`, to 112.5% or 125%. Layouts reflow; nothing is cut off.
- **More contrast** darkens secondary text, makes hairlines and control edges solid, outlines cards and buttons and thickens the focus ring.

**The consumer provides:** nothing; the component reads and writes the preferences itself.
