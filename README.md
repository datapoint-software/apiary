# Apiary

Apiary is a reverse proxy built for [Docker Swarm](https://docs.docker.com/engine/swarm/) clusters that must stay available. It routes incoming HTTP and HTTPS requests to Swarm services and manages TLS certificates automatically through [Let's Encrypt](https://letsencrypt.org/).

> **Status: initial design.** Nothing is implemented yet. The documentation below records the decisions made so far and those still open. Expect it to change as they are settled.

## Goals

- **Built for Swarm.** Apiary is deployed as a Swarm service, reaches services by name over a Swarm overlay network, and replicates its own state between its replicas, with no external database or key-value store to run.
- **High availability.** Apiary runs as several replicas across nodes. Losing a replica or a node must not drop traffic or lose certificates, and no replica is a single point of failure.
- **Deployed with a stack file.** After creating one root key secret, deploying, upgrading and scaling Apiary (adding or removing replicas) is only `docker stack deploy` with a compose file, safe to do in production.
- **Runs small too.** The same image also runs on a one-node Swarm or with Docker Compose on a single computer, without high availability and with fewer features.
- **Automatic certificates.** Apiary obtains and renews certificates with the [ACME protocol](https://datatracker.ietf.org/doc/html/rfc8555) and shares them across all replicas, without manual steps.

## Try it

Apiary is in development, and its admin port is plain HTTP, so run it on your own machine only. With Docker:

```bash
docker compose -f deploy/compose.yaml up --build
```

- `http://localhost:9443` is the admin UI, bound to your machine only. The first visit creates the first administrator, with an authenticator app.
- Add a route from `whoami.localhost` to `whoami`, port 80, then open `http://whoami.localhost`.
- `docker compose -f deploy/compose.yaml logs -f apiary` shows the access log.
- Apiary generates a root key into the `keys` volume on first start, and warns about it. Without that key the `data` volume can't be read, so keep both, or mount your own key made with `docker run --rm apiary:dev secrets init` as a Compose secret at `/run/secrets/apiary_root_key`.

To try automatic certificates without a public address, add [Pebble](https://github.com/letsencrypt/pebble), Let's Encrypt's test server:

```bash
docker compose -f deploy/compose.yaml -f deploy/pebble/compose.yaml up --build
```

Add a route from `shop.apiary.test` to `whoami`, port 80. Pebble reaches Apiary through Docker's network, so it issues a certificate within seconds; see it under Certificates. Then check HTTPS with Pebble's root:

```bash
curl -sk https://localhost:15000/roots/0 > pebble-root.pem
curl --cacert pebble-root.pem --resolve shop.apiary.test:443:127.0.0.1 https://shop.apiary.test/
```

Without Pebble, Apiary asks Let's Encrypt's staging environment (`Apiary__Acme__DirectoryUrl`), which needs a public hostname pointing at your machine.

For development without Docker, run `dotnet run --project src/Datapoint.Apiary` and, in `src/web`, `npm start`, which serves the UI on `http://localhost:4200`.

## Documentation

- [Architecture](docs/architecture.md): technology stack, deployment, routing, replicated state, certificates and management (admin UI and MCP).
- [Engineering](docs/engineering.md): repository layout, dependency rules between projects, and the .NET and Angular conventions.
- [Failure modes](docs/failure-modes.md): what happens when replicas, nodes or the network fail, and when the cluster is scaled.
- [Implementation plan](docs/implementation-plan.md): the order features are built in, and how to try each milestone.
- [Open decisions](docs/open-decisions.md): design questions still to be settled.
- [Review notes](docs/review-notes.md): decisions and findings from building the milestones, waiting for review.
- [Risks and considerations](docs/risks.md): security, privacy and operational risks. Read it before changing how Apiary stores state, handles secrets or is exposed to the network.

## Contributing

See [CLAUDE.md](CLAUDE.md) for the conventions on branches, commits, merge requests and versions.

## License

Apiary is free software, licensed under the [GNU Affero General Public License, version 3](LICENSE) (AGPL-3.0), with additional terms in [NOTICE](NOTICE):

- You can use, change and share Apiary. If you share a modified version, or let others use it over a network, you must offer them its source code under the same license.
- The admin interface must keep the "Based on Apiary by Datapoint" attribution and the Datapoint logo.
- Modified versions must be marked as modified, and the license grants no rights to the Datapoint name or logo beyond that attribution. See the [trademark policy](TRADEMARKS.md).

Contributors sign the [Contributor License Agreement](CLA.md) before their first contribution is merged.

Copyright © 2026 Datapoint - Sistemas de Informação, Lda.
