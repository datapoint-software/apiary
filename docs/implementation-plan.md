# Implementation plan

The order in which Apiary is built. Each milestone ends in something you can run and try, and milestones come in order of importance: proxying first, then what makes it safe to expose, then high availability, then everything else. The design they implement is in [architecture.md](architecture.md); the interface they implement is the prototype in [design/prototype](../design/prototype/README.md).

## How the milestones work

- **Vertical slices.** A milestone delivers its features end to end: the command or query, its validation and error codes, its UI page, its tests and its docs. A milestone isn't done until it can be tried from the UI.
- **Single node first.** Milestones 1 to 3 run as one instance, with Docker Compose. Every write still goes through the same path the cluster will use (a Datapoint.Mediator command, applied by a transaction behavior to a state machine), so [milestone 4](#4-high-availability) adds replicas without rewriting features.
- **Components as needed.** Each design system component is built in `@datapoint/apiary-ui` when the first page needs it, following its card in `design/project`, not all up front.
- **Each milestone says how to try it**, and what it still lacks.
- **CI runs from the first alpha** (`1.0.0-alpha.1`), so pre-releases can be deployed to a development Swarm; see [releasing.md](releasing.md).

## 0. Walking skeleton

Every layer in place, each doing the minimum.

- The .NET solution and the Angular workspace, laid out as in [engineering.md](engineering.md#repository-layout), with the analyzers, lint rules, architecture tests and test projects running.
- `@datapoint/apiary-ui` with the tokens and base styles moved from `design/project`, and `design/tools` reading them from there.
- The host: the public listener on port 80 answers every request with Apiary's 404, and the admin listener serves the Angular shell (sidebar, top bar, an empty Overview) with `/health/live` and `/health/ready`.
- The admin address allowlist (private ranges by default), since it's cheap and protects every milestone after this one.
- The error contract: ProblemDetails with codes, the UI's message catalog, and the test that checks both catalogs.
- The container image, built locally on Ubuntu, and a `docker compose` file with a sample target service (e.g. `traefik/whoami`).

**Try it:** `docker compose up`, open `https://localhost:9443` for the admin shell, and `curl http://localhost` for the 404.

**Not yet:** routes, sign-in. The admin port has no authentication, so this runs on your machine only.

## 1. HTTP routes

The core of Apiary: route a hostname and path to a target.

- The state machine, its persistent log on the volume, and the transaction behavior that turns each command into one log entry, with its audit entry. Whether DotNext's persistent log can run as a cluster of one from this milestone is checked first; if it can, it's used from the start.
- The "Default" project, created on first start.
- Create, edit and delete routes with one target: hostname, path, target host and port, timeout. The routes list and the route editor, with the shared validation rules (`hostname()`, `port()`, `target()`).
- Routes loaded into YARP at runtime, so changes apply without a restart. WebSockets work through YARP.
- Refusing internal targets: Apiary's own ports, loopback and link-local addresses, checked on the address each connection actually reaches (DNS rebinding).
- Access logs: one JSON line per request on standard output, without query strings.

**Try it:** add a route from `whoami.localhost` to `whoami:80`, then `curl http://whoami.localhost`. Try a loopback target and see it refused, and watch the access log in `docker compose logs`.

**Not yet:** HTTPS, sign-in, more than one target.

## 2. Sign-in and users

What makes the admin port safe to run anywhere but your own machine.

- First-access setup: the 15-minute window, the permanent flag, and the start-up log line saying where setup is open.
- Local accounts: PBKDF2 hashing, the password rules and common-password list, throttling without lockout, required TOTP with recovery codes.
- Sessions, sign-out, and the account pages (profile, security, active sessions).
- Roles (Viewer, Operator, Administrator), with an authorizer on every action and deny by default.
- The users page: invite, change role, remove, never the last Administrator.
- The audit log page, over the entries recorded since milestone 1.
- `apiary users create-admin`, for when every Administrator is locked out.

**Try it:** start with an empty volume, complete setup with an authenticator app, invite a Viewer and check what they can't change. Find both in the audit log.

**Not yet:** single sign-on, agents.

## 3. HTTPS and certificates

- The root key: `apiary secrets init`, the Compose fallback that generates one with a warning, and envelope encryption of the state at rest.
- Automatic certificates with ACME HTTP-01, against Let's Encrypt's staging environment by default, with renewal well before expiry.
- HTTPS with the certificate chosen per hostname (SNI), HTTP to HTTPS redirects, HTTP/2 and HTTP/3.
- Uploaded certificates, UI only: key and chain checks, expiry warnings.
- The certificates list and certificate details, with renewal and its failures.

**Try it:** needs a machine with a public address and a domain pointing at it. Deploy with Compose, add a route, and watch the staging certificate get issued. Upload a certificate with a key that doesn't match it.

**Not yet:** high availability. Switching to Let's Encrypt's production environment is a setting.

## 4. High availability

The step from one instance to a cluster.

- Several replicas found through Swarm DNS, joining with the root key (the HMAC join protocol) and talking over mutual TLS with certificates from the cluster CA.
- Voters and followers, the voter count, and automatic membership.
- Writes forwarded to the leader as commands, with request IDs so retries apply once.
- Certificates in a cluster: one replica renews at a time under a lock, and any replica answers a challenge, asking the leader for a token it doesn't have yet.
- Leaving cleanly on stop, and the health check that passes once a replica has caught up.
- The replicas page, and the UI's write lock while the cluster has no quorum.
- The stack file for Swarm.

**Try it:** needs a Swarm of 3 nodes (three small VMs are enough). Deploy with `docker stack deploy`, then stop the leader's node and keep changing routes. Stop two nodes and see writes refused while traffic keeps flowing.

**Not yet:** manual membership, recovery.

## 5. Running a cluster safely

What an operator needs before trusting Apiary with production.

- Manual membership: approving and removing replicas.
- Replacing missing voters after the timeout, and on a new replica on the same node.
- Encrypted backups (export) and restore into a new cluster, with the backups page.
- Forced recovery (`apiary recover --force`) with its safeguards.
- Rotating the root key in one deploy, with progress on the root key page, and the cluster CA's automatic rotation.

**Try it:** export a backup, destroy the stack and its volumes, and restore. Rotate the root key with a redeploy.

## 6. Everyday route features

The rest of the route editor in the prototype.

- Redirects and the redirects page.
- Disabling and enabling routes.
- Per-route address allowlists.
- Maintenance windows, with the date and time picker and the 503 page.

## 7. Projects and the overview

- Creating, editing and deleting projects (only when empty), with their icon.
- Project pages, the sidebar's project list, and moving routes between projects.
- The overview, and the routes list's filters and bulk actions.

## 8. Observability

- OpenTelemetry metrics and traces over OTLP, and the Prometheus `/metrics` endpoint.
- Target health checks, and route status in the UI.
- Requests per minute per route, as the routes list shows them.
- The optional shortened IP addresses in logs.

## 9. Agents

- The MCP endpoint, offering every action except the certificate upload.
- Apiary's OAuth authorization server, as the MCP authorization specification requires.
- The connected agents page, and disconnecting an agent.

**Try it:** connect Claude Code to Apiary's MCP endpoint and ask it to list your routes.

## 10. Releasing new versions

- Weighted target groups, header or cookie selection, and sticky sessions.
- Compression and caching per route, and purging a route's cache on every replica.

## 11. Single sign-on

- OpenID Connect sign-in, with roles mapped from the identity provider's groups, and local accounts kept as break-glass.

## 12. Stream routes

- TCP and UDP routes on the published port range, TLS passthrough by SNI, UDP idle timeouts, and the stream routes page.

## 13. Finishing the product

What the review after milestone 12 found missing, agreed on 2026-11-03.

- Stream routes: address allowlists and a disable switch, like HTTP routes.
- English descriptions of every error code for MCP agents, as [engineering.md](engineering.md#errors-are-codes-not-messages) requires.
- Form checks that need the server, shown as "Checking…" while you type.
- HTTPS on the admin port from the first start, with a self-signed certificate that Administrators can replace from the UI.
- Sessions that end after a configurable idle time, 15 minutes by default.
- The recovery wizard on the Replicas page, as the prototype shows it.
- The rest of the prototype: the overview's "Get started" checklist and its request, latency and error charts, the stream routes' Status column, drop zones for certificate uploads, and the audit log's remaining filters.
- The UI's Source link pointing at the public repository, the public pages using the design tokens, and the Let's Encrypt Subscriber Agreement stated in the deployment docs and on the Certificates page.

## 14. Security review

- Reviews of the join protocol and the OAuth server, as [risks.md](risks.md) requires.

## 15. Tests

- The architecture tests, the error catalog and shared rule tests, a check that the UI never reads an error's `title` or `detail`, a check that no action handling private keys or backups is marked `[ModelContextProtocol]`, and unit and integration tests for the backend and the frontend.

## 16. Release

- `ng-package.json` listing the component library's styles as assets, so a published package includes them.
- Tests of the failure modes in [failure-modes.md](failure-modes.md) on a real Swarm.
- `1.0.0`.

## 17. Request size limits

Agreed on 2026-11-04, after large image pushes to a container registry failed. Not tied to 1.0: it can ship in any release.

- A request size limit per route: the cluster default, its own size from 1 MB to 100 GB, or no limit. Administrators change the default on the All routes page, which also lists the routes with their own limit.
- Route timeouts up to 3600 seconds, described as time without any data moving.

**Try it:** set the default to 1 MB and `curl --data-binary @big.file` a route: it gets a 413. Give the route its own 10 MB limit and try again.

## 18. Routes declared in stack files

Agreed on 2026-11-04, for teams that deploy their Swarm from CI. Not tied to 1.0. See [architecture.md](architecture.md#stacks).

- `stacks.apply`, with a dry run: one Raft entry that adds, changes and removes a stack's routes, stream routes and redirects, refusing hostnames in use and an apply that removes everything. A new state change, so it needs `[StateSchema(2)]`.
- An optional source on routes, stream routes and redirects (the stack, its service and the fields its labels set), locking those fields in the UI, the API and MCP.
- Pipeline tokens: one stack each, created by an Administrator, shown once, stored as a hash, expiring and revocable, with their own audit entries.
- `apiary apply` in the image: it parses the stack file's `apiary.*` labels, finds the commit and pipeline link in the CI system's variables, prints the plan and exits with an error when the apply fails.
- The Stacks page and each stack's page (last apply, what it declares, tokens, the commands for CI, Add stack and Remove stack), the Pipeline tokens page, and the stack tag and locked fields on route, stream route and redirect pages, as the prototype shows them.

**Try it:** add a stack, put its token in a GitLab CI variable on a runner inside the network, and add `apiary apply` after `docker stack deploy`. Push a label change: the route changes, and its locked field says "Set in stack". Delete the labels of one route and push again: the route is gone. Run with an empty file: the apply fails with `stack.removesEverything`.

## 19. Trusted proxies

Agreed on 2026-11-05, for deployments behind a load balancer or CDN. Not tied to 1.0. See [architecture.md](architecture.md#trusted-proxies).

- The trusted proxies list in the replicated state, with actions to read and change it, for Administrators, over the API and MCP.
- The client address and scheme from `X-Forwarded-For` and `X-Forwarded-Proto` for connections from a trusted proxy, used by every public route, and the forwarded headers kept for the target.
- When each entry last saw a request, across replicas.
- The Trusted proxies page, with Try a request, as the prototype shows it.

**Try it:** with the local stack, add `127.0.0.1` as a trusted proxy, then `curl -H 'X-Forwarded-For: 203.0.113.9' http://whoami.localhost`: the access log shows `203.0.113.9`, and whoami gets `X-Forwarded-For: 203.0.113.9, 127.0.0.1`. Remove it and try again: both show the connection's address.

## 20. Path redirects

Agreed on 2026-11-05, for moving part of a site without changing its service. Not tied to 1.0. See [architecture.md](architecture.md#redirects).

- An optional path on redirects, in the replicated state, the API, MCP and the `apiary.redirect.<name>.path` label. An older replica would ignore it and redirect the whole hostname, so it needs `[StateSchema(n)]`.
- Matching by hostname, then the longest path prefix, before routes, with the rest of the path kept after the prefix, and relative targets sent as a relative `Location`.
- The checks in architecture.md on redirects and routes, with their codes, and in `redirects.check`.
- The Redirects page and dialog, and the Path redirects panel on each route's page, as the prototype shows them.

**Try it:** with the local stack and the `whoami.localhost` route, add a redirect from `whoami.localhost` at `/old` to `/new`. `curl -i http://whoami.localhost/old/page?a=1` answers 308 with `Location: /new/page?a=1`, and `curl -i http://whoami.localhost/older` still reaches whoami. Try adding a route at `/old/api`: it's refused.

## 21. DNS challenges

Agreed on 2026-11-06, for wildcards, internal hostnames, edge nodes with port 80 closed, and certificates before DNS cutover. Not tied to 1.0. See [architecture.md](architecture.md#certificates).

- DNS providers in the replicated state, with encrypted credentials, for Administrators over the API, and not over MCP. New state changes and a `challenge` on automatic certificates, so it needs `[StateSchema(n)]`.
- `IDnsProviderClient` for RFC 2136, Hetzner (through the Hetzner Cloud API), Cloudflare, Azure DNS and Route 53, with a separate challenge zone, all built at once (decided on 2026-11-06).
- DNS-01 in the ACME client and the issuer: the TXT record, the propagation check against the zone's authoritative name servers, the CNAME check for delegated zones, cleanup of records left by a replica that stopped, and the codes `dns.unauthorized`, `dns.zoneNotFound`, `dns.notPropagated`, `dns.unreachable` (retried like `acme.unreachable`) and `dns.cnameMissing`.
- Certificates for several names, wildcards among them, requested ahead of any route, and routes naming a wildcard Apiary renews.
- The DNS providers page, Request certificate, the Checked with column and dialog, Switch them on a wildcard, and Checked with in the route editor, as the prototype shows them.

**Try it:** run BIND or PowerDNS next to Pebble with a TSIG key, add it as a provider with a challenge zone, and request `*.example.test` with `example.test`. Pebble issues one certificate for both; the renewal log shows the TXT record and how long it took to appear. Delete the TSIG key on the server and request another name: it fails with `dns.unauthorized`, and Pebble validates nothing. Apiary does create the order, since that's where the challenge token comes from, so it counts toward Let's Encrypt's new orders limit but not its failed validations limit.

## What you'll need to try it

- **Milestones 0 to 2:** Docker on your machine.
- **Milestone 3:** a machine with a public address, and a domain (or subdomain) you can point at it.
- **Milestones 4 and 5:** three machines in a Swarm, e.g. small cloud VMs. Two more DNS records, or a load balancer, for the other nodes.
