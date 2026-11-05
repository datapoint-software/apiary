# Deploying Apiary to a production Swarm

A step-by-step guide for system administrators. It sets up Apiary with high availability (3 replicas) on a Docker Swarm. For how Apiary works and why, see [architecture.md](architecture.md); for the risks you accept by running it, see [risks.md](risks.md).

Commands marked "manager" run on a Swarm manager node. Replace values in angle brackets, such as `<version>`.

## What you need

- **A Docker Swarm with at least 3 edge nodes**: the nodes that receive internet traffic and run Apiary, one replica each. They can also be the managers; keep an odd number of managers (3 or 5), since Swarm needs a majority of them to deploy anything.
- **DNS** for each site you'll route, pointing at the edge nodes' public addresses, or at a load balancer in front of them that checks their health. With plain DNS, keep the TTL short (e.g. 60 seconds), so a node you take out stops receiving traffic soon.
- **A secret store** for the root key, such as a password manager or Vault, apart from where you keep backups.
- **A network for admins**, such as a VPN or an office network, from which the admin port will be reachable. It must never be reachable from the internet.
- **An email address** for Let's Encrypt's expiry notices, if you want automatic certificates.

## 1. Open the right ports

Set these rules in a firewall outside the hosts (e.g. a cloud security group), not only on the hosts: Docker's own rules can bypass host firewalls.

| Port | Protocol | From | What for |
| --- | --- | --- | --- |
| 80 | TCP | Internet | HTTP, redirects to HTTPS, and Let's Encrypt's checks |
| 443 | TCP and UDP | Internet | HTTPS, and HTTP/3 over UDP |
| 9443 | TCP | Admin network only | The admin UI, its API and the MCP endpoint |
| 2377, 7946, 4789 | TCP, TCP and UDP, UDP | Swarm nodes only | Swarm's own traffic ([Docker's list](https://docs.docker.com/engine/swarm/swarm-tutorial/#open-protocols-and-ports-between-the-hosts)) |
| Stream route range, e.g. 10000-10099 | TCP and UDP | As each route needs | Only if you'll use TCP or UDP routes |

Apiary's Raft and cluster ports (9444 and 9445) travel over the overlay network between replicas and aren't published. Raft listens only on the replica's own overlay address, which Apiary finds through Swarm's DNS; the cluster port listens on every interface, since it opens before that address is known. `Apiary__ClusterBindAddress` puts both on one address, and makes connections to other replicas leave from it. Swarm assigns overlay addresses itself, so you'll rarely need it.

## 2. Mark the edge nodes (manager)

```bash
docker node update --label-add apiary.edge=true <node-1>
docker node update --label-add apiary.edge=true <node-2>
docker node update --label-add apiary.edge=true <node-3>
```

Apiary runs only on labeled nodes, one replica per node.

## 3. Create the root key (manager)

The root key protects everything Apiary stores, including certificates' private keys, and is the only key that can open its backups.

```bash
(umask 077 && docker run --rm datapointsoftware/apiary:<version> secrets init > apiary_root_key_1)
docker secret create apiary_root_key_1 apiary_root_key_1
```

Then:

1. Copy the content of `apiary_root_key_1` into your secret store, named after the cluster (e.g. "Apiary production root key 1").
2. Delete the file: `rm apiary_root_key_1`.

Swarm never shows a secret again. Without the copy in your secret store, losing the Swarm means losing every backup.

## 4. Write the stack file

Start from [`deploy/stack.yaml`](../deploy/stack.yaml) and set:

```yaml
services:
  apiary:
    environment:
      # Let's Encrypt's production service; the default is its staging service, whose certificates browsers don't trust
      Apiary__Acme__DirectoryUrl: https://acme-v02.api.letsencrypt.org/directory
      Apiary__Acme__Email: <ops@example.com>
      # Your admin network; this replaces the default private ranges. Keep loopback for `apiary users create-admin`
      Apiary__AdminAllowlist__0: <10.20.0.0/16>
      Apiary__AdminAllowlist__1: 127.0.0.0/8
      Apiary__AdminAllowlist__2: ::1/128
```

Keep the rest as it is, in particular:

- the ports in `mode: host`, so Apiary sees real client addresses;
- the secret with `uid`, `gid` and `mode: 0400`, `read_only: true` and `cap_drop: [ALL]`;
- `max_replicas_per_node: 1` and the `apiary.edge` constraint.

For TCP or UDP routes, add their ports to `ports:`, one line per port and protocol in `mode: host` (e.g. `- { target: 10000, published: 10000, protocol: tcp, mode: host }`). The Stream routes page shows the line for each route you add. Adding ports means redeploying.

By deploying with automatic certificates, you accept Let's Encrypt's [Subscriber Agreement](https://letsencrypt.org/repository/) on behalf of your organization.

## 5. Deploy (manager)

```bash
APIARY_VERSION=<version> docker stack deploy -c stack.yaml apiary
```

Check that 3 replicas are running, one per edge node:

```bash
docker service ps apiary_apiary --filter desired-state=running
```

## 6. Create the first Administrator, within 15 minutes

A new cluster lets the first person who opens the admin UI create the first Administrator, for 15 minutes after it starts. Do it straight away:

1. Find the setup address and the admin certificate's fingerprint in the logs:

   ```bash
   docker service logs apiary_apiary 2>&1 | grep -i -E "setup|fingerprint"
   ```

2. From the admin network, open `https://<edge-node>:9443`. Your browser warns about the certificate: compare its SHA-256 fingerprint with the one in the logs before you continue.
3. Create the Administrator, with a password of at least 15 characters, and set up the authenticator app.
4. Store the recovery codes in your secret store.

If the 15 minutes pass, restart the service (`docker service update --force apiary_apiary`) to reopen setup.

## 7. Finish the admin setup

In the admin UI:

1. **Admin certificate**: replace the self-signed certificate with one your browsers trust (e.g. from your organization's certificate authority).
2. **Single sign-on** (optional): connect your identity provider and map its groups to roles, so access ends when people leave. Keep one local Administrator as the way in when the identity provider is down.
3. **Users**: invite the other admins, each with the least role they need (Viewer, Operator or Administrator).

## 8. Route your first site

1. Attach the service you want to route to Apiary's network, in its own stack file:

   ```yaml
   services:
     shop:
       networks: [apiary]
   networks:
     apiary:
       external: true
       name: apiary
   ```

2. In the admin UI, add a route from the site's hostname (e.g. `shop.example.com`) to the service name and port (e.g. `shop_shop`, port 8080).
3. Point the hostname's DNS at the edge nodes. Apiary gets a certificate from Let's Encrypt within a minute or two; see it under Certificates.

### Behind a load balancer or CDN

If a load balancer, a CDN or WAF, or another reverse proxy sits in front of the edge nodes, Apiary sees its address instead of the visitors'. Add it under Cluster → Trusted proxies, so routes take the visitor's address from `X-Forwarded-For` and the scheme from `X-Forwarded-Proto`:

- Add only the addresses your proxy connects from. For a CDN, use the ranges it publishes for that (e.g. [Cloudflare's](https://www.cloudflare.com/ips/)), and update them when it changes them: the page warns about ranges that haven't sent a request for a day.
- Have the proxy reach Apiary over HTTPS, or over a private network. Apiary believes the scheme it reports.
- Check it with Try a request on the same page, then with a route's allowlist.

Swarm's ingress network sends no such header, so keep the ports in `mode: host`. The admin port never uses trusted proxies.

## 9. Back up

1. In the admin UI, export a backup (Backups) and store it encrypted, with restricted access, apart from the root key.
2. Repeat on a schedule and before risky changes. Apiary doesn't make backups by itself.

A backup can only be restored with the root key it was made with: keep each root key in your secret store for as long as you keep backups made with it.

## 10. Monitor

- **Health**: `https://<edge-node>:9443/health/ready` on each node answers 200 once the replica serves traffic, for your load balancer and monitoring; `/health/live` only says the process runs.
- **Metrics**: Prometheus can scrape `https://<edge-node>:9443/metrics` from the admin network, or set `Apiary__Telemetry__OtlpEndpoint` to send metrics and traces over OTLP.
- **Logs**: access logs are JSON lines on standard output; collect them with Docker's logging driver. They hold client IP addresses, which are personal data under the GDPR: keep them only as long as your retention policy allows.
- **Alert on**: certificates close to expiry or failing to renew, replicas missing or far behind, and failed writes.

## Day to day

- **Upgrade**: back up first, then change `APIARY_VERSION` and run the same `docker stack deploy`. Swarm replaces one replica at a time and rolls back if one fails to start. Each version reads the state of the one before it, but not always the other way round, so to go back a version after the upgrade finished, restore the backup. From `1.0.0-beta.3` or earlier, follow [Moving to the `apiary` network](#moving-to-the-apiary-network) instead.
- **Add an edge node**: label it, raise `replicas:` and deploy. It joins by itself.
- **Rotate the root key**: follow the steps on the Root key page in the admin UI, after a suspected leak or as your policy requires. Connected AI agents have to connect again afterwards.
- **Visitor pages**: set the brand on Traffic › Visitor pages. To hide the Datapoint logo and "Powered by Apiary" at the bottom of every visitor page, set `Apiary__VisitorPages__ShowPoweredBy: "false"`.
- **Locked out**: on an edge node, `docker exec <apiary container> /app/apiary users create-admin --name <name> --email <email>` creates a new Administrator.

### Moving to the `apiary` network

Up to `1.0.0-beta.3`, the stack file let Swarm name Apiary's network `apiary_apiary`. It's now named `apiary`, so app stacks don't depend on the name of Apiary's stack. Deploying the new file over an older cluster moves Apiary to the new network and away from every app still on the old one, so their sites stop answering. Move in three deploys instead:

1. In your copy of the new stack file, keep the old network for now, then deploy as usual. Each replica restarts once, on both networks.

   ```yaml
   services:
     apiary:
       networks: [apiary, previous]
   networks:
     apiary:
       name: apiary
       driver: overlay
       attachable: true
     previous:
       name: apiary_apiary
       external: true
   ```

2. In each app's stack file, change the external network's `name:` to `apiary` and deploy it. Each app moves when its own stack is deployed, and keeps answering throughout.
3. Remove `previous` from Apiary's stack file, deploy again, and delete the old network with `docker network rm apiary_apiary`. Docker refuses while anything is still attached, so a refusal names a stack you missed in step 2: `docker network inspect apiary_apiary` lists what's attached.

## Checklist

- [ ] Port 9443 is reachable only from the admin network, checked from outside it.
- [ ] The root key is in the secret store, and the file is deleted.
- [ ] `Apiary__Acme__DirectoryUrl` points at Let's Encrypt's production service.
- [ ] The admin allowlist names only your admin network and loopback.
- [ ] Trusted proxies, if any, list only your own proxies' addresses or the ranges your CDN publishes.
- [ ] The first Administrator has two-step sign-in and stored recovery codes.
- [ ] The admin certificate is trusted by your browsers.
- [ ] A first backup is exported and stored apart from the root key.
- [ ] Monitoring checks `/health/ready` and alerts on certificates and replicas.
