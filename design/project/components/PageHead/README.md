# PageHead

Every page starts with a page head: where you are, what this page is, and its main actions.

- Breadcrumbs (`ap-crumbs`, a `nav` labeled "Breadcrumb") lead from the area to the page; the last crumb is the page itself, with `aria-current="page"`, not a link.
- One `h1` per page, in `title-1`. A subtitle (`ap-sub`) with the one or two facts people check first.
- Actions sit on the right, the primary one last. They wrap below the heading on narrow screens.
- In the library: `<ap-page-head heading [crumbs]>`, with content in `pageSub` and `pageActions`.

**The consumer provides:** the heading, the crumbs, the subtitle and the actions.
