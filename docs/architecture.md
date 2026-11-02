# Architecture

How Apiary is built and deployed. Decisions not yet made are in [open-decisions.md](open-decisions.md), and the risks these choices bring are in [risks.md](risks.md).

## Technology

- **Backend:** [.NET 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) (LTS, supported until November 2028), with ASP.NET Core.
- **Proxy engine:** [YARP](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/yarp-overview), on Kestrel. YARP handles forwarding, load balancing and health checks; Apiary loads routes into it at runtime.
- **State replication:** [DotNext.Net.Cluster](https://dotnet.github.io/dotNext/features/cluster/index.html), a .NET implementation of the [Raft](https://raft.github.io/) consensus algorithm. Apiary writes the state machine (routes, certificates, locks), not the consensus.
- **Management operations:** [Datapoint.Mediator](https://github.com/datapoint-software/mediator), which we also own and maintain. It's a pre-release (`4.0.0-beta.3` at the time of writing). Each operation is written once, as a command or query, and offered both as an HTTP endpoint and as an MCP tool.
- **Admin interface:** [Angular 22](https://angular.dev/reference/releases), built and served by the .NET backend. Each Angular major version is supported for about 18 months, so plan to upgrade once a year.

Move to the next .NET LTS or Angular major version before the current one leaves support.

## Deployment

- Apiary runs as a single Swarm service in `global` mode, constrained to edge nodes marked with a node label. One task per edge node; there must be **at least 3 edge nodes**. Scaling out means labelling more nodes.
- Ports 80 and 443 (TCP, plus UDP 443 for HTTP/3) are published in [`host` mode](https://docs.docker.com/engine/swarm/services/#publish-a-services-ports-directly-on-the-swarm-node) on the edge nodes, so Apiary sees real client IP addresses. DNS or a load balancer outside the cluster spreads traffic across the edge nodes.
- Each replica stores its copy of the state on a local volume on its node.
- One image contains the proxy, the admin API and the built Angular UI.
- Cluster credentials (see [Cluster trust](#cluster-trust)) are provided as [Swarm secrets](https://docs.docker.com/engine/swarm/secrets/).

## Routing

- Routes (hostname and path to target service and port) are defined **only in the admin UI** and stored in the replicated state. Apiary doesn't read service labels.
- Apiary and the routed services share one attachable overlay network (e.g. `apiary`). Services join it in their own stack files, and Apiary reaches them by their Swarm service name.
- Apiary doesn't need access to the Docker API. Keep it that way: that access is equivalent to root on the host, or control of the whole cluster for a manager node.
- First-version protocols: HTTP/1.1, HTTP/2, HTTP/3 (QUIC, which needs `libmsquic` in the image) and WebSockets, with HTTP to HTTPS redirects. Raw TCP/UDP proxying is out of scope.

## Replicated state

- Replicas form a Raft cluster, finding each other through Swarm's DNS (`tasks.<service>`).
- **Voters and followers.** A fixed, odd number of replicas (3 or 5, configurable) vote. Raft needs a majority of voters to accept writes, so 3 voters tolerate one down and 5 tolerate two. Any further replicas join as non-voting followers: they receive the state and serve traffic, but don't slow down writes. When a voter is lost, a follower is promoted.
- **Membership is configurable.** In *automatic* mode, replicas that appear in Swarm DNS join, and ones that disappear are removed, so the cluster scales with the edge nodes. In *manual* mode, new replicas wait until an admin approves them (UI or MCP), and admins remove dead ones. In both modes a replica must prove it's genuine (see [Cluster trust](#cluster-trust)) before it can join.
- **Writes go to the leader.** A command that changes state and reaches another replica is forwarded to the Raft leader, which returns the result. Callers never need to know which replica leads.
- The state holds routes, admin users, OAuth clients and tokens, certificates and their private keys, the ACME account key, pending challenge tokens, and locks.
- Every replica keeps proxying with its last known routes and certificates even without a majority. Only writes stop, such as route and user changes and certificate renewals.
- **Backups are on demand.** Admins export an encrypted snapshot of the state through the UI or MCP. A restore rebuilds a new cluster from it.

## Cluster trust

- Operators create the cluster's credentials once, as Swarm secrets: the key that encrypts the state at rest, and what replicas use to authenticate each other over mutual TLS. Swarm mounts them into every Apiary task, including new ones, so replicas can join automatically and nothing else on the network can.
- What exactly the secrets contain, and how they are rotated, is still open (see [open-decisions.md](open-decisions.md)).

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
- **Agents authenticate with OAuth**, as the [MCP authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) describes. Apiary is the authorization server: the user signs in through a browser and the agent receives short-lived tokens. We implement only the parts of OAuth the specification needs, without an OAuth server library.
