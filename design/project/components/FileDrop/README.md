# FileDrop

A file field you can click or drop onto (`ap-drop`), for certificates and keys.

- The whole zone is the file input's label, so it's one click and works with the keyboard; it highlights in `honey-soft` while a file is dragged over it.
- Once chosen, the file shows as a row (`ap-file`) with its name, size and a remove button.
- Checked in the browser first (type and content, such as a PEM header), then by the server (a key that doesn't match its certificate), with the error under the zone.
- Always offer a "Paste text" alternative next to it: people often have a certificate in a terminal, not a file.

**The consumer provides:** label, accepted types and help.
