# Implementation plan

The order in which Apiary is built. Each milestone ends in something you can run and try, and milestones come in order of importance: proxying first, then what makes it safe to expose, then high availability, then everything else. The design they implement is in [architecture.md](architecture.md); the interface they implement is the prototype in [design/prototype](../design/prototype/README.md).

## How the milestones work

- **Vertical slices.** A milestone delivers its features end to end: the command or query, its validation and error codes, its UI page, its tests and its docs. A milestone isn't done until it can be tried from the UI.
- **Single node first.** Milestones 1 to 3 run as one instance, with Docker Compose. Every write still goes through the same path the cluster will use (a Datapoint.Mediator command, applied by a transaction behavior to a state machine), so [milestone 4](#4-high-availability) adds replicas without rewriting features.
- **Components as needed.** Each design system component is built in `@datapoint/apiary-ui` when the first page needs it, following its card in `design/project`, not all up front.
- **Each milestone says how to try it**, and what it still lacks.
- **CI comes last**, once features are complete, as [engineering.md](engineering.md#build-and-packages) says. Until then, builds and tests run locally.

## 0. Walking skeleton

Every layer in place, each doing the minimum.

- The .NET solution and the Angular workspace, laid out as in [engineering.md](engineering.md#repository-layout), with the analyzers, lint rules, architecture tests and test projects running.
- `@datapoint/apiary-ui` with the tokens and base styles moved from `design/project`, and `design/tools` reading them from there.
- The host: the public listener on port 80 answers every request with Apiary's 404, and the admin listener serves the Angular shell (sidebar, top bar, an empty Overview) with `/health/live` and `/health/ready`.
- The admin address allowlist (private ranges by default), since it's cheap and protects every milestone after this one.
- The error contract: ProblemDetails with codes, the UI's message catalog, and the test that checks both catalogs.
- The container image, built locally on Ubuntu, and a `docker compose` file with a sample target service (e.g. `traefik/whoami`).

**Try it:** `docker compose up`, open `http://localhost:9443` for the admin shell, and `curl http://localhost` for the 404.

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

## 13. Release

- Security reviews of the join protocol and the OAuth server, as [risks.md](risks.md) requires.
- Tests of the failure modes in [failure-modes.md](failure-modes.md) on a real Swarm.
- CI, publishing the image to `hub.datapoint.software/datapoint/apiary`.
- `1.0.0`.

## What you'll need to try it

- **Milestones 0 to 2:** Docker on your machine.
- **Milestone 3:** a machine with a public address, and a domain (or subdomain) you can point at it.
- **Milestones 4 and 5:** three machines in a Swarm, e.g. small cloud VMs. Two more DNS records, or a load balancer, for the other nodes.
