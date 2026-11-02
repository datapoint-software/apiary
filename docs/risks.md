# Risks and considerations

Known risks of Apiary's design, and the precautions they need. Read this before changing how Apiary stores state, handles secrets or is exposed to the network.

- **Private keys.** Certificate private keys and the ACME account key are secrets. They must be encrypted at rest on each replica's volume and in transit between replicas, and never committed or logged.
- **Raft traffic.** Replication traffic between replicas must be authenticated and encrypted (e.g. mutual TLS or an [encrypted overlay network](https://docs.docker.com/engine/network/drivers/overlay/#encrypt-traffic-on-an-overlay-network)). Otherwise anything on the network could read or inject state.
- **Docker API access.** Apiary must not be given access to the Docker API, which is equivalent to root on the host, or control of the whole cluster for a manager node.
- **Shared overlay network.** Every service on the `apiary` network can reach every other service on it, not only Apiary. Services that should be isolated from each other need separate networks.
- **Admin interface exposure.** The admin port, which serves the UI, its HTTP API and the MCP endpoint, must never be published on the public edge.
- **AI agents.** An agent can be manipulated by text it reads (prompt injection), such as a hostname, a header or an upstream error message chosen by an attacker, into calling tools its user didn't intend. Keep agent permissions minimal, record every action in an audit log, and consider requiring confirmation for destructive tools.
- **Pre-release dependency.** Datapoint.Mediator is in beta, so its API may change between versions. Pin the exact version and read its changelog before upgrading.
- **Local accounts.** Until OIDC arrives, Apiary owns password storage and brute-force protection, and accounts must be removed by hand when people leave.
- **Personal data in logs.** Access logs contain client IP addresses, which are personal data under the GDPR. How long logs are kept, and who can read them, needs a decision from someone with authority.
- **Let's Encrypt limits.** Bugs that request certificates in a loop can lock a domain out of new certificates for days. Test against the [staging environment](https://letsencrypt.org/docs/staging-environment/) first.
