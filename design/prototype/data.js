/* Invented data for the prototype. Times are UTC; "now" is fixed so the screens read the same every time. */
const NOW = Date.UTC(2026, 10, 2, 14, 40);
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const at = (days, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return Date.UTC(2026, 10, 2 - days, h, m); };

/* A simple logo for the sample brands: initials on a rounded square, as an SVG data URI. */
const sampleLogo = (text, bg) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="41" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${text}</text></svg>`);

function seedData() {
  return {
    /* Idea being tried: visitor pages carry the operator's brand; a project can have its own. */
    brand: { name: 'Example Cloud', logo: sampleLogo('EC', '#1D4ED8'), logoName: 'example-cloud.svg', accent: '#1D4ED8', contact: 'Questions? Write to help@example.com.', changed: [NOW - 9 * DAY, 'ana@example.com'] },
    cluster: { name: 'prod-eu-west', version: '0.4.0', removalMinutes: 15 },
    /* The largest request a route accepts unless it sets its own, in MB. A route's own `size` is MB or 'none'. */
    sizeDefault: 30,
    me: { id: 'u1', name: 'Ana Lopes', email: 'ana@example.com', role: 'Administrator', initials: 'AL' },
    projects: [
      { id: 'shop', name: 'Shop', icon: 'shopping-bag', desc: 'Storefront, checkout and their APIs.' },
      { id: 'payments', name: 'Payments API', icon: 'credit-card', desc: 'Card and SEPA payment endpoints.' },
      { id: 'internal', name: 'Internal tools', icon: 'wrench', desc: 'Grafana, MQTT and staff tools.' },
      { id: 'legacy', name: 'Legacy', icon: 'archive', desc: 'Old storefront, kept for redirects.' },
      { id: 'marketing', name: 'Marketing site', icon: 'megaphone', desc: 'Public website and blog.', brand: { name: 'Example Lda.', logo: sampleLogo('EL', '#0F766E'), logoName: 'example-lda.svg', accent: '#0F766E', contact: 'Questions about the website? Write to hello@example.pt.', changed: [NOW - 2 * DAY, 'ana@example.com'] } },
    ],
    routes: [
      { id: 'r1', host: 'shop.example.com', path: '/', project: 'shop', targets: [{ host: 'shop-v1', port: 8080, weight: 90 }, { host: 'shop-v2', port: 8080, weight: 10 }], canary: 'X-Canary: true', sticky: true, protocols: ['HTTP/2', 'HTTP/3'], status: 'ok', cert: 'auto', rpm: 1284, timeout: 30, allow: [], changed: [NOW - 12 * MIN, 'ana@example.com'],
        stack: { name: 'shop', service: 'shop_web', fields: ['host', 'path', 'targets', 'project', 'timeout'] } },
      { id: 'r2', host: 'shop.example.com', path: '/api', project: 'shop', targets: [{ host: 'shop-api', port: 8080, weight: 100 }], protocols: ['HTTP/2', 'HTTP/3'], status: 'ok', cert: 'auto', rpm: 4120, timeout: 30, rateLimit: 600, allow: [],
        stack: { name: 'shop', service: 'shop_api', fields: ['host', 'path', 'targets', 'project', 'timeout', 'rateLimit'] } },
      /* `hand` keeps who last set a field that no label sets yet, so an apply that starts setting it can say whose change it replaced. */
      { id: 'r3', host: 'checkout.example.com', path: '/', project: 'shop', targets: [{ host: 'checkout', port: 8080, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 2210, timeout: 60, allow: [],
        stack: { name: 'shop', service: 'shop_checkout', fields: ['host', 'path', 'targets', 'project'] }, hand: { timeout: ['marta@example.com', at(5, '16:40')] } },
      { id: 'r4', host: 'static.example.com', path: '/', project: 'shop', targets: [{ host: 'static', port: 80, weight: 100 }], protocols: ['HTTP/2', 'HTTP/3'], status: 'ok', cert: 'auto', rpm: 591, timeout: 30, compression: true, caching: true, allow: [] },
      { id: 'r5', host: 'api.example.com', path: '/', project: 'payments', targets: [{ host: 'payments-api', port: 8080, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 3020, timeout: 30, allow: [] },
      { id: 'r6', host: 'webhooks.example.com', path: '/', project: 'payments', targets: [{ host: 'payments-webhooks', port: 8080, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 390, timeout: 30, allow: [] },
      { id: 'r7', host: 'grafana.internal.example.com', path: '/', project: 'internal', targets: [{ host: 'grafana', port: 3000, weight: 100 }], protocols: ['HTTP/2', 'WebSockets'], status: 'ok', cert: 'uploaded', rpm: 410, timeout: 120, allow: ['10.0.0.0/8', '192.168.10.0/24'] },
      { id: 'r8', host: 'mqtt-admin.internal.example.com', path: '/', project: 'internal', targets: [{ host: 'mqtt-admin-1', port: 18083, weight: 50 }, { host: 'mqtt-admin-2', port: 18083, weight: 50 }], protocols: ['HTTP/2', 'WebSockets'], status: 'warn', statusText: '1 target down', cert: 'uploaded', rpm: 130, timeout: 60, allow: ['10.0.0.0/8'] },
      { id: 'r9', host: 'wiki.internal.example.com', path: '/', project: 'internal', targets: [{ host: 'wiki', port: 3000, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'uploaded', rpm: 100, timeout: 30, allow: ['10.0.0.0/8'], size: 100 },
      { id: 'r14', host: 'registry.example.com', path: '/', project: 'internal', targets: [{ host: 'gitlab', port: 5005, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 60, timeout: 60, allow: [] },
      { id: 'r10', host: 'legacy.example.com', path: '/', project: 'legacy', targets: [{ host: 'legacy-shop', port: 80, weight: 100 }], protocols: ['HTTP/2'], status: 'critical', statusText: 'Route down', cert: 'auto', rpm: 0, timeout: 30, allow: [] },
      { id: 'r11', host: 'www.example.com', path: '/', project: 'marketing', targets: [{ host: 'website', port: 80, weight: 100 }], protocols: ['HTTP/2', 'HTTP/3'], status: 'ok', cert: 'auto', rpm: 1650, timeout: 30, compression: true, caching: true, allow: [] },
      { id: 'r12', host: 'blog.example.com', path: '/', project: 'marketing', targets: [{ host: 'blog', port: 2368, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 380, timeout: 30, allow: [], maintenance: { start: at(0, '22:00'), end: at(-1, '00:30'), message: 'The blog is being upgraded. Back by 00:30 UTC.' } },
      { id: 'r13', host: 'preview.example.com', path: '/', project: 'marketing', targets: [{ host: 'website-next', port: 80, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 12, timeout: 30, allow: [], changed: [NOW - 2 * DAY, 'ana@example.com'],
        /* The prototype keeps the password to check it on the visitor page; Apiary keeps only a hash. */
        gate: { password: 'harbor-maple-lantern-58', set: NOW - 2 * DAY, by: 'ana@example.com', message: 'Preview of the new website for Example Lda.', days: 7, link: { key: 'q3Lx8VbN2pT7wRfK9mZs4A', made: NOW - 2 * DAY } } },
    ],
    streams: [
      { id: 's1', name: 'MQTT', proto: 'TCP', listen: 1883, target: 'mqtt', port: 1883, project: 'internal', status: 'ok', conns: 412, stack: { name: 'mqtt', service: 'mqtt_broker', fields: ['listen', 'target', 'port', 'proto'] } },
      { id: 's2', name: 'MQTT over TLS', proto: 'TCP', listen: 8883, target: 'mqtt', port: 8883, project: 'internal', status: 'ok', conns: 95, stack: { name: 'mqtt', service: 'mqtt_broker', fields: ['listen', 'target', 'port', 'proto'] } },
      { id: 's3', name: 'Postgres (read replica)', proto: 'TCP', listen: 5433, target: 'pg-replica', port: 5432, project: 'payments', status: 'ok', conns: 18 },
      { id: 's4', name: 'Syslog', proto: 'UDP', listen: 514, target: 'vector', port: 514, project: 'internal', status: 'warn', statusText: 'No traffic for 2 h', conns: 0 },
    ],
    certs: [
      { host: 'shop.example.com', source: 'auto', issuer: "Let's Encrypt R11", issued: at(29, '03:12'), expires: at(-61, '03:12'), status: 'ok' },
      { host: 'checkout.example.com', source: 'auto', issuer: "Let's Encrypt R11", issued: at(45, '03:40'), expires: at(-45, '03:40'), status: 'ok' },
      { host: 'static.example.com', source: 'auto', issuer: "Let's Encrypt R10", issued: at(12, '04:02'), expires: at(-78, '04:02'), status: 'ok' },
      { host: 'api.example.com', source: 'auto', issuer: "Let's Encrypt R11", issued: at(0, '11:20'), expires: at(-90, '11:20'), status: 'ok', note: 'Renewed today' },
      { host: 'webhooks.example.com', source: 'auto', issuer: "Let's Encrypt R10", issued: at(60, '02:55'), expires: at(-30, '02:55'), status: 'ok', note: 'Renews in the next 24 h' },
      { host: '*.internal.example.com', source: 'uploaded', issuer: 'Example Internal CA', issued: at(164, '09:00'), expires: at(-201, '09:00'), status: 'ok', by: 'ana@example.com' },
      { host: 'legacy.example.com', source: 'auto', issuer: "Let's Encrypt R10", issued: at(81, '05:10'), expires: at(-9, '05:10'), status: 'warn', note: 'Renewal failed' },
      { host: 'www.example.com', source: 'auto', issuer: "Let's Encrypt R11", issued: at(20, '06:31'), expires: at(-70, '06:31'), status: 'ok' },
      { host: 'registry.example.com', source: 'auto', issuer: "Let's Encrypt R10", issued: at(35, '03:12'), expires: at(-55, '03:12'), status: 'ok' },
      { host: 'blog.example.com', source: 'auto', issuer: "Let's Encrypt R11", issued: at(20, '06:33'), expires: at(-70, '06:33'), status: 'ok' },
    ],
    redirects: [
      { from: 'www.shop.example.com', to: 'https://shop.example.com', code: 308, keepPath: true, project: 'shop', stack: { name: 'shop', service: 'shop_web', fields: ['from', 'to', 'code', 'keepPath'] } },
    ],
    /* Stacks whose routes come from labels in their stack file, applied by a pipeline. A plan's change can end with who set the old value. */
    stacks: [
      { name: 'shop', project: 'shop', created: at(20, '10:05'), createdBy: 'ana@example.com', applied: at(0, '13:58'), token: 'gitlab-shop-deploy', commit: '4e1c9a2', pipeline: 'https://gitlab.example.com/shop/shop/-/pipelines/18234',
        plan: { added: [['Redirect', 'www.shop.example.com']], changed: [['Route', 'shop.example.com/api', 'Rate limit', '300 a minute', '600 a minute', ['rui@example.com', at(3, '10:20')]], ['Route', 'checkout.example.com', 'Target', 'checkout:8000', 'checkout:8080']], removed: [['Route', 'shop.example.com/beta']] } },
      { name: 'mqtt', project: 'internal', created: at(41, '16:30'), createdBy: 'ana@example.com', applied: at(6, '09:12'), token: 'gitlab-infra-deploy', commit: 'b07d3f1', pipeline: 'https://gitlab.example.com/infra/mqtt/-/pipelines/9921',
        plan: { added: [], changed: [], removed: [] } },
    ],
    pipelineTokens: [
      { id: 'pt1', name: 'gitlab-shop-deploy', stack: 'shop', created: at(20, '10:05'), by: 'ana@example.com', expires: at(-70, '10:05'), last: at(0, '13:58') },
      { id: 'pt2', name: 'gitlab-infra-deploy', stack: 'mqtt', created: at(41, '16:30'), by: 'ana@example.com', expires: at(-49, '16:30'), last: at(6, '09:12') },
      { id: 'pt3', name: 'jenkins-mqtt-old', stack: 'mqtt', created: at(78, '11:00'), by: 'rui@example.com', expires: at(-12, '11:00'), last: at(48, '02:15') },
    ],
    replicas: [
      { id: 'a91c03d2', name: 'edge-1', node: 'swarm-node-1', role: 'voter', index: 184223, lag: 0, version: '0.4.0', seen: NOW - 1000 },
      { id: 'a3f9c41e', name: 'edge-2', node: 'swarm-node-2', role: 'leader', index: 184223, lag: 0, version: '0.4.0', seen: NOW },
      { id: 'b72e1190', name: 'edge-3', node: 'swarm-node-3', role: 'voter', index: 184221, lag: 2, version: '0.4.0', seen: NOW - 1000 },
      { id: 'c0d4e7a8', name: 'edge-4', node: 'swarm-node-4', role: 'follower', index: 183990, lag: 233, version: '0.4.0', seen: NOW - 2000, note: 'Catching up' },
      { id: 'd5a2b913', name: 'edge-5', node: 'swarm-node-5', role: 'voter', index: 184223, lag: 0, version: '0.4.0', seen: NOW - 1000 },
    ],
    backups: [
      { id: 'b5', at: at(12, '09:14'), size: 2.4, by: 'ana@example.com', kind: 'Manual', index: 179420 },
      { id: 'b4', at: at(30, '17:02'), size: 2.3, by: 'Before upgrade to 0.4.0', kind: 'Automatic', index: 171005 },
      { id: 'b3', at: at(44, '10:30'), size: 2.2, by: 'rui@example.com', kind: 'Manual', index: 160118 },
    ],
    rootKey: { name: 'apiary_root_key_2', created: at(84, '10:00'), rotation: { step: 1, done: 2, of: 3 } },
    users: [
      { id: 'u1', name: 'Ana Lopes', email: 'ana@example.com', role: 'Administrator', twofa: true, last: NOW - 3 * MIN, status: 'active' },
      { id: 'u2', name: 'Rui Matos', email: 'rui@example.com', role: 'Operator', twofa: true, last: NOW - 53 * MIN, status: 'active' },
      { id: 'u3', name: 'Marta Sousa', email: 'marta@example.com', role: 'Operator', twofa: true, last: NOW - 2 * HOUR, status: 'active' },
      { id: 'u4', name: 'Inês Carvalho', email: 'ines@example.com', role: 'Viewer', twofa: false, last: NOW - 6 * DAY, status: 'active' },
      { id: 'u5', name: 'Tiago Nunes', email: 'tiago@example.com', role: 'Viewer', twofa: false, last: null, status: 'invited', invited: NOW - 26 * HOUR },
    ],
    agents: [
      { id: 'g1', name: 'ops-assistant', client: 'Claude Code', user: 'marta@example.com', connected: at(14, '10:12'), last: NOW - 35 * MIN, calls: 182 },
      { id: 'g2', name: 'on-call bot', client: 'Custom MCP client', user: 'rui@example.com', connected: at(40, '16:48'), last: NOW - 3 * DAY, calls: 41 },
    ],
    sessions: [
      { id: 'se1', device: 'Safari on macOS', ip: '10.0.4.21', started: at(0, '08:02'), last: NOW, current: true },
      { id: 'se2', device: 'Firefox on Ubuntu', ip: '10.0.7.40', started: at(1, '17:15'), last: NOW - 19 * HOUR },
      { id: 'se3', device: 'Safari on iPhone', ip: '10.0.9.12', started: at(4, '21:30'), last: NOW - 2 * DAY },
    ],
    audit: [
      { at: at(0, '14:32'), actor: 'ana@example.com', via: 'UI', text: 'changed route <code>shop.example.com</code>', meta: 'Weights 100/0 → 90/10 · from 10.0.4.21' },
      { at: at(0, '14:05'), actor: 'marta@example.com', agent: 'ops-assistant', via: 'MCP', text: 'purged the cache of <code>api.example.com</code>', meta: 'From 10.0.4.88' },
      { at: at(0, '13:58'), actor: 'Pipeline gitlab-shop-deploy', via: 'API', text: 'applied stack <code>shop</code>', meta: '1 added, 2 changed, 1 removed · commit 4e1c9a2 · from 10.0.12.7' },
      { at: at(0, '13:47'), actor: 'rui@example.com', via: 'UI', denied: true, text: 'tried to delete user marta@example.com', meta: "Role Operator can't manage users · from 10.0.7.3" },
      { at: at(0, '11:20'), actor: 'System', via: 'System', text: 'renewed the certificate for <code>api.example.com</code>', meta: "Let's Encrypt · leader edge-2" },
      { at: at(0, '08:02'), actor: 'ana@example.com', via: 'UI', text: 'signed in', meta: 'Two-step sign-in · from 10.0.4.21' },
      { at: at(0, '06:00'), actor: 'System', via: 'System', denied: true, text: 'could not renew the certificate for <code>legacy.example.com</code>', meta: 'HTTP-01 challenge failed: the hostname resolves to 203.0.113.50, not to an edge node' },
      { at: at(1, '17:15'), actor: 'ana@example.com', via: 'UI', text: 'signed in', meta: 'Two-step sign-in · from 10.0.7.40' },
      { at: at(1, '16:58'), actor: 'rui@example.com', agent: 'on-call bot', via: 'MCP', text: 'read the health of <code>mqtt-admin.internal.example.com</code>', meta: 'From 10.0.7.3' },
      { at: at(1, '15:20'), actor: 'marta@example.com', via: 'UI', text: 'added stream route <code>Syslog</code>', meta: 'UDP 514 → vector:514 · from 10.0.4.88' },
      { at: at(1, '09:41'), actor: 'ana@example.com', via: 'UI', text: 'invited tiago@example.com as Viewer', meta: 'From 10.0.4.21' },
      { at: at(2, '18:03'), actor: 'System', via: 'System', text: 'added edge-5 as a voter', meta: 'Automatic membership · swarm-node-5' },
      { at: at(3, '11:12'), actor: 'rui@example.com', via: 'UI', text: 'scheduled maintenance for <code>blog.example.com</code>', meta: '2026-11-02 22:00 to 2026-11-03 00:30 UTC' },
      { at: at(5, '10:00'), actor: 'ana@example.com', via: 'UI', text: 'started a root key rotation', meta: 'apiary_root_key_2 → apiary_root_key_3' },
      { at: at(12, '09:14'), actor: 'ana@example.com', via: 'UI', text: 'backed up the cluster', meta: '2.4 MB · index 179 420' },
      { at: at(14, '10:12'), actor: 'marta@example.com', via: 'UI', text: 'connected agent <code>ops-assistant</code>', meta: 'Claude Code · same permissions as marta@example.com' },
    ],
    activity: { rpm: [30, 28, 31, 33, 29, 22, 17, 12, 9, 11, 7, 3, 8, 6], p95: [27, 31, 20, 24, 29, 33, 14, 3, 18, 22, 27, 29, 24, 31], err: [30, 31, 29, 30, 31, 29, 30, 14, 3, 25, 28, 29, 29, 30] },
  };
}

function emptyData() {
  const d = seedData();
  return Object.assign(d, { brand: null, projects: [], routes: [], streams: [], certs: [], redirects: [], stacks: [], pipelineTokens: [], backups: [], agents: [], sessions: d.sessions.slice(0, 1), audit: d.audit.slice(5, 6), users: d.users.slice(0, 1) });
}
