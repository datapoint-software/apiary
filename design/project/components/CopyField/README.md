# CopyField

A copy field shows a command or value that people run or paste elsewhere, with a Copy button.

- The full text is visible and selectable. A command stays on one line and scrolls inside the field; a list (recovery codes) is multiline.
- The label says where to run it or what it is; the help text says what it does or what to do next.
- The button shows a check and "Copied" for 2 seconds. If the clipboard is refused, select the text instead.
- Secrets appear only when the person must save them themselves, once: an authenticator app's key, recovery codes. Say where to keep them. Commands that create secrets write them to a file only the user can read (`umask 077`), for the person to move into a secret store.

**In the app:** `<ap-copy-text text multiline>`.

**The consumer provides:** the label, the text and the help text.
