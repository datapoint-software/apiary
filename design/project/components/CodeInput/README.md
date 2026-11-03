# CodeInput

A one-time code field for two-step verification: in sign-in, setup, accepting an invite and the recovery dialog.

- One input, not one box per digit: paste and password managers work, and screen readers read one field.
- `ap-otp` makes it large and centered, in the data face with wide spacing.
- `inputmode="numeric"` and `autocomplete="one-time-code"`, so phones offer the code from the authenticator or a message.
- Recovery codes (`xxxx-xxxx-xxxx-xxxx`) use a plain input instead, with no `ap-otp` and no numeric keyboard.
- The submit button says "Checking…" while the code is verified; a wrong code gets a field error and keeps focus in the field.

**The consumer provides:** the label and the help text.
