# Segmented

A segmented control switches a view between two to five short options, such as a time range or a filter.

- It changes what is shown, never data: switching it saves nothing.
- Labels are one or two words. Units are spelled the same everywhere: `1 h`, `24 h`, `7 d`.
- The selected option has `aria-pressed="true"`.

**The consumer provides:** the options and the selected one.
