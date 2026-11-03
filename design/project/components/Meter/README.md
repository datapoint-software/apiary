# Meter

A meter shows how much of something is left or done: days until a certificate expires, replicas on a new key.

- The number is always written next to the bar; the bar is for comparing rows at a glance.
- Tone follows the status: `ok` with more than 30 days left, `ap-meter-warn` under 30, `ap-meter-critical` under 7. Progress uses `ap-meter-info`.
- Use `role="meter"` for amounts and `role="progressbar"` for processes, with the `aria-value*` attributes.

**The consumer provides:** the label, the value, its maximum and the tone.
