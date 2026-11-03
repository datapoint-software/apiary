# Architecture

How Apiary is built and deployed. Decisions not yet made are in [open-decisions.md](open-decisions.md), and the risks these choices bring are in [risks.md](risks.md).

## Technology

- **Backend:** [.NET 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) (LTS, supported until November 2028), with ASP.NET Core.
- **Proxy engine:** [YARP](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/yarp-overview), on Kestrel. YARP handles forwarding, load balancing and health checks; Apiary loads routes into it at runtime.
- **State replication:** [DotNext.Net.Cluster](https://dotnet.github.io/dotNext/features/cluster/index.html), a .NET implementation of the [Raft](https://raft.github.io/) consensus algorithm. Apiary writes the state machine (routes, certificates, locks), not the consensus.
- **Management operations:** [Datapoint.Mediator](https://github.com/datapoint-software/mediator), which we also own and maintain. It's a pre-release (`4.0.0-beta.3` at the time of writing). Each operation is written once, as a command or query, and offered both as an HTTP endpoint and as an MCP tool.
- **Admin interface:** [Angular 22](https://angular.dev/reference/releases), built and served by the .NET backend. Each Angular major version is supported for about 18 months, so plan to upgrade once a year.

Move to the next .NET LTS or Angular major version before the current one leaves support.

## Deployment modes

The same image runs in three ways. The mode is selected by configuration, in the compose file.

| Mode | Replicas | High availability | Root key |
| --- | --- | --- | --- |
| Swarm | 3 or more | Yes | Required |
| One-node Swarm | 1 | No | Required |
| Docker Compose, no Swarm | 1 | No | Generated if missing |

- **One-node Swarm** works like the Swarm mode with `replicas: 1`: a Raft cluster of one, which is its own majority. It can grow to 3 replicas later by adding edge nodes and raising `replicas:`, with no data migration.
- **Docker Compose** (`docker compose up`) runs a single instance, also a Raft cluster of one, with no membership, scaling or Swarm DNS. If no root key is mounted, Apiary generates one on first start (see [Cluster trust](#cluster-trust)). Moving to a Swarm means exporting a backup and restoring it into the new cluster.
- 2 replicas are not supported: they tolerate no more failures than 1, and writes stop if either is down.

The rest of this document describes the Swarm mode, and notes where the other modes differ.

## Deployment

- Apiary is deployed, upgraded and scaled with `docker stack deploy` and a compose file. The only step outside it is creating the root key secret once, before the first deploy (see [Cluster trust](#cluster-trust)).
- Apiary runs as a single Swarm service in `replicated` mode, with `max_replicas_per_node: 1` and a placement constraint on edge nodes marked with a node label. Scaling means changing `replicas:` and redeploying. High availability needs **at least 3 replicas**, and there must be at least as many labeled edge nodes as replicas.
- Rolling updates replace one replica at a time (`parallelism: 1`, `order: stop-first`, since host-mode ports can't be shared on a node) and roll back on failure (`failure_action: rollback`).

  ```yaml
  deploy:
    mode: replicated
    replicas: 3
    placement:
      max_replicas_per_node: 1
      constraints: [node.labels.apiary.edge == true]
    update_config:
      parallelism: 1
      order: stop-first
      failure_action: rollback
  ```

- Ports 80 and 443 (TCP, plus UDP 443 for HTTP/3) are published in [`host` mode](https://docs.docker.com/engine/swarm/services/#publish-a-services-ports-directly-on-the-swarm-node) on the edge nodes, so Apiary sees real client IP addresses. DNS or a load balancer outside the cluster spreads traffic across the edge nodes.
- **Only nodes running a replica accept traffic**, because host-mode ports open only where a replica runs. A load balancer with health checks stops sending traffic to a node by itself. With plain DNS, removing a replica's node must also remove its address from DNS, and records should have a short TTL, otherwise some clients keep trying the old address until their cached record expires.
- The admin port is also published in `host` mode, so it opens only on edge nodes and Apiary sees the admin's real IP. Swarm can't bind a published port to one interface, so it is kept off the internet by the layers described in [Management](#management).
- Apiary uses host publishing mode, not host network mode (`network_mode: host`): the containers stay on the overlay network, so Apiary can still reach services by name. Host network mode isn't supported in any mode (see [Routing](#routing)).
- The Raft port is never published. Replicas reach each other over the overlay network.
- Each replica stores its copy of the state on a local volume on its node.
- One image contains the proxy, the admin API and the built Angular UI. It's published as `hub.datapoint.software/datapoint/apiary`, tagged with the bare version (`0.4.0`).
- The root key (see [Cluster trust](#cluster-trust)) is provided as a [Swarm secret](https://docs.docker.com/engine/swarm/secrets/).

## Routing

- Routes (hostname and path to a target) are defined **only in the admin UI** and stored in the replicated state. Apiary doesn't read service labels.
- A target is any hostname or IP address and port: a Swarm service name, a container name on a shared Docker network, or an application on the host or elsewhere. The same model works in every mode.
- Apiary refuses routes that would reach itself or internal endpoints: its own ports (on its own addresses, the host gateway and the host's addresses), loopback and link-local addresses (e.g. the cloud metadata endpoint `169.254.169.254`). It checks the IP address each connection actually goes to, not only the route's hostname, so a DNS name that later resolves to one of these is refused too (DNS rebinding).
- **Loopback is always blocked, and host network mode isn't supported.** In a normal container, loopback is the container itself, so blocking it costs nothing. Only with `network_mode: host` would loopback be the server, where software that listens only on `localhost` (databases, admin panels, debug endpoints, sometimes a Docker daemon on TCP) relies on staying private. A single wrong route would make it public. We left it out of the first version because:
  - Adding it later, as an opt-in setting, is a backwards-compatible change. Removing it once deployments depend on it would be a breaking change.
  - Host network mode isn't needed for anything else: host publishing mode already gives Apiary the real client IP, and host network mode would stop Apiary from reaching containers by name.
  - Apps on the host can still be routed, as below, or run in a container on the shared network.

  The cost is that an app that listens only on `127.0.0.1`, and can't be reconfigured or containerized, can't be routed. If that need comes up, revisit this as an opt-in.
- Apps on the same host are reached through the host's address on the Docker network, e.g. `host.docker.internal` (on Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]`). They must listen on an address the container can reach, not only on `127.0.0.1`.
- In Swarm, Apiary and the routed services share one attachable overlay network (e.g. `apiary`). Services join it in their own stack files, and Apiary reaches them by their Swarm service name. With Docker Compose, the shared network is a bridge network instead.
- Apiary doesn't need access to the Docker API. Keep it that way: that access is equivalent to root on the host, or control of the whole cluster for a manager node.
- First-version protocols: HTTP/1.1, HTTP/2, HTTP/3 (QUIC, which needs `libmsquic` in the image) and WebSockets, with HTTP to HTTPS redirects, plus raw TCP and UDP (see [TCP and UDP](#tcp-and-udp)).

### Projects

- Every route, stream route, redirect and uploaded certificate belongs to exactly one project. A new cluster starts with one project, "Default".
- Projects organize and filter: per-project overviews, route lists grouped by project, and counts and status per project. They are **not an access boundary**: roles still apply to the whole cluster.
- A project has a name, a one-line description and an icon. A project can only be deleted once it's empty: its routes are moved to another project or deleted first.
- Management actions that list or create these objects take a project, and audit entries record the project of the object they affect.

### Weighted and canary routing

By default a route has a single target group, and none of the following applies. Each feature is opt-in and configured per route, independently of the others:

- **Weights.** A route can send traffic to several target groups by weight (e.g. 90% to `shop-v1`, 10% to `shop-v2`), so a new version can be released gradually. YARP has no weighted policy built in, so Apiary adds one. Each replica applies the weights on its own, so the split is statistical, not exact.
- **Header or cookie selection.** A route can pick a target group by request header or cookie (e.g. `X-Canary: true`), so testers reach the new version on purpose. The header or cookie name and value are set per route.
- **Sticky sessions.** A route can set a cookie that keeps each client on the group it first got (YARP's session affinity), so users don't switch between versions mid-session. The cookie's name and lifetime are set per route.

### Compression and caching

- **Compression** (Brotli and gzip) is set per route and **off by default**. Compressing HTTPS responses that mix secrets with text an attacker can influence allows the [BREACH attack](https://www.breachattack.com/), which is why ASP.NET Core disables it for HTTPS unless enabled. Responses that are already compressed (images, archives) are skipped.
- **Caching** is set per route and **off by default**. Apiary caches only what the target allows through `Cache-Control`, and never responses to requests with `Authorization` or cookies, or responses that set cookies, unless the target explicitly marks them `public`.
- Each replica keeps its own cache in memory. Admins can purge a route's cache, which clears it on every replica.

### TCP and UDP

- A stream route forwards raw TCP or UDP from a port on the edge nodes to a target host and port, for traffic that isn't HTTP (e.g. databases, SMTP, MQTT, game servers). YARP doesn't do this, so it's Apiary's own code.
- Swarm ports can only be published in the compose file, not at runtime. So the compose file publishes a **range of ports** in `host` mode for stream routes (e.g. `10000-10099`, TCP and UDP), and each stream route takes a port from that range. Widening the range means redeploying.
- TCP routes are chosen by port. A TCP route can also choose by TLS server name (SNI) without decrypting (TLS passthrough), so several TLS services can share one port. UDP routes are chosen by port only, with a configurable idle timeout for each client's session.
- An open TCP connection or UDP session stays on the replica that accepted it. If that replica stops, the client must reconnect.

## Replicated state

- Replicas form a Raft cluster, finding each other through Swarm's DNS (`tasks.<service>`).
- **Voters and followers.** Some replicas vote and the rest are non-voting followers: they receive the state and serve traffic, but don't slow down writes. Raft needs a majority of voters to accept writes, so 3 voters tolerate one down and 5 tolerate two.
- **Voter count.** Admins configure a target of 3 or 5 voters. The actual number is the largest odd number no greater than both the target and the number of replicas: 1 replica gives 1 voter, 2 replicas give 1 voter and 1 follower, 3 or 4 replicas give 3 voters. An odd count is always at least as safe as the even count above it: 2 voters stop writes if either fails, while 1 voter and 1 follower only stop if the voter fails.
- **Replica identity.** A replica generates a random member ID the first time it starts with an empty volume, and stores it next to the state. The ID is part of the data: a replica whose volume is lost or wiped always joins as a new member, never under its old ID. This rules out a known Raft pitfall, where a member that lost its data but kept its ID helps form a majority that lacks committed changes, and those changes are lost. The UI and logs show each member's node name next to its ID (e.g. `edge-2 (a3f9…)`).
- **Replacing voters.** When a voter leaves (it was stopped, or it has been missing longer than a configurable timeout), a follower is promoted in its place if there is one. A voter that is briefly unreachable, e.g. during a network blip, isn't replaced, so membership doesn't churn. A missing member is removed straight away, without waiting for the timeout, when a new member starts on the same node: Swarm runs at most one replica per node, so the old one can't still be running there.
- **Membership is configurable.** In *automatic* mode, replicas that appear in Swarm DNS join, and ones that leave or stay missing past the timeout are removed, so the cluster scales with the edge nodes. In *manual* mode, new replicas wait until an admin approves them (UI or MCP), and admins remove dead ones. In both modes a replica must prove it's genuine (see [Cluster trust](#cluster-trust)) before it can join.
- **Writes go to the leader.** A command that changes state and reaches another replica is forwarded to the Raft leader, which returns the result. Callers never need to know which replica leads (see [Writes](#writes)).
- The state holds projects, routes, admin users and their roles, OAuth clients and tokens, the audit log, automatic and uploaded certificates and their private keys, the ACME account key, pending challenge tokens, and locks.
- **Replicas leave cleanly.** When Swarm stops a replica (scale-down, rolling update or node drain), it hands off leadership if it leads, and a voter steps down so a follower can be promoted, within `stop_grace_period`. Apiary refuses to step down a voter if that would leave fewer voters than a majority needs.
- **Healthy means caught up, once.** A replica's health check passes only once it has joined the cluster and received the state, so Swarm waits for it before stopping the next replica in a rolling update. After that it stays healthy as long as the process responds, even if it falls behind for a while (see [Observability](#observability)).
- Every replica keeps proxying with its last known routes and certificates even without a majority. Only writes stop, such as route and user changes and certificate renewals.
- **Backups are on demand.** Admins export an encrypted snapshot of the state through the UI or MCP. A restore rebuilds a new cluster from it.

### Writes

Every change is a Datapoint.Mediator command, applied through a transaction behavior in Apiary that implements the library's `ITransactionContext`. The library needs no changes: its abstractions don't depend on EF Core.

- **Commands are forwarded, not HTTP requests.** On a follower, the behavior sends the action name, its JSON arguments, the signed-in user and their IP address to the leader over the replicas' mutual TLS. Forwarding the HTTP request instead would hide the admin's IP address from the allowlist and audit log, and break MCP sessions on every leadership change.
- **The leader decides.** It runs authorization, validation and the handler against the latest state, so a user who was just demoted is refused.
- **One entry per command.** The command's changes and its audit entry are appended as a single Raft entry, so a change is never saved without its audit record. The caller gets its result once the entry is saved by a majority.
- **Queries run locally**, on whichever replica receives them.
- **Safe retries.** Each forwarded command carries a unique request ID. The leader remembers recently applied IDs and their results. When a leader fails before replying, the follower retries with the same ID against the new leader, which returns the stored result if the command was already applied, instead of applying it twice. Callers see "unknown" only if no leader returns before a timeout.
- **It lives in Apiary.** Leader forwarding is specific to Apiary's design. Reusable parts, such as request-ID deduplication, can move into Datapoint.Mediator if another project needs them.

### Forced recovery

If most voters are lost for good, writes can never resume. A forced recovery makes a surviving replica the only voter of a new cluster, like Swarm's `docker swarm init --force-new-cluster`. The survivor may lack the last few changes, which only a majority had. That is mostly harmless (a route to redo, a certificate renewed again), except for removed users, downgraded roles and revoked tokens: losing one of those gives back access that was taken away. The safeguards are built around that:

1. **Never automatic.** An admin runs a one-time command inside a surviving container (e.g. `docker exec <container> apiary recover --force`), offered through Datapoint.Mediator's command-line host. It's a command, not a configuration setting, so it can't be left on by mistake and repeated on every restart. Running `docker exec` already requires control of the host, so it grants no new power.
2. **The most up-to-date survivor.** If several replicas survive, the command shows how far behind each one is and recovers from the most recent.
3. **What may be lost is shown first.** The command shows the time of the survivor's last change and asks for confirmation.
4. **All sign-ins and tokens are revoked.** Every session and OAuth token is invalidated, so nobody keeps access through a lost revocation without signing in again. The command also lists users and roles for review.
5. **Old replicas are kept out.** The recovered cluster gets a new identity. A lost replica that comes back with its old state is refused, and must start empty and rejoin.
6. **It's audited.** The recovery is the first audit entry of the new cluster.

## Cluster trust

Security steps that admins have to remember get skipped, so Apiary rotates everything it can by itself, and leaves admins a single, familiar step for the rest.

### The root key

- Operators create one Swarm secret, once, before the first deploy: the **root key**, a random value that Apiary generates:

  ```bash
  docker run --rm hub.datapoint.software/datapoint/apiary:<version> secrets init | docker secret create apiary_root_key_1 -
  ```

  The key goes straight from the command into Swarm's encrypted store and never touches disk. The compose file references it with `external: true`.
- From the root key, Apiary derives the key that protects the state at rest, and the credential a brand-new replica uses to prove it's genuine when it first joins.
- Swarm mounts the secret into every Apiary task, including new ones, so replicas can join automatically and nothing else on the network can.
- The root key is kept apart from the volume holding the state, so a copy of a node's disk doesn't expose certificate private keys. This is why Apiary doesn't generate its own root key in Swarm, even on one node.
- **With Docker Compose**, operators can mount a root key made with `secrets init` through a Compose `secrets: file:` entry. If none is mounted, Apiary generates one on first start into its own directory, separate from the state volume, and logs a warning.

### What rotates automatically

| What | When | Who |
| --- | --- | --- |
| Replica certificates | Every time a replica starts | Apiary |
| The cluster certificate authority (CA) | Well before it expires | Apiary |
| Data encryption keys | On a schedule | Apiary |
| The root key | Only after a suspected compromise | An admin, in one deploy |

- **The cluster CA lives in the replicated state**, encrypted, not in the Swarm secret. Replicas authenticate each other over mutual TLS with short-lived certificates from it. When the CA nears expiry, the leader creates a new one; replicas trust both until every replica has a certificate from the new one, then the old one is dropped.
- **Envelope encryption.** The state is encrypted with data keys, and only the data keys are encrypted with the key derived from the root key. Replacing a data key or the root key then re-encrypts a few small keys, not the whole state.

### Rotating the root key

One step, with nothing to remember in between:

1. Create a new secret with `secrets init` (e.g. `apiary_root_key_2`), change the secret's name in the compose file, and run `docker stack deploy`.

During the rolling update, each restarted replica rejoins with the certificate it already has, so it doesn't need the old root key. It re-protects its data with the new key and reports that to the cluster, which then also accepts the new key from brand-new replicas. Once every replica runs the new key, Apiary forgets the old one by itself. The admin UI shows the progress (e.g. "2 of 3 replicas on the new key") and warns if it stalls. Remove the old Swarm secret afterwards.

## Certificates

- [HTTP-01 challenges](https://letsencrypt.org/docs/challenge-types/#http-01-challenge) only, for now. A challenge request can arrive at any edge node (Let's Encrypt validates from several places at once), so every replica answers it from the replicated state. A replica that doesn't have the token yet, e.g. because it's catching up, asks the leader before answering, so a lagging replica doesn't fail the validation. No wildcard certificates; DNS-01 may be added later.
- One replica at a time requests or renews a given certificate, holding a lock in the replicated state, so replicas don't race into [Let's Encrypt's rate limits](https://letsencrypt.org/docs/rate-limits/).
- **Uploaded certificates.** Admins can also upload their own certificates (a PEM certificate chain and private key), e.g. wildcard certificates or certificates from an internal CA. Apiary checks that the key matches the certificate, that the chain is complete and that it hasn't expired, and stores the private key encrypted like any other. Uploaded certificates aren't renewed automatically, so Apiary warns before they expire.
- Each route either uses an automatic certificate or names an uploaded one. An uploaded certificate covering a hostname doesn't silently replace an automatic one; the route says which it uses.
- Kestrel picks the certificate for each connection by hostname (SNI), from the routes' choices.

## Management

Administrators manage and query Apiary in two ways: through the Angular UI, or through their AI agents over the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP).

- Every management operation (e.g. create a route, list certificates) is a Datapoint.Mediator command or query, named with `[Action]`. The same action is mapped as an HTTP endpoint for the UI (`Datapoint.Mediator.AspNetCore`) and as an MCP tool for agents (`Datapoint.Mediator.ModelContextProtocol`), so both get the same validation and authorization.
- Authorization is denied by default: every action needs an authorizer.
- **Agents have the same permissions as the user who connected them.** Datapoint.Mediator marks queries as read-only and commands as possibly destructive (MCP's `readOnlyHint` and `destructiveHint`), so MCP clients that honor these hints ask the user before running a command. Whether they do is up to the client and its settings; Apiary can't enforce or verify it (see [risks.md](risks.md)). The UI lists each user's connected agents, and any of them can be disconnected, revoking its tokens.
- The UI, its HTTP API and the MCP endpoint are all served on the admin port, which must **never be reachable from the internet**. Every replica serves it, so admins can use any edge node. It's protected by three independent layers (defense in depth), so it stays safe if one fails:
  1. **A network firewall outside the hosts** (e.g. a cloud security group or the network's firewall) allows the admin port only from the VPN or internal address ranges. This is the main layer: Docker's iptables rules can't bypass it. Rules in Docker's [`DOCKER-USER` chain](https://docs.docker.com/engine/network/packet-filtering-firewalls/) on each node can add to it, but aren't relied on.
  2. **An allowlist inside Apiary.** The admin listener accepts connections only from configured address ranges, by default the private ranges `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` and `fc00::/7`. It checks the connection's own source address and never `X-Forwarded-For` or similar headers, which clients can set to anything.
  3. **Authentication**, for users and agents alike.
- With Docker Compose, the admin port can also be bound to one interface (e.g. `"10.0.0.5:9443:9443"`).
- A stricter alternative is not publishing the admin port at all, and reaching it through a VPN container (e.g. WireGuard) on Apiary's network. It costs one more service to run.
- **Sign-in.** Admins sign in either with a local account, stored in the replicated state, or through single sign-on with an OpenID Connect (OIDC) identity provider such as Entra ID or Keycloak.
  - Roles can be mapped from the identity provider's groups, so access is managed there and removed when people leave.
  - Local accounts stay available as a break-glass way in, for when the identity provider is down. That matters because the identity provider may itself be routed through Apiary.
  - For MCP, Apiary stays the OAuth authorization server, and sends users to the identity provider to sign in.
- **Local accounts** guard the most powerful access, since they are also the break-glass way in. Following [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html):
  - **Password hashing:** PBKDF2-HMAC-SHA512, built into .NET, with OWASP's recommended iteration count (about 210,000). Each hash stores its algorithm and settings, so a stronger algorithm (e.g. Argon2id) can be adopted later by re-hashing each password at its user's next sign-in.
  - **Throttling:** each failed sign-in for the same account and IP address adds a growing delay. There is no hard lockout, which would let an attacker lock out the break-glass account on purpose. Delays are kept in memory on each replica, not in the replicated state, so sign-in doesn't depend on a majority. Repeated failures are audited and shown in the UI.
  - **Multi-factor authentication is required** for every local account: an authenticator app code (TOTP), with one-time recovery codes. Passkeys (WebAuthn) may be added later. First-access setup asks the first Administrator to set up MFA before it completes.
  - **Password rules:** at least 15 characters, checked against a built-in list of common passwords. No composition rules (e.g. "one symbol") and no forced periodic changes, which lead to weaker passwords. An optional check against [Have I Been Pwned](https://haveibeenpwned.com/Passwords), off by default, rejects leaked passwords; it sends only the first 5 characters of the password's SHA-1 hash, but it is still an outbound call.
- **First admin.** A new cluster has no users, so the first person to open the admin UI creates the first Administrator. To keep the window before that small:
  1. Setup is offered only for 15 minutes after Apiary starts with no users. After that it closes, and restarting Apiary reopens it, which already requires control of the deployment.
  2. Completing setup sets a permanent flag in the state, so setup never reopens, even if users are deleted later. Apiary refuses to delete or demote the last Administrator.
  3. Setup is only reachable on the admin port, with its firewall and allowlist, and is the first entry in the audit log, with the source IP address.
  4. On start, Apiary logs where and until when setup is open (e.g. "Waiting for setup at https://edge-1:9443 until 14:35").

  If every Administrator is locked out, `docker exec <container> apiary users create-admin --name <name>` prints a one-time link, valid for about 15 minutes, where the new Administrator sets their password in the browser. Running `docker exec` already requires control of the host, and the action is audited.
- **Roles.** Every user has one role, and every authorizer checks it:

  | Role | Can |
  | --- | --- |
  | Viewer | Read everything except secrets: routes, certificates (without private keys), cluster status, audit log. |
  | Operator | Everything a Viewer can, plus create, change and delete routes and certificates. |
  | Administrator | Everything, including users, roles, cluster membership, backups and restores. |

- **Uploading private keys is UI only.** The certificate upload action isn't offered as an MCP tool, so private keys never pass through an AI agent or its model provider.
- **Audit log.** Every action that changes state, and every denied action, is recorded from the start, whether it came from the UI or MCP: when, who (user, and the agent's OAuth client when there is one), from which IP address, the action name, the IDs it affected, and whether it succeeded. Arguments are not recorded, since they can contain secrets such as private keys or passwords. Read-only actions aren't recorded by default, to keep the log small.
- The audit log is part of the replicated state, so it's consistent across replicas and included in backups. A change whose audit entry can't be written fails, so nothing changes unrecorded. Entries are kept for a configurable period, 1 year by default, and can also be sent to the logs.
- **Agents authenticate with OAuth**, as the [MCP authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) describes. Apiary is the authorization server: the user signs in through a browser (with a local account or single sign-on) and the agent receives short-lived tokens. We implement only the parts of OAuth the specification needs, without an OAuth server library.

## Observability

Apiary reports what it's doing; alerting is left to the monitoring system that receives it. Apiary only shows warnings in its own UI.

### Metrics and traces

- [OpenTelemetry](https://opentelemetry.io/), the vendor-neutral standard, which Datapoint.Mediator already emits. Apiary exports over OTLP to a configured endpoint, and also offers a Prometheus `/metrics` endpoint on the admin port. Both are configurable.
- Key metrics: requests per route and status code, latency, target health, days until each certificate expires, failed renewals, each replica's Raft role and how far behind it is, and failed writes.

### Access logs

- One JSON line per request, written to standard output, where Docker's logging drivers collect it. Exporting over OTLP is optional.
- Each line holds the time, client IP address, method, host, path, status, response size, duration, route, target and user agent.
- **Query strings are left out by default**, since they often carry tokens or personal data (e.g. `?token=…`). Headers, cookies and request bodies are never logged.
- Apiary doesn't store access logs, so their retention is set by the log pipeline that collects them.

### Personal data

- IP addresses are logged in full by default, for security investigations and rate-limit tuning. The GDPR recognizes network and information security as a legitimate interest ([Recital 49](https://gdpr-info.eu/recitals/no-49/)). An option shortens them (e.g. `203.0.113.0` instead of `203.0.113.45`).
- The audit log, which Apiary does store, keeps entries for a configurable period, 1 year by default. Older entries are deleted automatically.
- **Signed off** by the data protection officer on 2026-11-02: full IP addresses by default, on the grounds of network and information security, and a default audit log retention of 1 year, long enough to investigate incidents found months later.

### Health checks

- **The Docker health check** passes once a replica has first caught up with the cluster, then stays healthy as long as the process responds. Swarm replaces tasks whose health check fails, so failing a replica that falls briefly behind under load would weaken the cluster when it's busiest. Falling behind shows in the metrics instead.
- **The admin port** offers `/health/live` (the process responds) and `/health/ready` (caught up, with routes and certificates loaded) for monitoring tools.
- **The public ports** have no health endpoint by default. A load balancer in front can check TCP port 443, or a path admins enable.
