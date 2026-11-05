# Field

A field is a label, a control and, when needed, help or an error, stacked in that order.

- The label (`ap-label`) is always visible above the control. A placeholder never replaces it.
- Mark optional fields with `<span class="ap-optional">(optional)</span>`; required fields get no asterisk.
- Technical values (hostnames, IPs, ports, paths) use `ap-input ap-data` so they render in the data face.
- Prefixes and suffixes (`ap-affix`) show fixed parts of a value, such as a scheme, a port or a unit ("a minute"). A small ghost button can sit in a suffix, such as a password's **Show** (`ap-password-reveal`, `aria-pressed`).
- Lists of values, one per line, use `ap-textarea` with the data face.
- Errors follow Validation: shown once you've left the field, then updated as you type. The error (`ap-error`) goes below the help, says what is wrong and how to fix it, and the input gets `aria-invalid="true"` and `aria-describedby`.
- Disabled fields explain why in their help text.
- Help is usually plain text. When it points somewhere the person may need to go, such as the page that changes how the field behaves, it can hold a link; keep it to one, at the end of the help.
- One field per row under 640px; two columns at most on wider screens, only for natural pairs.

**In the library:** `<ap-field label help optional summaryLabel [field]>` wraps one control. It generates the ids, links label, help and error, shows "Checking…" while a server check runs, and gives the error summary its label (`summaryLabel`, when the visible label is ambiguous). Help that needs markup, such as a link, goes in an element marked `apFieldHelp` inside the field; it follows any `help` text and is linked to the control the same way.

**The consumer provides:** the label, the control, its help text (or `apFieldHelp` content) and the form field it binds to.
