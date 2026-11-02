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

| Mode | Replicas | High availability | Cluster secret |
| --- | --- | --- | --- |
| Swarm | 3 or more | Yes | Required |
| One-node Swarm | 1 | No | Required |
| Docker Compose, no Swarm | 1 | No | Generated if missing |

- **One-node Swarm** works like the Swarm mode with `replicas: 1`: a Raft cluster of one, which is its own majority. It can grow to 3 replicas later by adding edge nodes and raising `replicas:`, with no data migration.
- **Docker Compose** (`docker compose up`) runs a single instance, also a Raft cluster of one, with no membership, scaling or Swarm DNS. If no cluster secret is mounted, Apiary generates one on first start (see [Cluster trust](#cluster-trust)). Moving to a Swarm means exporting a backup and restoring it into the new cluster.
- 2 replicas are not supported: they tolerate no more failures than 1, and writes stop if either is down.

The rest of this document describes the Swarm mode, and notes where the other modes differ.

## Deployment

- Apiary is deployed, upgraded and scaled with `docker stack deploy` and a compose file. The only step outside it is creating the cluster secret once, before the first deploy (see [Cluster trust](#cluster-trust)).
- Apiary runs as a single Swarm service in `replicated` mode, with `max_replicas_per_node: 1` and a placement constraint on edge nodes marked with a node label. Scaling means changing `replicas:` and redeploying. High availability needs **at least 3 replicas**, and there must be at least as many labelled edge nodes as replicas.
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
- One image contains the proxy, the admin API and the built Angular UI.
- Cluster credentials (see [Cluster trust](#cluster-trust)) are provided as [Swarm secrets](https://docs.docker.com/engine/swarm/secrets/).

## Routing

- Routes (hostname and path to a target) are defined **only in the admin UI** and stored in the replicated state. Apiary doesn't read service labels.
- A target is any hostname or IP address and port: a Swarm service name, a container name on a shared Docker network, or an application on the host or elsewhere. The same model works in every mode.
- Apiary refuses routes that would reach itself or internal endpoints: its own ports (on its own addresses, the host gateway and the host's addresses), loopback and link-local addresses (e.g. the cloud metadata endpoint `169.254.169.254`). It checks the IP address each connection actually goes to, not only the route's hostname, so a DNS name that later resolves to one of these is refused too (DNS rebinding).
- **Loopback is always blocked, and host network mode isn't supported.** In a normal container, loopback is the container itself, so blocking it costs nothing. Only with `network_mode: host` would loopback be the server, where software that listens only on `localhost` (databases, admin panels, debug endpoints, sometimes a Docker daemon on TCP) relies on staying private. A single wrong route would make it public. We left it out of the first version because:
  - Adding it later, as an opt-in setting, is a backwards-compatible change. Removing it once deployments depend on it would be a breaking change.
  - Host network mode isn't needed for anything else: host publishing mode already gives Apiary the real client IP, and host network mode would stop Apiary from reaching containers by name.
  - Apps on the host can still be routed, as below, or run in a container on the shared network.

  The cost is that an app that listens only on `127.0.0.1`, and can't be reconfigured or containerised, can't be routed. If that need comes up, revisit this as an opt-in.
- Apps on the same host are reached through the host's address on the Docker network, e.g. `host.docker.internal` (on Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]`). They must listen on an address the container can reach, not only on `127.0.0.1`.
- In Swarm, Apiary and the routed services share one attachable overlay network (e.g. `apiary`). Services join it in their own stack files, and Apiary reaches them by their Swarm service name. With Docker Compose, the shared network is a bridge network instead.
- Apiary doesn't need access to the Docker API. Keep it that way: that access is equivalent to root on the host, or control of the whole cluster for a manager node.
- First-version protocols: HTTP/1.1, HTTP/2, HTTP/3 (QUIC, which needs `libmsquic` in the image) and WebSockets, with HTTP to HTTPS redirects, plus raw TCP and UDP (see [TCP and UDP](#tcp-and-udp)).

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
- **Replacing voters.** When a voter leaves (it was stopped, or it has been missing longer than a configurable timeout), a follower is promoted in its place if there is one. A voter that is briefly unreachable, e.g. during a network blip, isn't replaced, so membership doesn't churn.
- **Membership is configurable.** In *automatic* mode, replicas that appear in Swarm DNS join, and ones that leave or stay missing past the timeout are removed, so the cluster scales with the edge nodes. In *manual* mode, new replicas wait until an admin approves them (UI or MCP), and admins remove dead ones. In both modes a replica must prove it's genuine (see [Cluster trust](#cluster-trust)) before it can join.
- **Writes go to the leader.** A command that changes state and reaches another replica is forwarded to the Raft leader, which returns the result. Callers never need to know which replica leads.
- The state holds routes, admin users and their roles, OAuth clients and tokens, the audit log, automatic and uploaded certificates and their private keys, the ACME account key, pending challenge tokens, and locks.
- **Replicas leave cleanly.** When Swarm stops a replica (scale-down, rolling update or node drain), it hands off leadership if it leads, and a voter steps down so a follower can be promoted, within `stop_grace_period`. Apiary refuses to step down a voter if that would leave fewer voters than a majority needs.
- **Healthy means caught up.** A replica's health check passes only once it has joined the cluster and received the state, so Swarm waits for it before stopping the next replica in a rolling update.
- Every replica keeps proxying with its last known routes and certificates even without a majority. Only writes stop, such as route and user changes and certificate renewals.
- **Backups are on demand.** Admins export an encrypted snapshot of the state through the UI or MCP. A restore rebuilds a new cluster from it.

## Cluster trust

- Operators create one Swarm secret, once, before the first deploy. It's a bundle that Apiary itself generates, holding a certificate authority (CA) that replicas use to authenticate each other over mutual TLS, and the key that encrypts the state at rest:

  ```bash
  docker run --rm datapoint/apiary:<version> secrets init | docker secret create apiary_cluster -
  ```

  The bundle goes straight from the command into Swarm's encrypted store and never touches disk. The compose file references it with `external: true`.
- Swarm mounts the secret into every Apiary task, including new ones, so replicas can join automatically and nothing else on the network can.
- The encryption key is kept apart from the volume holding the state, so a copy of a node's disk doesn't expose certificate private keys. This is why Apiary doesn't generate its own keys in Swarm, even on one node.
- **With Docker Compose**, operators can mount a secret made with `secrets init` through a Compose `secrets: file:` entry. If none is mounted, Apiary generates one on first start into its own directory, separate from the state volume, and logs a warning.
- How the secret is rotated is still open (see [open-decisions.md](open-decisions.md)).

## Certificates

- [HTTP-01 challenges](https://letsencrypt.org/docs/challenge-types/#http-01-challenge) only, for now. A challenge request can arrive at any edge node (Let's Encrypt validates from several places at once), so every replica answers it from the replicated state. A replica that doesn't have the token yet, e.g. because it's catching up, asks the leader before answering, so a lagging replica doesn't fail the validation. No wildcard certificates; DNS-01 may be added later.
- One replica at a time requests or renews a given certificate, holding a lock in the replicated state, so replicas don't race into [Let's Encrypt's rate limits](https://letsencrypt.org/docs/rate-limits/).
- **Uploaded certificates.** Admins can also upload their own certificates (a PEM certificate chain and private key), e.g. wildcard certificates or certificates from an internal CA. Apiary checks that the key matches the certificate, that the chain is complete and that it hasn't expired, and stores the private key encrypted like any other. Uploaded certificates aren't renewed automatically, so Apiary warns before they expire.
- Each route either uses an automatic certificate or names an uploaded one. An uploaded certificate covering a hostname doesn't silently replace an automatic one; the route says which it uses.
- Kestrel picks the certificate for each connection by hostname (SNI), from the routes' choices.

## Management

Administrators manage and query Apiary in two ways: through the Angular UI, or through their AI agents over the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP).

- Every management operation (e.g. create a route, list certificates) is a Datapoint.Mediator command or query, named with `[Action]`. The same action is mapped as an HTTP endpoint for the UI (`Datapoint.Mediator.AspNetCore`) and as an MCP tool for agents (`Datapoint.Mediator.ModelContextProtocol`), so both get the same validation and authorization.
- Authorization is denied by default: every action needs an authorizer. An agent acts as the user who connected it and gets no more permissions than that user.
- The UI, its HTTP API and the MCP endpoint are all served on the admin port, which must **never be reachable from the internet**. Every replica serves it, so admins can use any edge node. It's protected by three independent layers (defence in depth), so it stays safe if one fails:
  1. **A network firewall outside the hosts** (e.g. a cloud security group or the network's firewall) allows the admin port only from the VPN or internal address ranges. This is the main layer: Docker's iptables rules can't bypass it. Rules in Docker's [`DOCKER-USER` chain](https://docs.docker.com/engine/network/packet-filtering-firewalls/) on each node can add to it, but aren't relied on.
  2. **An allowlist inside Apiary.** The admin listener accepts connections only from configured address ranges, by default the private ranges `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` and `fc00::/7`. It checks the connection's own source address and never `X-Forwarded-For` or similar headers, which clients can set to anything.
  3. **Authentication**, for users and agents alike.
- With Docker Compose, the admin port can also be bound to one interface (e.g. `"10.0.0.5:9443:9443"`).
- A stricter alternative is not publishing the admin port at all, and reaching it through a VPN container (e.g. WireGuard) on Apiary's network. It costs one more service to run.
- **Sign-in.** Admins sign in either with a local account, stored in the replicated state, or through single sign-on with an OpenID Connect (OIDC) identity provider such as Entra ID or Keycloak.
  - Roles can be mapped from the identity provider's groups, so access is managed there and removed when people leave.
  - Local accounts stay available as a break-glass way in, for when the identity provider is down. That matters because the identity provider may itself be routed through Apiary.
  - For MCP, Apiary stays the OAuth authorization server, and sends users to the identity provider to sign in.
- **Roles.** Every user has one role, and every authorizer checks it:

  | Role | Can |
  | --- | --- |
  | Viewer | Read everything except secrets: routes, certificates (without private keys), cluster status, audit log. |
  | Operator | Everything a Viewer can, plus create, change and delete routes and certificates. |
  | Administrator | Everything, including users, roles, cluster membership, backups and restores. |

- **Uploading private keys is UI only.** The certificate upload action isn't offered as an MCP tool, so private keys never pass through an AI agent or its model provider.
- **Audit log.** Every action that changes state, and every denied action, is recorded from the start, whether it came from the UI or MCP: when, who (user, and the agent's OAuth client when there is one), from which IP address, the action name, the IDs it affected, and whether it succeeded. Arguments are not recorded, since they can contain secrets such as private keys or passwords. Read-only actions aren't recorded by default, to keep the log small.
- The audit log is part of the replicated state, so it's consistent across replicas and included in backups. A change whose audit entry can't be written fails, so nothing changes unrecorded. Entries are kept for a configurable period and can also be sent to the logs.
- **Agents authenticate with OAuth**, as the [MCP authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) describes. Apiary is the authorization server: the user signs in through a browser (with a local account or single sign-on) and the agent receives short-lived tokens. We implement only the parts of OAuth the specification needs, without an OAuth server library.
