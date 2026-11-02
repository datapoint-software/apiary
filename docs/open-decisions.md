# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

1. **Cluster secret rotation.** How the CA and encryption key in the cluster secret are rotated with a rolling update, without downtime or losing access to state encrypted with the old key (e.g. replicas trust both CAs, and keep old keys readable, during the change).
2. **Replica identity.** What identifies a Raft member: the Swarm task slot, the node, or an ID stored on the volume. A replica moved to another node starts with an empty volume, so it must be able to rejoin as a new member and the old member must be removed.
3. **First admin.** How the first admin account is created on a new cluster, before anyone can sign in (e.g. a one-time setup token printed in the logs).
4. **Local accounts.** Password hashing algorithm, sign-in throttling, and whether MFA is needed before OIDC arrives.
5. **Observability.** Access logs, metrics and health endpoints, and where they are sent.
6. **Write behaviour placement.** Datapoint.Mediator's transaction behaviour is built for EF Core, which Apiary doesn't use. Writes are forwarded to the Raft leader, and a rule is needed for retries when a write's outcome is unknown. Since we maintain Datapoint.Mediator, this behaviour can live in Apiary, or the parts that aren't Raft-specific can go into the library for other projects to reuse.
7. **Agent permissions.** Whether agents get fewer permissions than their user by default, such as read-only access unless the user grants more when connecting the agent.
