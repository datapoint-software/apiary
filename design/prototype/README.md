# Prototype

A clickable prototype of Apiary's admin interface: every page in the sidebar, the account pages, sign-in and first run. It shows how the components fit together and how the interface behaves, including validation, dialogs, alerts and the date and time picker. All data is invented and lives in memory; reloading resets it.

- **Prototype controls:** the dashed button at the bottom right switches scenarios. **Cluster:** healthy, one replica down, or no quorum, where changes pause. **Server:** fast, slow, or failing. **Data:** sample, or a new install. It also opens the sign-in, first-run and not-found screens. The controls aren't part of Apiary.
- **Try:** add a route with mistakes in it, a loopback target or weights that don't add up; schedule a maintenance window; take the size limit off registry.example.com and see the warning, then change the default at the bottom of All routes; upload a certificate (put "mismatch" in the key); renew the failing certificate for legacy.example.com; invite someone; filter the audit log by a custom range; leave a route with unsaved changes.
- **Patterns it settles:** validation (see Validation), confirmations that name what is affected and, when it can't be undone, ask you to type the name, writes locked while the cluster has no quorum, and every time in UTC.
- **Attribution:** the footer under every page and the About dialog show the Datapoint logo and "Based on Apiary by Datapoint - Sistemas de Informação, Lda.", as the license requires.

Built from `design/prototype/` by `python3 design/tools/build.py`.

New ideas are tried on top of it in `design/ideas/<slug>/`, which Git ignores, and built with `python3 design/prototype/build.py --idea <slug>`; an idea that is chosen moves into `design/prototype/`. See `.claude/skills/prototype/SKILL.md`.
