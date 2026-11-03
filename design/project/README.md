Apiary's admin interface is where operators keep a reverse proxy cluster running: routes, certificates, replicas, users and the audit log. People open it to change something or to find out why something is wrong, often under pressure. The system is built for that: calm by default, so that what needs attention stands out.

The look is clean and quiet, in the spirit of Apple's interfaces: system type, generous space, soft cards on a light grey ground, and solid surfaces throughout: nothing is translucent, so nothing competes with what you are reading. The name comes from the place where beehives are kept, and the system takes one shape from it: the hexagon, kept for the brand mark, the replicas in the cluster map and empty states. Nothing else is decorated.

## Principles

1. **Traffic first.** Routes, certificates and replicas fill the screen. No illustrations, no decorative cards, no hero banners.
2. **One primary action per view.** Each page has one title (`title-1`) and at most one button in `honey`.
3. **State is visible without reading, and readable without colour.** Every state has a dot and a word. `ok` and `critical` have similar lightness, so colour alone never carries meaning.
4. **Solid, never translucent.** Everything is opaque. What floats above the page (menus, popovers, dialogs, toasts) is a solid `surface` with `shadow-float`, so text behind it never shows through.
5. **Say what happens to the cluster.** Every change reports how many replicas applied it, and every risky action says what still works and what stops.

## Voice and content

- Write in English, in sentence case, in the second person when addressing people: "Type the hostname to confirm."
- Buttons are a verb and an object and say exactly what happens: **Add route**, **Rotate root key**, **Delete route**. Never "OK", "Submit" or "Yes" alone.
- Confirmations repeat the verb in the past tense and add the cluster fact: **Save route** → "Route saved. Applied on 3 of 3 replicas."
- Errors say what is wrong and how to fix it, without apologies: "Ports go from 1 to 65535." not "Invalid input".
- Name things as operators know them: "Writes are paused", not "Raft quorum lost". Use the technical term once, in a link or help text, when it helps people search.
- Technical values (hostnames, IP addresses, ports, paths, IDs, commands, versions) are always in the data face, in `ap-data` or `ap-code`, and never translated.
- Numbers: a space between thousands (`12 480`), a dot for decimals (`0.2%`), units after the value with a space (`39 ms`, `24 h`). Times in 24-hour format and UTC: `2026-11-02 14:32 UTC` in detail views, relative times ("12 minutes ago") only in lists.
- No emoji and no exclamation marks.
- Never show secrets in the interface: no private keys, passwords, tokens or the root key, not even masked.

## Colour

The palette is Apple's light neutral greys (and true black in the dark theme) with one warm colour: **honey**.

- Page background in `ground`. Cards, tables and forms in `surface`, with `shadow-card` and no border. Secondary buttons, segmented controls, tags and code in `sunken`.
- Text in `ink`; secondary text and icons in `ink-2`; placeholders, captions and timestamps in `ink-3`.
- `honey` is the brand and the primary action: the primary button, checked boxes, the highlighted menu item, the leader replica, the canary group, sparklines. It is a fill only: text on it is always `on-honey`, and honey text uses `honey-text`. Selected rows and the current navigation item use `honey-soft`.
- States: `ok`, `warn`, `critical` and `info` for dots and their words; the `-soft` variants for banner backgrounds. `warn` is a burnt orange, darker than honey, so the two never compete.
- Proportion on a typical screen: about 90% neutrals, the rest honey and states. If a screen looks yellow, there is too much honey.
- The dark theme is not an inversion: a true black `ground`, surfaces that get lighter as they come closer (`ground` < `surface` < `sunken`), honey stays honey, and state colours brighten to keep their contrast.

## Surfaces

- Page, sidebar and top bar on `ground`; the sidebar and top bar are separated from the content by a `line` hairline.
- Cards, tables and forms on `surface` with `shadow-card`.
- Menus, tooltips, popovers, dialogs and toasts on `surface` with `shadow-float` and a `line` edge. No transparency and no backdrop blur anywhere.

## Typography

One family, the operating system's own: San Francisco on Apple devices, Segoe UI on Windows, Roboto on Android. Nothing is downloaded, and Apiary feels native everywhere. It looks slightly different per platform; that is accepted.

- `--font-display` (SF Pro Display where available): headings, `display`, `title-1`, `title-2`, `title-3`, and stat values (`data-lg`). Bold and tightly tracked (`-0.022em` at `title-1`).
- `--font-text` (SF Pro Text where available): everything else, `body`, `body-sm`, `label`, `caption`, `overline`.
- `--font-data` (SF Mono, Cascadia Mono, Menlo, Consolas): `data`, for hostnames, IPs, ports, commands and IDs. Always with `font-variant-numeric: tabular-nums`.

Rules:

- One `title-1` per page. Section and card titles in `title-2`, field groups and project names in `title-3`.
- `overline` is sentence case in `ink-3`, for navigation groups and short labels above titles. No uppercase labels.
- Numbers in tables align right, in `data`.
- Running text at most 70 characters wide.

## Space and layout

- 4px grid: `space-1` (4px) to `space-8` (64px). No values outside the scale.
- Between fields: `space-4`. Between field groups: `space-5`. Between page sections: `space-5`.
- Panel padding: `space-5`, `space-4` under 640px.
- Control heights: `control-md` (36px) by default, `control-sm` (28px) in tables and filter bars, `control-lg` (44px) on setup screens and touch layouts.
- Lists and dashboards at most `content-max` wide; forms at most `form-max`, in one column.
- Breakpoints: 640px (phone), 1024px (tablet), 1440px (wide).
- The shell: a `sidebar`-wide navigation with task groups, a 56px top bar, and the content. See Shell.

## Shape

- Radii: `radius-1` (6px) for checkboxes, tags, code and menu items; `radius-2` (10px) for fields, menus, banners, toasts and segmented controls; `radius-3` (18px) for cards and dialogs; `radius-pill` for buttons, switches and counts.
- Buttons are pills, filled, without borders.
- Cards: `surface`, `radius-3`, `shadow-card`, no border.
- Shadows: `shadow-card` for cards, `shadow-float` for everything that floats. Nothing else.
- The status dot: 8px, centred on the x-height, 6px from its word.
- The hexagon: flat-topped, only for the brand mark (18 × 16px), replicas in the cluster map (52 × 46px) and the empty-state mark.

## Motion

- 120–150ms ease for hover and focus, 200ms for menus, toasts and switches, 280ms for dialogs (`cubic-bezier(.2, .8, .2, 1)`), which rise slightly as they fade in. Project cards lift 2px on hover. Buttons press to 98%.
- Nothing moves continuously. Progress shows as a meter and a sentence, never a spinner alone.
- With `prefers-reduced-motion: reduce`, every transition is instant.

## States and focus

- Focus: a solid 2px ring in `focus`, offset 2px, only for keyboard focus (`:focus-visible`). It reaches at least 3:1 on every surface in both themes. Fields in focus get a `focus` border and a soft halo.
- Hover on rows: a light `sunken` wash. Hover on honey: `honey-strong`.
- Disabled: `ink-3` text on `sunken`, `line` border, `not-allowed` cursor, and always a reason nearby.
- Selection in tables: `honey-soft` and a checked box. No colored side bars.
- Invalid fields: `critical` border and a message below, with an icon.

## Projects

- Every route, stream route, redirect and uploaded certificate belongs to one project. Projects organise and filter; they don't limit access.
- Projects appear as cards on the Overview (ProjectCard), as a sidebar group with their route counts, and as groups in route tables (Table).
- Each project has a name, a one-line description and a Lucide icon chosen from a short list. No project colours: status already uses colour.

## Iconography

- **Lucide** (lucide.dev, ISC licence), 16px, stroke 1.75, colour inherited from the text (`currentColor`).
- Icons go with words. Icon-only buttons are for toolbars and table rows, with `aria-label` and a tooltip.
- Status uses dots, not icons. Lucide's `hexagon` names the Replicas page only.
- No emoji.

## Brand

Apiary has no logo yet. Until it does, write the name in the display face, bold, in `ink`, after a honey hexagon (Shell's `ap-brand`). Don't draw a bee.

**Attribution is required.** Apiary's licence (NOTICE, term 1) requires every version of the admin interface to show "Based on Apiary by Datapoint - Sistemas de Informação, Lda.", linking to https://datapoint.software/, with the Datapoint logo next to it. Shell puts it in the sidebar footer. Use the logo from the Logos group; inline its SVG so it takes the text colour (`ink-2`) in both themes. The logo's use is governed by TRADEMARKS.md.

## Accessibility

Apiary targets WCAG 2.2 level AA. Operators manage infrastructure under pressure, often with a keyboard, sometimes with a screen reader or at high zoom; the interface must work for all of them.

**Built into every component:**

- **Contrast:** text meets 4.5:1 on the grounds named in each token's note, in both themes (checked). Control borders, icons and the focus ring meet 3:1. `honey` is 1.9:1 on `surface` in the light theme, so it never carries text or meaning alone.
- **Not by colour alone:** states pair a dot with a word; invalid fields have an icon and a message; the selected row has a checked box.
- **Keyboard:** everything works without a mouse, in reading order. A skip link opens every page. Tabs move with the arrow keys, Home and End; menus with the arrow keys; Escape closes the topmost menu, popover, dialog or drawer. Dialogs and the phone drawer keep focus inside and return it to whatever opened them. Ctrl or ⌘ + B collapses the sidebar.
- **Focus:** a solid 2px `focus` ring on every focusable element, 3px with more contrast.
- **Screen readers:** landmarks (`header`, `nav` per group, `main`, `aside`), labelled icon-only buttons, `aria-current` in navigation, `aria-expanded` on everything that opens, tables with a caption and column headers, decorative dots, hexagons and icons hidden with `aria-hidden`, and toasts announced through a polite live region.
- **Text size and zoom:** font sizes are in `rem`, so the browser's text size and Display settings scale them; pages reflow at 400% zoom (320px wide) without sideways scrolling, except inside tables.
- **Targets:** controls are at least 28px (dense tables) and 36px by default, 44px in touch layouts, which meets WCAG 2.2's 24px minimum.
- **Language:** the root element declares `lang="en"`.

**Preferences people can set** (DisplaySettings, or their operating system):

- **Appearance:** light, dark or automatic.
- **Text size:** default, large (112.5%) or larger (125%).
- **Contrast:** `prefers-contrast: more`, or More in settings, makes secondary text darker, hairlines solid, cards and buttons outlined, and the focus ring thicker.
- **Motion:** `prefers-reduced-motion`, or Reduced, makes every transition instant.
- **Forced colours:** in Windows high contrast and similar modes, controls and cards get system-colored borders, and the selected and primary states use the system highlight.

## Scrollbars

Scrollable areas use thin, rounded scrollbars with a soft `ink` thumb that darkens on hover and a transparent track, so they stay quiet until needed. They follow the theme and respect the platform: where the operating system hides scrollbars, they stay hidden.
