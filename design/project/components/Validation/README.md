# Validation

How forms tell people what to fix.

- **When:** a field is checked when you leave it, then again as you type, so a fixed error clears at once. Nothing turns red while you type in a field for the first time.
- **On submit,** every field is checked. Forms with more than one problem list them at the top in an error summary (`ap-error-summary`, `role="alert"`), in page order, each a link that moves focus to its field. With one problem, focus moves straight to that field.
- **Field errors** (`ap-error`, under the help text, linked with `aria-describedby`) set `aria-invalid`, which turns the border `critical`. Messages say what to do, with an example: "Enter a hostname, such as shop.example.com", not "Invalid hostname".
- **Checks that need the server** show "Checking…" (`ap-checking`) and, when it helps, a quiet confirmation (`ap-valid`).
- **Limits** show a counter (`ap-counter`) that turns `critical` past the limit; the field still accepts the text so nothing is cut off silently.
- **Rules that must all hold,** such as password rules, are a live checklist (`ap-checklist`).
- **Cross-field rules** (weights that add up to 100%, an end after the start) attach to the group or the second field.
- **Server errors** appear at the top of the form; what was typed is kept. Submit buttons stay enabled: pressing one is how people find out what's missing.

**The consumer provides:** the rules and their messages.
