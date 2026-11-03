# Field

A field is a label, a control and, when needed, help or an error, stacked in that order.

- The label (`ap-label`) is always visible above the control. A placeholder never replaces it.
- Mark optional fields with `<span class="ap-optional">(optional)</span>`; required fields get no asterisk.
- Technical values (hostnames, IPs, ports, paths) use `ap-input ap-data` so they render in the data face.
- Prefixes and suffixes (`ap-affix`) show fixed parts of a value, such as a scheme or a port.
- Validate when the field loses focus, never while typing. The error (`ap-error`) goes below the control, says what is wrong and how to fix it, and the input gets `aria-invalid="true"` and `aria-describedby`.
- Disabled fields explain why in their help text.
- One field per row under 640px; two columns at most on wider screens, only for natural pairs.

**The consumer provides:** a unique `id` linking label and control, the value, and the validation message.
