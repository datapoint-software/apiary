# Dialog

A dialog asks for a decision that must be made before going on, usually confirming a destructive change.

- Title is the question, with the object: "Delete route shop.example.com?".
- Body says what happens, when, and what is kept. For changes that are hard to undo, ask the person to type the object's name.
- Buttons: the safe choice as a ghost button that names itself ("Keep route"), the action in `ap-btn-danger` (or primary for non-destructive decisions), right-aligned.
- A solid `surface` sheet (`ap-dialog`) over `scrim`, `shadow-float`, 460px wide, rising in over 280ms. Escape and the safe button close it; focus starts on the first field or the safe button and stays inside.
- Never stack dialogs, and never use one for information a Toast or Banner can give.

**The consumer provides:** the question, consequences, optional confirmation field, and the two actions.
