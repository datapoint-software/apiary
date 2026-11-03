# Choice

Checkboxes, radio buttons and switches for options a person turns on or picks.

- **Switch** (`ap-switch`): a setting that takes effect when saved, such as a per-route feature. Pair it with a one-line help text that says what it does and, for risky options, when not to use it.
- **Checkbox** (`ap-check`): several independent options from a list.
- **Radio** (`ap-radio`): one option from two to five; more than five becomes a select.
- The whole label is clickable: wrap control and text in `<label class="ap-choice">`.
- Checked boxes and radios fill with `honey`; switches turn `ok` green when on, like iOS.

**The consumer provides:** the name, label, optional help text, and the checked state.
