# Open decisions

Design decisions still to be made. When one is settled, record it in [architecture.md](architecture.md) and remove it from this list.

1. **Raft membership changes.** How an edge node is replaced or added: whether members join and leave automatically or through an admin action, and how a new member gets a copy of the state.
2. **Backups and recovery.** How the replicated state is backed up, and how to rebuild the cluster if a majority of replicas is lost for good.
3. **Local accounts.** Password hashing algorithm, sign-in throttling, and whether MFA is needed before OIDC arrives.
4. **Observability.** Access logs, metrics and health endpoints, and where they are sent.
