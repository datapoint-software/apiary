# Validation

How forms tell people what to fix.

- **When:** a field is checked when you leave it, then again as you type, so a fixed error clears at once. Nothing turns red while you type in a field for the first time.
- **On submit,** every field is checked. Forms with more than one problem list them at the top in an error summary (`ap-error-summary`, `role="alert"`), in page order, each a link that moves focus to its field. With one problem, focus moves straight to that field.
- **Field errors** (`ap-error`, under the help text, linked with `aria-describedby`) set `aria-invalid`, which turns the border `critical`. Messages say what to do, with an example: "Enter a hostname, such as shop.example.com", not "Invalid hostname".
- **Checks that need the server** (a hostname another route uses, an email someone has) run 400 ms after typing stops and show "Checking…" in a polite live region under the field; a problem then shows as an ordinary field error.
- **Rules that must all hold,** such as password rules, are a live checklist (`ap-checklist`, from `<ap-password-checklist>`).
- **Cross-field rules** (weights that add up to 100%, an end after the start) attach to the group or the second field.
- **Server errors** come back as codes. Errors for a field appear on that field; others at the top of the form. What was typed is kept.
- **Submit buttons stay enabled** until pressed: pressing one is how people find out what's missing. While the request runs, the button is busy ("Saving…").
- **Not used in the app yet:** the spinner (`ap-checking`), a quiet confirmation (`ap-valid`) and the counter (`ap-counter`, which turns `critical` past a limit).

**The consumer provides:** the rules and their messages.
