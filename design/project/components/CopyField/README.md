# CopyField

A copy field shows a command or value that people run or paste elsewhere, with a Copy button.

- The full text is visible and selectable; long lines scroll inside the field, never wrap.
- The label says where to run it; the help text says what it does.
- The button changes to "Copied" for 2 seconds. If the clipboard is refused, select the text instead.
- Never put secrets in a copy field. Commands that create secrets pipe them straight to their destination.

**The consumer provides:** the label, the text and the help text.
