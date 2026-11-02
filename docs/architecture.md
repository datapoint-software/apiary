# Architecture

How Apiary is built and deployed. Decisions not yet made are in [open-decisions.md](open-decisions.md), and the risks these choices bring are in [risks.md](risks.md).

## Technology

- **Backend:** [.NET 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) (LTS, supported until November 2028), with ASP.NET Core.
- **Proxy engine:** [YARP](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/yarp-overview), on Kestrel. YARP handles forwarding, load balancing and health checks; Apiary loads routes into it at runtime.
- **State replication:** [DotNext.Net.Cluster](https://dotnet.github.io/dotNext/features/cluster/index.html), a .NET implementation of the [Raft](https://raft.github.io/) consensus algorithm. Apiary writes the state machine (routes, certificates, locks), not the consensus.
- **Management operations:** [Datapoint.Mediator](https://www.nuget.org/packages/Datapoint.Mediator), a pre-release (`4.0.0-beta.3` at the time of writing). Each operation is written once, as a command or query, and offered both as an HTTP endpoint and as an MCP tool.
- **Admin interface:** [Angular 22](https://angular.dev/reference/releases), built and served by the .NET backend. Each Angular major version is supported for about 18 months, so plan to upgrade once a year.

Move to the next .NET LTS or Angular major version before the current one leaves support.

## Deployment

- Apiary runs as a single Swarm service in `global` mode, constrained to **3 edge nodes** marked with a node label. One task per edge node gives 3 replicas.
- Ports 80 and 443 (TCP, plus UDP 443 for HTTP/3) are published in [`host` mode](https://docs.docker.com/engine/swarm/services/#publish-a-services-ports-directly-on-the-swarm-node) on the edge nodes, so Apiary sees real client IP addresses. DNS or a load balancer outside the cluster spreads traffic across the edge nodes.
- Each replica stores its copy of the state on a local volume on its node.
- One image contains the proxy, the admin API and the built Angular UI.

## Routing

- Routes (hostname and path to target service and port) are defined **only in the admin UI** and stored in the replicated state. Apiary doesn't read service labels.
- Apiary and the routed services share one attachable overlay network (e.g. `apiary`). Services join it in their own stack files, and Apiary reaches them by their Swarm service name.
- Apiary doesn't need access to the Docker API. Keep it that way: that access is equivalent to root on the host, or control of the whole cluster for a manager node.
- First-version protocols: HTTP/1.1, HTTP/2, HTTP/3 (QUIC, which needs `libmsquic` in the image) and WebSockets, with HTTP to HTTPS redirects. Raw TCP/UDP proxying is out of scope.

## Replicated state

- The 3 replicas form a Raft cluster, finding each other through Swarm's DNS (`tasks.<service>`). Raft needs a majority (2 of 3) to accept writes, so the cluster tolerates one replica down.
- The state holds routes, admin users, certificates and their private keys, the ACME account key, pending challenge tokens, and locks.
- Every replica keeps proxying with its last known routes and certificates even without a majority. Only writes stop, such as route and user changes and certificate renewals.

## Certificates

- [HTTP-01 challenges](https://letsencrypt.org/docs/challenge-types/#http-01-challenge) only, for now. A challenge request can arrive at any edge node, so every replica answers it from the replicated state. No wildcard certificates; DNS-01 may be added later.
- One replica at a time requests or renews a given certificate, holding a lock in the replicated state, so replicas don't race into [Let's Encrypt's rate limits](https://letsencrypt.org/docs/rate-limits/).
- Kestrel picks the certificate for each connection by hostname (SNI).

## Management

Administrators manage and query Apiary in two ways: through the Angular UI, or through their AI agents over the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP).

- Every management operation (e.g. create a route, list certificates) is a Datapoint.Mediator command or query, named with `[Action]`. The same action is mapped as an HTTP endpoint for the UI (`Datapoint.Mediator.AspNetCore`) and as an MCP tool for agents (`Datapoint.Mediator.ModelContextProtocol`), so both get the same validation and authorization.
- Authorization is denied by default: every action needs an authorizer. An agent acts as the user who connected it and gets no more permissions than that user.
- The UI, its HTTP API and the MCP endpoint are all served on the admin port, which is **not published on the public edge**. Reach them through a VPN or the internal network.
- Local user accounts, stored in the replicated state. Single sign-on through OIDC is planned for later.
