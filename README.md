# Apiary

Apiary is a reverse proxy built for [Docker Swarm](https://docs.docker.com/engine/swarm/) clusters that must stay available. It routes incoming HTTP and HTTPS requests to Swarm services and manages TLS certificates automatically through [Let's Encrypt](https://letsencrypt.org/).

> **Status: initial design.** Nothing is implemented yet. The documentation below records the decisions made so far and those still open. Expect it to change as they are settled.

## Goals

- **Built for Swarm.** Apiary is deployed as a Swarm service, reaches services by name over a Swarm overlay network, and replicates its own state between its replicas, with no external database or key-value store to run.
- **High availability.** Apiary runs as several replicas across nodes. Losing a replica or a node must not drop traffic or lose certificates, and no replica is a single point of failure.
- **Deployed with a stack file.** After creating one root key secret, deploying, upgrading and scaling Apiary (adding or removing replicas) is only `docker stack deploy` with a compose file, safe to do in production.
- **Runs small too.** The same image also runs on a one-node Swarm or with Docker Compose on a single computer, without high availability and with fewer features.
- **Automatic certificates.** Apiary obtains and renews certificates with the [ACME protocol](https://datatracker.ietf.org/doc/html/rfc8555) and shares them across all replicas, without manual steps.

## Documentation

- [Architecture](docs/architecture.md): technology stack, deployment, routing, replicated state, certificates and management (admin UI and MCP).
- [Failure modes](docs/failure-modes.md): what happens when replicas, nodes or the network fail, and when the cluster is scaled.
- [Open decisions](docs/open-decisions.md): design questions still to be settled.
- [Risks and considerations](docs/risks.md): security, privacy and operational risks. Read it before changing how Apiary stores state, handles secrets or is exposed to the network.

## Contributing

See [CLAUDE.md](CLAUDE.md) for the conventions on branches, commits, merge requests and versions.
