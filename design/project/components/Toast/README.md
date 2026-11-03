# Toast

A toast reports the result of an action that didn't open a form or dialog: a save, a purge, a quick action from a menu.

- **Success** (`ap-toast-ok`) repeats the verb in the past tense ("Route saved") and adds the fact that matters in a cluster: how many replicas applied it. Closes after 5 seconds, 8 with an action.
- **Info** (`ap-toast-info`) for neutral news, often with **Undo** for a reversible change.
- **Error** (`ap-toast-error`, `role="alert"`) only for quick actions that failed. It stays until dismissed and offers **Try again**. Errors in a form appear in the form instead, so what was typed is kept next to the problem.
- At most one action, and always a close button. Hovering or focusing a toast pauses its timer. (In the library, moving focus out of a toast doesn't restart the timer yet: a known bug.)
- Stack bottom-right in `ap-toasts`, newest last, inside a polite live region.

**The consumer provides:** the tone, an optional title, the message and an optional action.
