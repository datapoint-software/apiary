# Apiary

Apiary is a reverse proxy built for [Docker Swarm](https://docs.docker.com/engine/swarm/) clusters that must stay available. It routes incoming HTTP and HTTPS requests to Swarm services and manages TLS certificates automatically through [Let's Encrypt](https://letsencrypt.org/).

> **Status: initial design.** Nothing is implemented yet. This README records the goals and the decisions still open. Expect it to change as they are settled.

## Goals

- **Built for Swarm.** Routes come from the cluster itself: Apiary discovers services and their routing configuration (e.g. service labels) from the Swarm API, with no separate configuration to keep in sync.
- **High availability.** Apiary runs as several replicas across nodes. Losing a replica or a node must not drop traffic or lose certificates, and no replica is a single point of failure.
- **Automatic certificates.** Apiary obtains and renews certificates with the [ACME protocol](https://datatracker.ietf.org/doc/html/rfc8555) and shares them across all replicas, without manual steps.

## Open design decisions

These need to be settled, and recorded here, before or during the first implementation work.

1. **Language and runtime.** What Apiary is written in, and whether it wraps an existing proxy engine or implements the proxying itself.
2. **Route configuration.** The label schema services use to declare hostnames, paths, ports and TLS options.
3. **Shared state.** Where certificates, ACME account keys and challenge tokens live so every replica sees them: an external store (e.g. etcd, Consul), a store embedded in Apiary with its own consensus, or something else. [Swarm secrets](https://docs.docker.com/engine/swarm/secrets/) can't be updated in place, so they don't suit certificates that renew.
4. **ACME coordination.** Only one replica should request or renew a given certificate at a time (e.g. via a lock or leader election), so replicas don't race each other into [Let's Encrypt's rate limits](https://letsencrypt.org/docs/rate-limits/).
5. **Challenge type.** HTTP-01 works without DNS provider access, but the challenge request can reach any replica, so all of them must be able to answer it. DNS-01 allows wildcard certificates but needs DNS provider credentials. See [challenge types](https://letsencrypt.org/docs/challenge-types/).
6. **Ingress mode.** The Swarm [routing mesh](https://docs.docker.com/engine/swarm/ingress/) hides the client's real IP address from the proxy. Publishing ports in `host` mode keeps it but ties Apiary to specific nodes and needs an external way to spread traffic across them.

## Risks and considerations

- **Docker API access.** Reading Swarm services means talking to a manager node's Docker API. Access to the Docker socket is equivalent to root on that host, so it must be read-only and narrowly scoped (e.g. through a socket proxy), and Apiary must run on manager nodes or reach one securely.
- **Private keys.** Certificate private keys and the ACME account key are secrets. They must be encrypted at rest and in transit in the shared store, and never committed or logged.
- **Personal data in logs.** Access logs contain client IP addresses, which are personal data under the GDPR. How long logs are kept, and who can read them, needs a decision from someone with authority.
- **Exposed admin interfaces.** Any admin API or dashboard must not be reachable from the public internet by default.
- **Let's Encrypt limits.** Bugs that request certificates in a loop can lock a domain out of new certificates for days. Test against the [staging environment](https://letsencrypt.org/docs/staging-environment/) first.

## Contributing

See [CLAUDE.md](CLAUDE.md) for the conventions on branches, commits, merge requests and versions.
