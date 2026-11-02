# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

1. **Raft membership changes.** How an edge node is replaced or added: whether members join and leave automatically or through an admin action, and how a new member gets a copy of the state.
2. **Backups and recovery.** How the replicated state is backed up, and how to rebuild the cluster if a majority of replicas is lost for good.
3. **Local accounts.** Password hashing algorithm, sign-in throttling, and whether MFA is needed before OIDC arrives.
4. **Observability.** Access logs, metrics and health endpoints, and where they are sent.
5. **Commands and Raft writes.** Datapoint.Mediator's transaction behaviour is built for EF Core, which Apiary doesn't use. A command that changes state must be applied through the Raft leader, so Apiary needs its own behaviour that forwards or rejects writes on other replicas, and a rule for retries when a write's outcome is unknown.
6. **MCP authentication.** How agents prove which user they act for while only local accounts exist (e.g. per-user API tokens that can be revoked), and whether agents get fewer permissions than their user, such as read-only access by default.
