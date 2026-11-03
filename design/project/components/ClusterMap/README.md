# ClusterMap

The cluster map shows every replica as a hexagon, so the leader, the voters, followers and missing members read at a glance.

- The hexagon is reserved for replicas, the brand mark and empty states.
- **Leader:** `honey` fill. Exactly one, or none while an election runs.
- **Voter:** `ink` fill. **Follower:** outlined in `ink-2`. **Missing:** `critical-soft` inside a `critical` outline.
- Under each hexagon: the node name in the data face, the role, and one fact (how far behind, or when a missing member is removed).
- Order: voters by node name, then followers, then missing members.
- Each hexagon opens the member's detail (KeyValue). The map never offers actions directly.

**The consumer provides:** the members, their roles and one fact each.
