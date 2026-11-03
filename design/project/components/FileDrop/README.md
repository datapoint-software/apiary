# FileDrop

A text field for a certificate or key, with a zone under it that fills the field from a file (`ap-drop`).

- Pasting is the main path: people often have a certificate in a terminal, not a file. The textarea is the source of truth; choosing or dropping a file reads it into the textarea, where it can be checked and edited.
- The whole zone is the file input's label, so it's one click and works with the keyboard; it highlights in `honey-soft` while a file is dragged over it.
- The zone names the accepted types; the field's help says what the content must be.
- Checked by the server (a key that doesn't match its certificate, an encrypted key), with the error on the field.
- **Not used in the app yet:** the chosen-file row (`ap-file`).

**In the app:** the `apFileDrop` directive on the `ap-drop` label, next to the field it fills.

**The consumer provides:** label, accepted types, help and the field it fills.
