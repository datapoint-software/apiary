# Failure modes

What happens to Apiary when replicas, nodes or the network fail, or when the cluster is scaled. The rules behind these behaviours are in [architecture.md](architecture.md#replicated-state); the risks they leave are in [risks.md](risks.md).

## Key ideas

- **Proxying never needs a majority.** Every replica serves traffic with its last known routes and certificates, whatever happens to the rest of the cluster.
- **Writes need a majority of voters.** Route and user changes, certificate renewals and audit entries stop when most voters are unreachable, and resume when they come back.
- **Certificates renew weeks before they expire**, so a cluster that can't write for a while still has time to recover before any certificate lapses.

## Summary

| Event | Traffic | Writes | Action needed |
| --- | --- | --- | --- |
| [Scale down 3 → 2](#scaling-down-from-3-to-2) | ✅ | ✅, but no failure tolerated | Update DNS if used |
| [Scale down 3 → 1](#scaling-down-from-3-to-1) | ✅ | ✅, but no failure tolerated | Deploy in two steps |
| [Scale up](#scaling-up) | ✅ | ✅ | Approve the replica in manual mode |
| [Rolling update](#rolling-update) | ✅ | ✅, with brief pauses | None |
| [One node fails](#one-node-fails) (3 replicas) | ✅ | ✅ | Replace the node |
| [Leader fails](#the-leader-fails) | ✅ | Pause during election | None |
| [Majority of voters fails](#a-majority-of-voters-fails) | ✅ | ❌ until they return | Bring them back, restore, or force a recovery |
| [Network partition](#network-partition) | ✅, possibly stale on one side | Majority side only | Fix the network |
| [Single instance fails](#single-instance-modes) | ❌ until restarted | ❌ | None, Swarm or Docker restarts it |

## Scaling down from 3 to 2

Changing `replicas: 3` to `replicas: 2` and redeploying:

1. Swarm picks one replica and sends it a stop signal, then waits up to `stop_grace_period`.
2. The replica stops accepting new connections and lets in-flight HTTP requests finish. Open WebSocket, TCP and UDP connections on it close, and their clients reconnect to another replica.
3. If it leads, it hands leadership to another voter. It then leaves the cluster.
4. With 2 replicas the voter count becomes 1, with 1 follower (see [voter count](architecture.md#replicated-state)).
5. Traffic, admin and renewals continue on the 2 remaining replicas.

The result works, but tolerates no further failure of the voter: if it fails, writes stop until it returns. Treat 2 replicas as a temporary state.

If DNS points straight at the edge nodes, remove the stopped node's address. Its host-mode ports close with the replica, so clients that still resolve it fail until their cached record expires.

## Scaling down from 3 to 1

Swarm stops both extra replicas at the same time. Both try to leave the cluster at once, and the departures must be applied one at a time for the cluster to keep a majority throughout. Until that is designed and tested, scale down in two deploys: 3 → 2, wait for the cluster to settle, then 2 → 1.

The result is a cluster of one, with no high availability, as in a one-node Swarm.

## Scaling up

Raising `replicas:` and redeploying, with enough labelled edge nodes:

1. Swarm starts a replica on a new edge node and mounts the cluster secret.
2. The replica finds the others through Swarm DNS and proves it's genuine with the cluster CA.
3. In automatic mode it joins; in manual mode it waits until an admin approves it.
4. It receives the state, then reports healthy. Only then does Swarm count it as running.
5. If the voter count is below its target, the replica is promoted to voter.

Add the node's address to DNS once the replica is healthy.

## Rolling update

Replicas are replaced one at a time (`parallelism: 1`, `order: stop-first`). Each one leaves cleanly as in a scale-down, and Swarm only moves on once its replacement has caught up and reports healthy. If the leader is replaced, writes pause briefly during the election. If a new replica never becomes healthy, Swarm rolls the update back.

With 3 replicas, one is always missing during an update, so the cluster tolerates no other failure until the update finishes.

## One node fails

A node crashes or loses power, so its replica gets no chance to leave:

- The cluster keeps it as a voter: 3 voters, 2 alive. 2 of 3 is still a majority, so writes continue.
- Traffic that reaches the dead node fails until DNS or the load balancer stops sending it there.
- If it stays missing past the configured timeout, it's removed and a follower is promoted, if there is one. In manual mode an admin removes it.
- When the node comes back, its replica catches up from the others. A replacement node joins like a [scale-up](#scaling-up).

## The leader fails

The remaining voters elect a new leader. Writes pause during the election and resume on their own. A write that was in progress when the leader failed may or may not have been applied; how callers retry it safely is an [open decision](open-decisions.md).

## A majority of voters fails

E.g. 2 of 3 voters are down:

- The remaining replicas keep proxying with the last known routes and certificates.
- Writes stop: no route or user changes, no renewals, and no audit entries, so changes are refused rather than made unrecorded.
- When enough voters return, writes resume on their own.
- If they are lost for good, writes never resume on their own. Either restore the last backup into a new cluster, or run a [forced recovery](architecture.md#forced-recovery) on the most up-to-date survivor, which may lose its last few changes and signs everyone out. Then add replicas back as in a [scale-up](#scaling-up).

## Network partition

The network splits the replicas into two groups that can't reach each other:

- The side with a majority of voters keeps a leader and keeps writing.
- The other side keeps proxying, but doesn't see changes made meanwhile: new routes and renewed certificates only reach it once the network heals.
- A Let's Encrypt validation that reaches the minority side can fail, because it can't ask the leader for a token it doesn't have. The renewal is retried later.
- When the network heals, the minority side catches up.

## Single-instance modes

With a one-node Swarm or Docker Compose there is one replica:

- If it stops, traffic stops until Swarm or Docker restarts it.
- If the machine or its disk is lost, the state is lost too, unless a backup was exported.

## Docker Swarm itself

If the edge nodes are also Swarm managers, Swarm's own Raft follows the same majority rules. With 2 managers, losing one stops all deploys and service changes, including Apiary's, even though Apiary keeps serving traffic. Run 3 or 5 managers.
