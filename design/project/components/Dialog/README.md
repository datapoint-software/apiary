# Dialog

A dialog asks for a decision that must be made before going on, usually confirming a destructive change, or collects a few fields for one action (upload a certificate, invite someone).

- Title is the question, with the object: "Delete route shop.example.com?". A confirmation has a tone mark (`ap-dialog-mark`, critical for destructive actions) before the title; a non-destructive decision has none.
- Body says what happens, when, and what is kept. For changes that are hard to undo, ask the person to type the object's name ("Type shop.example.com to confirm"); the action stays disabled until it matches.
- Buttons, right-aligned: **Cancel** as a ghost button, then the action, named for what it does ("Delete route"), in `ap-btn-danger`, or primary for non-destructive decisions. While it runs, the action shows its busy label ("Deleting…").
- If the action fails, the dialog stays open and a critical Banner inside it says why, so the person can try again or cancel.
- A solid `surface` sheet (`ap-dialog`, `role="alertdialog"` for confirmations) over `scrim`, `shadow-float`, 460px wide (`ap-dialog-lg` for forms), rising in over 280ms. Escape and Cancel close it; focus starts on Cancel, or on the first field of a form, and stays inside.
- Actions that need a password again (new recovery codes, a new authenticator app) ask for it in their dialog.
- Never stack dialogs, and never use one for information a Toast or Banner can give.

**In the library:** `Confirmer.confirm({ heading, text, confirm, busy, tone, typeToConfirm, action })` opens the confirmation and runs the action; it resolves when the action succeeds or the person cancels.

**The consumer provides:** the question, consequences, optional confirmation text, the action's label and what it does.
