# ProjectCard

A project card summarises one project: its health, how many routes it has, and its traffic. Cards link to the project's routes.

- A project groups routes, stream routes, redirects and uploaded certificates for organising and filtering. It is not an access boundary: roles apply to the whole cluster.
- Head: a Lucide icon chosen for the project on a `sunken` tile, and the project's worst status as a Status ("1 route down").
- Name in `title-3`, a one-line description, then the counts in `ink`.
- The whole card is the link; it lifts slightly on hover.
- Cards sit in a grid (`ap-projects`) that fills the width with cards at least 260px wide.

**The consumer provides:** name, icon, worst status, description, route count and traffic.
