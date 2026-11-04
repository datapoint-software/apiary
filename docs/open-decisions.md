# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

- **A visitor page for 413.** Apiary shows its own pages for 403, 404, 429 and 503, but a request over a route's size limit gets Kestrel's 413 with no body, so a browser uploading a form shows a blank error. Docker and other API clients only read the status. A page would need Apiary to answer the 413 itself, before Kestrel does, and is only worth it if browser uploads start hitting the limit.
