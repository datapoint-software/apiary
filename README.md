# Apiary

Apiary is a reverse proxy built for [Docker Swarm](https://docs.docker.com/engine/swarm/) clusters that must stay available. It routes incoming HTTP and HTTPS requests to Swarm services and manages TLS certificates automatically through [Let's Encrypt](https://letsencrypt.org/).

> **Status: initial design.** Nothing is implemented yet. This README records the decisions made so far and those still open. Expect it to change as they are settled.

## Goals

- **Built for Swarm.** Apiary is deployed as a Swarm service, reaches services by name over a Swarm overlay network, and replicates its own state between its replicas, with no external database or key-value store to run.
- **High availability.** Apiary runs as several replicas across nodes. Losing a replica or a node must not drop traffic or lose certificates, and no replica is a single point of failure.
- **Automatic certificates.** Apiary obtains and renews certificates with the [ACME protocol](https://datatracker.ietf.org/doc/html/rfc8555) and shares them across all replicas, without manual steps.

## Technology

- **Backend:** [.NET 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) (LTS, supported until November 2028), with ASP.NET Core.
- **Proxy engine:** [YARP](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/yarp-overview), on Kestrel. YARP handles forwarding, load balancing and health checks; Apiary loads routes into it at runtime.
- **State replication:** [DotNext.Net.Cluster](https://dotnet.github.io/dotNext/features/cluster/index.html), a .NET implementation of the [Raft](https://raft.github.io/) consensus algorithm. Apiary writes the state machine (routes, certificates, locks), not the consensus.
- **Admin interface:** [Angular 22](https://angular.dev/reference/releases), built and served by the .NET backend. Each Angular major version is supported for about 18 months, so plan to upgrade once a year.

Move to the next .NET LTS or Angular major version before the current one leaves support.

## Architecture

### Deployment

- Apiary runs as a single Swarm service in `global` mode, constrained to **3 edge nodes** marked with a node label. One task per edge node gives 3 replicas.
- Ports 80 and 443 (TCP, plus UDP 443 for HTTP/3) are published in [`host` mode](https://docs.docker.com/engine/swarm/services/#publish-a-services-ports-directly-on-the-swarm-node) on the edge nodes, so Apiary sees real client IP addresses. DNS or a load balancer outside the cluster spreads traffic across the edge nodes.
- Each replica stores its copy of the state on a local volume on its node.
- One image contains the proxy, the admin API and the built Angular UI.

### Routing

- Routes (hostname and path to target service and port) are defined **only in the admin UI** and stored in the replicated state. Apiary doesn't read service labels.
- Apiary and the routed services share one attachable overlay network (e.g. `apiary`). Services join it in their own stack files, and Apiary reaches them by their Swarm service name.
- Apiary doesn't need access to the Docker API. Keep it that way: that access is equivalent to root on the host, or control of the whole cluster for a manager node.
- First-version protocols: HTTP/1.1, HTTP/2, HTTP/3 (QUIC, which needs `libmsquic` in the image) and WebSockets, with HTTP to HTTPS redirects. Raw TCP/UDP proxying is out of scope.

### Replicated state

- The 3 replicas form a Raft cluster, finding each other through Swarm's DNS (`tasks.<service>`). Raft needs a majority (2 of 3) to accept writes, so the cluster tolerates one replica down.
- The state holds routes, admin users, certificates and their private keys, the ACME account key, pending challenge tokens, and locks.
- Every replica keeps proxying with its last known routes and certificates even without a majority. Only writes stop, such as route and user changes and certificate renewals.

### Certificates

- [HTTP-01 challenges](https://letsencrypt.org/docs/challenge-types/#http-01-challenge) only, for now. A challenge request can arrive at any edge node, so every replica answers it from the replicated state. No wildcard certificates; DNS-01 may be added later.
- One replica at a time requests or renews a given certificate, holding a lock in the replicated state, so replicas don't race into [Let's Encrypt's rate limits](https://letsencrypt.org/docs/rate-limits/).
- Kestrel picks the certificate for each connection by hostname (SNI).

### Admin interface

- Served on its own port, which is **not published on the public edge**. Reach it through a VPN or the internal network.
- Local user accounts, stored in the replicated state. Single sign-on through OIDC is planned for later.

## Open design decisions

1. **Raft membership changes.** How an edge node is replaced or added: whether members join and leave automatically or through an admin action, and how a new member gets a copy of the state.
2. **Backups and recovery.** How the replicated state is backed up, and how to rebuild the cluster if a majority of replicas is lost for good.
3. **Local accounts.** Password hashing algorithm, sign-in throttling, and whether MFA is needed before OIDC arrives.
4. **Observability.** Access logs, metrics and health endpoints, and where they are sent.

## Risks and considerations

- **Private keys.** Certificate private keys and the ACME account key are secrets. They must be encrypted at rest on each replica's volume and in transit between replicas, and never committed or logged.
- **Raft traffic.** Replication traffic between replicas must be authenticated and encrypted (e.g. mutual TLS or an [encrypted overlay network](https://docs.docker.com/engine/network/drivers/overlay/#encrypt-traffic-on-an-overlay-network)). Otherwise anything on the network could read or inject state.
- **Shared overlay network.** Every service on the `apiary` network can reach every other service on it, not only Apiary. Services that should be isolated from each other need separate networks.
- **Local accounts.** Until OIDC arrives, Apiary owns password storage and brute-force protection, and accounts must be removed by hand when people leave.
- **Personal data in logs.** Access logs contain client IP addresses, which are personal data under the GDPR. How long logs are kept, and who can read them, needs a decision from someone with authority.
- **Let's Encrypt limits.** Bugs that request certificates in a loop can lock a domain out of new certificates for days. Test against the [staging environment](https://letsencrypt.org/docs/staging-environment/) first.

## Contributing

See [CLAUDE.md](CLAUDE.md) for the conventions on branches, commits, merge requests and versions.
