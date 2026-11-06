/* Stream routes, certificates and redirects. */
const RESERVED_PORTS = [80, 443, 8443];
const STREAM_EXTRAS = { s2: { serverNames: ['mqtt.example.com'] }, s3: { allow: ['10.0.0.0/8'] }, s4: { lastAt: NOW - 2 * HOUR - 10 * MIN } };
const streamList = () => {
  D.streams.forEach(s => { if (!s.allow) Object.assign(s, { serverNames: [], allow: [], idle: 60, disabled: false, lastAt: s.conns ? NOW : null }, STREAM_EXTRAS[s.id]); });
  return D.streams;
};
const streamSince = ts => { const m = Math.floor((NOW - ts) / MIN); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : Math.floor(m / 1440) === 1 ? 'yesterday' : `${Math.floor(m / 1440)} days ago`; };
function streamActivity(s) {
  if (s.disabled) return ['off', 'Disabled'];
  if (s.conns > 0) return ['ok', 'Active'];
  if (!s.lastAt) return ['info', 'No connections yet'];
  if (NOW - s.lastAt < HOUR) return ['ok', 'Active'];
  return ['warn', `Last connection ${streamSince(s.lastAt)}`];
}
const streamLines = (v, lower = true) => String(v || '').split('\n').map(l => (lower ? l.trim().toLowerCase() : l.trim())).filter(Boolean);
const trafficProject = id => (projectOf(id) || {}).name || '';

route('/streams', () => {
  const list = streamList();
  const add = `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add stream route</button>`;
  return {
    title: 'Stream routes',
    html: `${pageHead({ title: 'Stream routes', sub: 'TCP and UDP traffic, such as MQTT or databases, forwarded as it is. Apiary doesn’t read or change it.', actions: list.length ? add : '' })}
${banner('info', 'Each stream route needs its port published', 'Swarm only sends traffic to ports your stack file publishes. After adding a stream route, add its port to the Apiary service and deploy the stack again.')}
<section class="ap-panel">${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Stream routes</caption><thead><tr><th scope="col">Name</th><th scope="col">Listens on</th><th scope="col">Target</th><th scope="col">Project</th><th scope="col">Status</th><th scope="col" class="ap-num">Connections</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map(s => { const [tone, text] = streamActivity(s); return `<tr><td><div class="ap-cell-main"><strong style="font-weight:500">${esc(s.name)}</strong>${s.serverNames.length ? `<span class="ap-caption ap-data">${esc(s.serverNames.join(', '))}</span>` : ''}${s.stack ? stackTag(s.stack.name) : ''}</div></td><td><span class="ap-data">${s.listen}</span> <span class="ap-tag">${s.proto}</span></td><td class="ap-data ap-muted">${esc(s.target)}:${s.port}</td><td class="ap-muted">${esc(trafficProject(s.project))}</td><td>${status(tone, text)}${s.allow.length ? '<span class="ap-caption" style="display:block">Allowlist</span>' : ''}</td><td class="ap-num">${num(s.conns)}</td><td class="ap-col-actions"><div class="ap-row" style="gap:4px;justify-content:flex-end">
<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Edit ${esc(s.name)}" data-edit="${s.id}" data-write>${icon('pencil')}</button>
${s.disabled ? `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Enable ${esc(s.name)}" data-enable="${s.id}" data-write>${icon('play')}</button>` : `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Disable ${esc(s.name)}" data-disable="${s.id}" data-write>${icon('power')}</button>`}
${s.stack ? '' : `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete ${esc(s.name)}" data-del="${s.id}" data-write>${icon('trash-2')}</button>`}</div></td></tr>`; }).join('')}
</tbody></table></div>` : emptyState('No stream routes', 'Forward TCP or UDP traffic, such as MQTT on port 1883, to a service on the shared network.', add)}</section>`,
    mount(el) {
      const find = id => D.streams.find(x => x.id === id);
      $$('[data-add]', el).forEach(b => b.addEventListener('click', () => streamDialog()));
      $$('[data-edit]', el).forEach(b => b.addEventListener('click', () => streamDialog(find(b.dataset.edit))));
      $$('[data-enable]', el).forEach(b => b.addEventListener('click', () => enableStream(find(b.dataset.enable))));
      $$('[data-disable]', el).forEach(b => b.addEventListener('click', () => {
        const s = find(b.dataset.disable);
        confirmDialog({ title: `Disable ${esc(s.name)}?`, text: `Every replica stops listening on port ${s.listen}/${s.proto} and closes open connections until you enable it again. Its settings are kept.`, confirm: 'Disable stream route', busy: 'Disabling…', onConfirm: async () => { await api(); Object.assign(s, { disabled: true, conns: 0 }); refresh(); toast(`${s.name} disabled.`, { action: 'Undo', onAction: () => enableStream(s) }); } });
      }));
      $$('[data-del]', el).forEach(b => b.addEventListener('click', () => {
        const s = find(b.dataset.del);
        confirmDialog({ title: `Delete ${esc(s.name)}?`, text: `Connections to port ${s.listen}/${s.proto} are refused at once, and open ones are closed. Remove the port from your stack file afterwards.`, confirm: 'Delete stream route', busy: 'Deleting…', onConfirm: async () => { await api(); D.streams.splice(D.streams.indexOf(s), 1); refresh(); toast(`${s.name} was deleted.`); } });
      }));
    },
  };
});
async function enableStream(s) {
  try {
    await api();
    s.disabled = false;
    refresh();
    toast(`${s.name} enabled. Traffic flows again.`);
  } catch (err) { toast(err.detail, { tone: 'error', title: err.title }); }
}

const SERVER_NAME = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
function streamDialog(s) {
  const editing = !!s;
  const proto = s ? s.proto : 'TCP';
  const d = dialog({
    title: editing ? 'Edit stream route' : 'Add stream route', size: 'lg', backdrop: false,
    body: `<form class="ap-form" id="st-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: s ? s.name : '', placeholder: 'MQTT', attrs: 'autocomplete="off"' })}
<fieldset class="ap-field" data-field="proto" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Protocol</legend><div class="ap-row" style="gap:20px">${['TCP', 'UDP'].map(p => `<label class="ap-choice"><input class="ap-radio" type="radio" name="proto" value="${p}"${proto === p ? ' checked' : ''}>${p}</label>`).join('')}</div><span class="ap-error" id="e-proto" hidden></span></fieldset>
<div class="ap-grid-2">${field({ name: 'listen', label: 'Listens on port', value: s ? s.listen : '', data: true, attrs: 'inputmode="numeric"', help: 'On every replica.' })}${field({ name: 'project', label: 'Project', help: 'Only for grouping.', control: select('project', D.projects.map(p => [p.id, p.name]), s ? s.project : (D.projects[0] || {}).id) })}</div>
<div class="ap-target-row" style="grid-template-columns:minmax(0,2fr) minmax(84px,1fr)">${field({ name: 'target', label: 'Target', value: s ? s.target : '', data: true, placeholder: 'mqtt', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}${field({ name: 'port', label: 'Port', value: s ? s.port : '', data: true, attrs: 'inputmode="numeric"' })}</div>
<div data-tcp${proto === 'TCP' ? '' : ' hidden'}>${field({ name: 'serverNames', label: 'TLS server names', optional: true, control: textarea('serverNames', s ? s.serverNames.join('\n') : '', 'rows="2" spellcheck="false"'), help: 'One per line, such as mqtt.example.com or *.example.com. Apiary reads the name from the TLS handshake without decrypting, so several TLS services can share a port. Leave it empty to take every connection on the port.' })}</div>
<div data-udp style="max-width:220px"${proto === 'UDP' ? '' : ' hidden'}>${field({ name: 'idle', label: 'Idle timeout', value: s ? s.idle : 60, data: true, attrs: 'inputmode="numeric"', after: 'seconds', help: 'A client’s session ends after this long without traffic.' })}</div>
${field({ name: 'allow', label: 'Allowed addresses', optional: true, control: textarea('allow', s ? s.allow.join('\n') : '', 'rows="3" placeholder="10.0.0.0/8" spellcheck="false"'), help: 'One address or range per line, IPv4 or IPv6. Leave empty to allow everyone; connections from anywhere else are closed. Needs the port published in host mode.' })}
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="st-form" data-busy="${editing ? 'Saving…' : 'Adding…'}" data-write>${editing ? 'Save' : 'Add stream route'}</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#st-form', d.el);
  if (s && s.stack) {
    $('[data-summary]', f).insertAdjacentHTML('afterend', fromStackBanner(s.stack.name, s.stack.service, '. You can still disable it from the list.'));
    lockFields(f, s.stack.fields, s.stack.name);
  }
  f.addEventListener('change', e => {
    if (e.target.name !== 'proto') return;
    $('[data-tcp]', f).hidden = e.target.value !== 'TCP';
    $('[data-udp]', f).hidden = e.target.value !== 'UDP';
  });
  form(f, {
    name: v => (!String(v).trim() ? 'Enter a name, such as MQTT.' : String(v).trim().length > 40 ? 'Use at most 40 characters.' : null),
    listen: (v, all) => {
      const m = V.port(v);
      if (m) return m;
      if (RESERVED_PORTS.includes(+v)) return 'Apiary uses this port itself. Choose another.';
      const names = all.proto === 'TCP' ? streamLines(all.serverNames) : [];
      const clash = streamList().find(x => x !== s && x.listen === +v && x.proto === all.proto && (all.proto === 'UDP' || !names.length || !x.serverNames.length || x.serverNames.some(n => names.includes(n))));
      return clash ? 'Another stream route already uses this port and protocol. Choose another port, or give both TCP routes different TLS server names.' : null;
    },
    project: v => (!v ? 'Choose a project.' : null),
    target: V.target,
    port: v => V.port(v),
    serverNames: (v, all) => {
      if (all.proto !== 'TCP') return null;
      const names = streamLines(v);
      if (!names.every(n => SERVER_NAME.test(n))) return 'Enter a hostname, such as shop.example.com.';
      return names.length > 20 ? 'A stream route takes up to 20 server names.' : null;
    },
    idle: (v, all) => (all.proto !== 'UDP' ? null : !/^\d+$/.test(String(v).trim()) || +v < 1 || +v > 3600 ? 'Enter a number from 1 to 3600.' : null),
    allow: v => {
      const ls = streamLines(v, false);
      if (ls.some(l => !V.cidr(l))) return 'Enter an IPv4 or IPv6 address or range, such as 10.0.0.0/8.';
      return ls.length > 100 ? 'Use 100 addresses or ranges at most. Combine neighbors into a wider range.' : null;
    },
  }, {
    verb: editing ? 'save it' : 'add it',
    links: { proto: ['listen'], serverNames: ['listen'] },
    submit: async v => {
      await api();
      const next = { name: v.name.trim(), proto: v.proto, listen: +v.listen, target: v.target.trim(), port: +v.port, project: v.project, serverNames: v.proto === 'TCP' ? streamLines(v.serverNames) : [], idle: v.proto === 'UDP' ? +v.idle : 60, allow: streamLines(v.allow, false) };
      const portChanged = !editing || s.listen !== next.listen || s.proto !== next.proto;
      if (editing) Object.assign(s, next);
      else D.streams.push(Object.assign({ id: 's' + Date.now().toString(36), status: 'ok', conns: 0, disabled: false, lastAt: null }, next));
      refresh();
      if (!portChanged) { d.close(); return toast(`${next.name} saved.`); }
      /* A second step in the same dialog: what to do next */
      $('.ap-dialog-head', d.el).innerHTML = `<h2 class="ap-h ap-h-2" id="${d.box.getAttribute('aria-labelledby')}">Publish port ${next.listen}</h2>`;
      d.body(`<p style="margin:0">${esc(next.name)} is ready on every replica. To send it traffic, publish the port on the Apiary service in your stack file, then deploy the stack again.</p>
<div class="ap-copy"><code>- { target: ${next.listen}, published: ${next.listen}, protocol: ${next.proto.toLowerCase()}, mode: host }</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>
<span class="ap-help">Under <span class="ap-code">services.apiary.ports</span>. Host mode keeps each client’s address.</span>`);
      d.foot('<button class="ap-btn ap-btn-primary" type="button" data-done>Done</button>');
      const done = $('[data-done]', d.el);
      done.addEventListener('click', () => { d.close(); toast(editing ? `${next.name} saved.` : `${next.name} is ready on every replica.`); });
      done.focus();
    },
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const code = b.parentElement.querySelector('code'), label = b.querySelector('span');
  const done = () => { label.textContent = 'Copied'; setTimeout(() => { label.textContent = 'Copy'; }, 2000); };
  try { navigator.clipboard.writeText(code.textContent).then(done, () => getSelection().selectAllChildren(code)); } catch (err) { getSelection().selectAllChildren(code); }
});

/* Certificates: ok, pending, failing, expiring or expired, as the server decides */
const CERT_MESSAGES = {
  'acme.challengeFailed': 'Let’s Encrypt couldn’t fetch the check file from this hostname on port 80. Point its DNS at your edge nodes, and let port 80 through.',
  'certificate.keyMismatch': 'This private key doesn’t match the certificate. Check that both come from the same request.',
  'dns.unauthorized': 'The DNS provider refused Apiary’s credentials. Check that they haven’t expired or been revoked, and save new ones on the provider.',
  'dns.zoneNotFound': 'The DNS provider has no zone for this hostname. Check the provider’s domains, or the CNAME that delegates it.',
  'dns.notPropagated': 'The TXT record was written, but the zone’s name servers didn’t show it within 2 minutes. Apiary didn’t ask Let’s Encrypt to check it, so no attempt was used.',
  'dns.unreachable': 'Apiary couldn’t reach the DNS provider. It tries again in 5 minutes; Let’s Encrypt wasn’t asked to check anything.',
  'dns.cnameMissing': 'The CNAME that delegates this hostname’s challenge is missing. Create it, then renew.',
};
// An automatic certificate covers the names it was requested for; an uploaded wildcard usually covers its bare domain too.
const certHosts = c => c.hosts || (c.source === 'uploaded' && c.host.startsWith('*.') ? [c.host, c.host.slice(2)] : [c.host]);
const certIsWildcard = c => c.source === 'auto' && certHosts(c).some(n => n.startsWith('*.'));
// How Let's Encrypt checks an automatic certificate: 'http-01', or the id of the DNS provider that writes its TXT record.
const certChallenge = c => (c.source === 'auto' ? c.challenge || 'http-01' : null);
const certChallengeText = c => {
  const ch = certChallenge(c);
  return !ch ? '–' : ch === 'http-01' ? 'HTTP-01' : `DNS-01 · ${esc((dnsProvider(ch) || { name: 'deleted provider' }).name)}`;
};
const certFailing = c => c.source === 'auto' && c.note === 'Renewal failed';
function certStatus(c) {
  if (!c.expires) return certFailing(c) ? 'failing' : 'pending';
  if (c.expires <= NOW) return 'expired';
  if (certFailing(c)) return 'failing';
  if (c.expires - NOW < (c.source === 'uploaded' ? 30 : 14) * DAY) return 'expiring';
  return 'ok';
}
const certDays = c => (c.expires ? Math.max(0, Math.round((c.expires - NOW) / DAY)) : 0);
const certStatusTone = c => (certStatus(c) === 'failing' && !c.expires ? 'critical' : { ok: 'ok', pending: 'info', failing: 'warn', expiring: 'warn', expired: 'critical' }[certStatus(c)]);
function certStatusText(c) {
  const left = certDays(c) === 1 ? '1 day left' : `${certDays(c)} days left`;
  return { pending: 'Requesting from Let’s Encrypt', failing: c.expires ? `Renewal failing, ${left}` : 'Not issued yet', expiring: `Expires soon, ${left}`, expired: 'Expired' }[certStatus(c)] || left;
}
const certSource = c => (c.source === 'auto' ? 'Automatic' : 'Uploaded');
const certAttention = c => !['ok', 'pending'].includes(certStatus(c));
const certFailure = c => (certFailing(c) ? (c.failure ??= { code: 'acme.challengeFailed', detail: 'Fetching http://legacy.example.com/.well-known/acme-challenge/kE3x9QvYb2: Timeout during connect (likely firewall problem)', next: at(0, '18:00') }) : null);
function certEvents(c) {
  if (c.events) return c.events;
  const f = certFailure(c);
  if (c.source === 'uploaded') return (c.events = [{ at: c.issued, kind: 'uploaded', by: c.by || 'ana@example.com' }]);
  return (c.events = [...(f ? [{ at: NOW - 40 * MIN, kind: 'failed', code: f.code, detail: f.detail }, { at: NOW - 6 * HOUR - 40 * MIN, kind: 'failed', code: f.code, detail: f.detail }] : []), { at: c.issued, kind: c.note === 'Renewed today' ? 'renewed' : 'issued' }]);
}
// A route uses its own automatic certificate, or names another one: an uploaded one, or a wildcard Apiary renews.
const certRoutes = c => D.routes.filter(r => (r.cert === 'uploaded' ? (r.certId ? r.certId === c.host : c.source === 'uploaded' && certCovers(c.host, r.host)) : c.source === 'auto' && !certIsWildcard(c) && r.host === c.host));

route('/certificates', () => {
  const sorted = [...D.certs].sort((a, b) => (a.expires || Infinity) - (b.expires || Infinity));
  const admin = D.me.role === 'Administrator', ops = canOperate();
  const heading = c => ({ expired: `The certificate for ${esc(c.host)} expired`, expiring: `The certificate for ${esc(c.host)} expires in ${certDays(c)} days` }[certStatus(c)] || `Apiary can’t get a certificate for ${esc(c.host)}`);
  const request = ops ? `<button class="ap-btn ap-btn-primary" type="button" data-request data-write>${icon('plus')}Request certificate</button>` : '';
  const upload = ops ? `<button class="ap-btn" type="button" data-upload data-write>${icon('upload')}Upload certificate</button>` : '';
  const failing = failingProviders();
  return {
    title: 'Certificates',
    html: `${pageHead({ title: 'Certificates', sub: 'Automatic certificates come from Let’s Encrypt and renew when a third of their lifetime is left. Each is checked with a file on port 80 (HTTP-01) or a DNS record (DNS-01), which also gets wildcards and internal hostnames. Upload your own for internal CAs. Using automatic certificates means accepting Let’s Encrypt’s <a href="https://letsencrypt.org/repository/">Subscriber Agreement</a>, which Apiary accepts for you.', actions: `<a class="ap-btn" href="#/dns-providers">${icon('globe')}DNS providers</a>${upload}${request}` })}
${failing.length ? banner('critical', failing.length === 1 ? `${esc(failing[0].name)} is failing` : `${failing.length} DNS providers are failing`, 'Certificates checked through it can’t renew.', '<a href="#/dns-providers">See DNS providers</a>') : ''}
${sorted.filter(certAttention).map(c => banner(certStatus(c) === 'expired' ? 'critical' : 'warn', heading(c), certStatus(c) === 'failing' ? esc(CERT_MESSAGES[certFailure(c).code]) : c.source === 'uploaded' ? 'Upload a new one before it expires. Apiary doesn’t renew uploaded certificates.' : '', `<a href="#/certificates/${encodeURIComponent(c.host)}">See details</a>`)).join('')}
<section class="ap-panel">${D.certs.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Certificates, soonest to expire first</caption><thead><tr><th scope="col">Hostname</th><th scope="col">Source</th><th scope="col">Checked with</th><th scope="col">Issuer</th><th scope="col" aria-sort="ascending">Expires</th><th scope="col">Status</th><th scope="col" class="ap-num">Routes</th></tr></thead><tbody>
${sorted.map(c => `<tr><td><div class="ap-cell-main"><a class="ap-data" href="#/certificates/${encodeURIComponent(c.host)}">${esc(c.host)}</a>${certHosts(c).length > 1 ? `<span class="ap-caption">and ${esc(certHosts(c).slice(1).join(', '))}</span>` : ''}</div></td><td class="ap-muted">${certSource(c)}</td><td class="ap-muted">${certChallengeText(c)}</td><td class="ap-muted">${esc(c.issuer || '–')}</td><td><span class="ap-data">${c.expires ? fmtDate(c.expires, false) : '–'}</span></td><td>${status(certStatusTone(c), certStatusText(c))}</td><td class="ap-num">${certRoutes(c).length || (c.ahead ? '<span class="ap-caption">Ready ahead</span>' : 0)}</td></tr>`).join('')}
</tbody></table></div>` : emptyState('No certificates yet', 'Add a route and Apiary gets its certificate for you. Request one with a DNS record for a wildcard or an internal hostname.', request)}</section>
${admin ? `<div style="margin-top:var(--space-5)">${adminCertPanel()}</div>` : ''}`,
    mount(el) {
      $$('[data-upload]', el).forEach(b => b.addEventListener('click', () => uploadDialog()));
      $$('[data-request]', el).forEach(b => b.addEventListener('click', () => requestDialog()));
      if (admin) mountAdminCert(el);
    },
  };
});

/* Admin interface certificate, for Administrators only */
const adminCert = () => (D.adminCert ??= { selfSigned: true, hosts: ['localhost', '127.0.0.1', '::1'], issuer: 'Apiary admin interface', expires: at(-702, '09:15'), fingerprint: '3F:9A:C1:07:5E:B2:48:D6:91:0C:7A:E4:2B:F8:63:15:D0:A9:4E:77:C3:1B:86:5F:E2:09:BD:44:7A:C6:12:9E' });
function adminCertPanel() {
  const a = adminCert();
  return `<section class="ap-panel" aria-labelledby="ac-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="ac-t">Admin interface</h2><p class="ap-panel-desc">The certificate for this interface, on the admin port of every replica. Only Administrators see it.</p></div>
<div class="ap-row" style="gap:8px">${a.selfSigned ? '' : `<button class="ap-btn ap-btn-sm" type="button" data-ac-reset data-write>${icon('rotate-ccw')}Use a self-signed one</button>`}<button class="ap-btn ap-btn-sm" type="button" data-ac-upload data-write>${icon('upload')}Upload certificate</button></div></div>
<div class="ap-panel-body"><dl class="ap-kv"><dt>Source</dt><dd>${a.selfSigned ? `${status('warn', 'Self-signed')}<span class="ap-caption" style="display:block;margin-top:4px">Browsers warn about it. Check the fingerprint before you accept it, or upload a certificate your computers trust.</span>` : status('ok', 'Uploaded')}</dd>
<dt>Covers</dt><dd class="ap-data">${esc(a.hosts.join(', '))}</dd><dt>Issuer</dt><dd>${esc(a.issuer)}</dd><dt>Valid until</dt><dd><span class="ap-data">${fmtDate(a.expires)}</span> UTC</dd><dt>SHA-256 fingerprint</dt><dd class="ap-data" style="font-size:0.75rem;overflow-wrap:anywhere">${a.fingerprint}</dd></dl></div></section>`;
}
function mountAdminCert(el) {
  $('[data-ac-upload]', el).addEventListener('click', () => uploadDialog({ admin: true, host: 'the admin interface' }));
  const reset = $('[data-ac-reset]', el);
  if (reset) reset.addEventListener('click', () => confirmDialog({
    title: 'Use a self-signed certificate?',
    text: 'Every replica switches to a new self-signed certificate. Browsers warn about it until each person checks its fingerprint and accepts it. Browsers that opened this interface by its hostname with the current certificate remember to require a trusted one (HSTS), and refuse the self-signed one for up to a year.',
    confirm: 'Use a self-signed one', busy: 'Switching…',
    onConfirm: async () => {
      await api();
      D.adminCert = null;
      Object.assign(adminCert(), { expires: NOW + 730 * DAY, fingerprint: '8C:21:5A:F0:93:DE:47:0B:6E:C8:12:A5:39:7F:B4:E0:5D:91:2C:68:F3:0A:BE:74:19:C5:83:6D:E2:4F:07:B1' });
      refresh();
      toast('Check the new fingerprint the next time your browser warns about it.', { title: 'Self-signed certificate in use' });
    },
  }));
}

route('/certificates/:host', host => {
  const c = D.certs.find(x => x.host === host);
  if (!c) return notFound();
  const rs = certRoutes(c), st = certStatus(c), f = certFailure(c), events = certEvents(c);
  const project = trafficProject(c.project || (c.source === 'auto' && rs[0] ? rs[0].project : ''));
  const ch = certChallenge(c), via = ch && ch !== 'http-01' ? dnsProvider(ch) : null;
  const renewal = c.source === 'uploaded' ? 'Manual: upload a new one before it expires' : c.expires ? `From ${fmtDate(c.expires - (c.expires - c.issued) / 3, false)}, retrying until it works` : via ? 'As soon as the DNS record is in place' : 'As soon as Let’s Encrypt can reach the hostname';
  const others = certIsWildcard(c) ? coveredHosts(certHosts(c)) : [];
  const names = { issued: 'Issued', renewed: 'Renewed', uploaded: 'Uploaded', replaced: 'Replaced', failed: 'Failed' };
  const meta = e => [e.code ? CERT_MESSAGES[e.code] : '', e.detail || '', e.by ? 'By ' + e.by : ''].filter(Boolean).join(' · ');
  return {
    title: c.host,
    html: `${pageHead({ crumbs: [['Certificates', '#/certificates']], title: c.host, sub: status(certStatusTone(c), certStatusText(c)) + ` &nbsp;·&nbsp; ${certSource(c)}`, actions: c.source === 'auto' ? `<button class="ap-btn ap-btn-primary" type="button" data-renew data-write>${icon('refresh-cw')}Renew now</button>` : `<button class="ap-btn" type="button" data-replace data-write>${icon('upload')}Replace…</button>` })}
${f ? banner('critical', c.expires ? 'Renewal is failing' : 'Apiary can’t get this certificate yet', `${esc(CERT_MESSAGES[f.code])}<span class="ap-code" style="display:block;margin-top:6px">${esc(f.detail)}</span><span style="display:block;margin-top:6px">Apiary tries again at ${fmtDate(f.next)} UTC. Fix the cause, then renew now.</span>`) : st === 'pending' ? banner('info', 'Requesting the certificate', via ? `Apiary writes a TXT record through ${esc(via.name)} and waits until every name server shows it, then asks Let’s Encrypt.` : 'Let’s Encrypt checks the hostname by fetching a file from it on port 80, so its DNS must point at your edge nodes. Until then, the route answers over HTTP only.') : ''}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="cd-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="cd-t">Details</h2></div><div class="ap-panel-body">
<dl class="ap-kv"><dt>Covers</dt><dd class="ap-data">${esc(certHosts(c).join(', '))}</dd>${ch ? `<dt>Checked with</dt><dd>${certChallengeText(c)}${canOperate() ? ` <button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-change-ch data-write style="margin-left:6px">Change</button>` : ''}${via && via.delegate ? `<span class="ap-caption" style="display:block">Through CNAMEs into ${esc(via.delegate)}</span>` : ''}</dd>` : ''}<dt>Issuer</dt><dd>${esc(c.issuer || '–')}</dd>${c.expires ? `<dt>Valid</dt><dd><span class="ap-data">${fmtDate(c.issued)}</span> to <span class="ap-data">${fmtDate(c.expires)}</span> UTC</dd>` : ''}<dt>Renewal</dt><dd>${renewal}</dd>${c.expires ? '<dt>Chain</dt><dd>2 certificates</dd>' : ''}${project ? `<dt>Project</dt><dd>${esc(project)}</dd>` : ''}
<dt>Used by</dt><dd>${rs.length ? rs.map(r => `<a class="ap-data" href="#/routes/${r.id}">${esc(routeLabel(r))}</a>`).join('<br>') : c.ahead ? 'No routes yet. It’s ready for when a route chooses it.' : 'No routes'}${others.length && canOperate() ? `<span class="ap-caption" style="display:block;margin-top:4px">${plural(others.length, 'other hostname')} it covers ${others.length === 1 ? 'uses its' : 'use their'} own. <button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-switch-hosts data-write>Switch them</button></span>` : ''}</dd></dl></div>
<div class="ap-panel-foot ap-row" style="justify-content:space-between"><span class="ap-caption">Private keys never leave the cluster, and are encrypted with the root key.</span><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-del data-write style="color:var(--critical)"${rs.length ? ' disabled title="Routes use it. Change their certificate first."' : ''}>Delete…</button></div></section>
<section class="ap-panel" aria-labelledby="cl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="cl-t">${c.source === 'auto' ? 'Renewal log' : 'History'}</h2></div><div class="ap-panel-body" style="padding-block:4px">
${events.length ? `<ol class="ap-timeline">${events.map(e => `<li class="ap-event${e.kind === 'failed' ? ' ap-event-denied' : ''}"><span class="ap-dot" aria-hidden="true"></span><div><div>${names[e.kind]}</div><div class="ap-event-meta">${esc(meta(e))}</div></div><time>${fmtDate(e.at)}</time></li>`).join('')}</ol>` : '<p class="ap-muted" style="margin:12px 0">Nothing yet.</p>'}</div></section></div>`,
    mount(el) {
      const renew = $('[data-renew]', el);
      if (renew) renew.addEventListener('click', async () => {
        try {
          await run(renew, 'Renewing…', () => api('write', Proto.state.network === 'slow' ? 3500 : 1800));
        } catch (err) { return toast(err.detail, { tone: 'error', title: err.title }); }
        if (f) {
          events.unshift({ at: NOW, kind: 'failed', code: f.code, detail: f.detail });
          refresh();
          return toast(`${CERT_MESSAGES[f.code]} ${f.detail}`, { tone: 'error', title: 'Renewal failed' });
        }
        Object.assign(c, { issued: NOW, expires: NOW + 90 * DAY, note: 'Renewed just now', issuer: "Let's Encrypt R11", status: 'ok' });
        events.unshift({ at: NOW, kind: 'renewed' });
        refresh();
        toast(`Valid until ${fmtDate(c.expires, false)}. Every replica uses it now.`, { title: 'Certificate renewed' });
      });
      const rep = $('[data-replace]', el);
      if (rep) rep.addEventListener('click', () => uploadDialog(c));
      const chg = $('[data-change-ch]', el);
      if (chg) chg.addEventListener('click', () => challengeDialog(c));
      const sw = $('[data-switch-hosts]', el);
      if (sw) sw.addEventListener('click', () => switchHostsDialog(c));
      $('[data-del]', el).addEventListener('click', () => confirmDialog({ title: `Delete the certificate for ${esc(c.host)}?`, text: 'No route uses it. Its private key is deleted from every replica.', confirm: 'Delete certificate', busy: 'Deleting…', onConfirm: async () => { await api(); D.certs.splice(D.certs.indexOf(c), 1); go('/certificates'); toast('Certificate deleted.'); } }));
    },
  };
});

/* DNS providers: where Apiary writes the TXT records that prove a hostname (ACME DNS-01), for wildcards, internal
   hostnames, closed port 80 and certificates before DNS cutover. Administrators add them; Operators choose one per
   certificate. Credentials are write-only: once saved, the interface never shows them again. */
const DNS_TYPES = {
  rfc2136: {
    label: 'Own DNS server (RFC 2136)', short: 'RFC 2136',
    help: 'BIND, PowerDNS, Knot or Windows DNS, updated with TSIG-signed dynamic updates. Allow the key to change only TXT records under _acme-challenge.',
    fields: [
      ['server', 'Server', 'text', 'ns1.example.com or 10.0.0.53', 'The primary server that accepts updates. Edge nodes must reach it on port 53, TCP and UDP.'],
      ['port', 'Port', 'number', '53', ''],
      ['keyName', 'TSIG key name', 'text', 'apiary-acme', ''],
      ['algorithm', 'Algorithm', 'select', '', ''],
      ['secret', 'TSIG secret', 'password', 'Base64, as tsig-keygen prints it', ''],
    ],
  },
  hetzner: {
    label: 'Hetzner DNS', short: 'Hetzner',
    help: 'An API token with read and write access, from a project in the Hetzner Cloud console. It reaches every zone in that project, so a separate challenge zone is the safer choice.',
    fields: [['token', 'API token', 'password', '', '']],
  },
  cloudflare: {
    label: 'Cloudflare', short: 'Cloudflare',
    help: 'Create an API token with the Zone › DNS › Edit permission, for these zones only.',
    fields: [['token', 'API token', 'password', '', '']],
  },
  azure: {
    label: 'Azure DNS', short: 'Azure DNS',
    help: 'A service principal with the DNS Zone Contributor role on these zones only.',
    fields: [
      ['tenant', 'Tenant ID', 'text', '00000000-0000-0000-0000-000000000000', ''],
      ['clientId', 'Client ID', 'text', '00000000-0000-0000-0000-000000000000', ''],
      ['clientSecret', 'Client secret', 'password', '', 'Client secrets expire. Apiary warns when renewals start failing, not before.'],
      ['subscription', 'Subscription ID', 'text', '00000000-0000-0000-0000-000000000000', ''],
      ['resourceGroup', 'Resource group', 'text', 'dns', ''],
    ],
  },
  route53: {
    label: 'Amazon Route 53', short: 'Route 53',
    help: 'An IAM user whose policy allows ChangeResourceRecordSets on these hosted zones only, limited to TXT records under _acme-challenge.',
    fields: [
      ['accessKey', 'Access key ID', 'text', 'AKIA…', ''],
      ['secretKey', 'Secret access key', 'password', '', ''],
    ],
  },
};
const dnsProvider = id => D.dnsProviders.find(p => p.id === id);
const dnsProviderLabel = p => (p.name === DNS_TYPES[p.type].short ? p.name : `${p.name} (${DNS_TYPES[p.type].short})`);
const bareName = n => n.replace(/^\*\./, '');
const providerCovers = (p, name) => p.domains.some(d => bareName(name) === d || bareName(name).endsWith('.' + d));
const providersFor = names => D.dnsProviders.filter(p => names.length && names.every(n => providerCovers(p, n)));
// Domains can nest (example.com at Hetzner, corp.example.com on the office server): the narrowest one is suggested.
const providerMatch = (p, names) => Math.min(...names.map(n => Math.max(...p.domains.filter(d => bareName(n) === d || bareName(n).endsWith('.' + d)).map(d => d.length))));
const bestProvider = names => providersFor(names).sort((a, b) => providerMatch(b, names) - providerMatch(a, names))[0];
const challengeName = n => '_acme-challenge.' + bareName(n);
const challengeCnames = (p, names) => (p && p.delegate ? [...new Set(names.map(bareName))].map(h => [challengeName(h), `${h}.${p.delegate}`]) : []);
const cnameTable = rows => `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">CNAME records to create</caption><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Points to</th></tr></thead><tbody>
${rows.map(([n, t]) => `<tr><td class="ap-data">${esc(n)}</td><td><span class="ap-tag">CNAME</span></td><td class="ap-data">${esc(t)}</td></tr>`).join('')}</tbody></table></div>`;
const providerTestText = p => !p.test ? status('info', 'Not tested yet')
  : p.test.ok ? `${status('ok', 'Works')}<span class="ap-caption" style="display:block">Tested ${fmtDate(p.test.at)} UTC</span>`
  : `${status('critical', 'Failing')}<span class="ap-caption" style="display:block">Since ${fmtDate(p.test.at)} UTC</span>`;
const testRecord = p => '_apiary-test.' + (p.delegate || p.domains[0]);
const failingProviders = () => D.dnsProviders.filter(p => p.test && !p.test.ok);
const nameLines = v => String(v || '').split(/[\n,]/).map(x => x.trim().toLowerCase()).filter(Boolean);

/* Routes a wildcard covers, by hostname: a certificate is chosen per hostname (SNI), so a hostname's routes switch together. */
const coveredHosts = names => Object.values(D.routes.filter(r => names.some(n => certCovers(n, r.host)) && !(r.cert === 'uploaded' && names.includes(r.certId)))
  .reduce((m, r) => ((m[r.host] ??= { host: r.host, routes: [] }).routes.push(r), m), {}));
const hostChoices = (names, intro) => {
  const hs = coveredHosts(names);
  return hs.length ? `<fieldset class="ap-field" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:4px">Hostnames it covers</legend><p class="ap-help" style="margin:0 0 8px">${intro}</p><div class="ap-stack" style="gap:8px">${hs.map(h => `<label class="ap-choice"><input class="ap-check" type="checkbox" name="sw" value="${esc(h.host)}"><span class="ap-choice-text"><span class="ap-data">${esc(h.host)}</span><span class="ap-help">${plural(h.routes.length, 'route')}, now on ${h.routes[0].cert === 'uploaded' ? `<span class="ap-data">${esc(h.routes[0].certId || 'an uploaded certificate')}</span>` : 'its own automatic certificate'}</span></span></label>`).join('')}</div></fieldset>` : '';
};
const switchHosts = (f, certHost) => {
  const hosts = $$('[name="sw"]:checked', f).map(c => c.value);
  D.routes.filter(r => hosts.includes(r.host)).forEach(r => { r.cert = 'uploaded'; r.certId = certHost; });
  return hosts;
};

/* Test: writes a TXT record, waits until every name server shows it, then removes it. It never calls Let's Encrypt. */
async function testDnsProvider(p, btn) {
  try { await run(btn, 'Testing…', () => api('write', Proto.state.network === 'slow' ? 4000 : 1600)); }
  catch (err) { return toast(err.detail, { tone: 'error', title: err.title }); }
  if (p.expired) {
    p.test = { at: NOW, ok: false, code: 'dns.unauthorized', detail: p.test.detail };
    refresh();
    return toast(CERT_MESSAGES['dns.unauthorized'], { tone: 'error', title: `${p.name} failed the test` });
  }
  p.test = { at: NOW, ok: true };
  refresh();
  toast(`Wrote a TXT record at ${testRecord(p)}, saw it on every name server, and removed it.`, { title: `${p.name} works` });
}

function deleteDnsProvider(p) {
  const using = D.certs.filter(c => certChallenge(c) === p.id);
  if (using.length) return toast(`${using.map(c => c.host).join(', ')} ${using.length === 1 ? 'is' : 'are'} checked through it. Change how ${using.length === 1 ? 'it’s' : 'they’re'} checked first.`, { tone: 'error', title: `${p.name} is in use` });
  confirmDialog({
    title: `Delete ${esc(p.name)}?`,
    text: 'Its credentials are deleted from every replica. Revoke them at the provider too: backups taken before now still contain them.',
    confirm: 'Delete provider', busy: 'Deleting…',
    onConfirm: async () => { await api(); D.dnsProviders.splice(D.dnsProviders.indexOf(p), 1); refresh(); toast('Revoke its credentials at the provider.', { title: `${p.name} deleted` }); },
  });
}

/* Add or edit a provider. Saving runs the test, so a provider that's listed has worked at least once. */
function dnsProviderDialog(p) {
  const editing = !!p;
  const src = p || { name: '', type: 'rfc2136', domains: [], delegate: '' };
  const typeFields = Object.entries(DNS_TYPES).map(([k, t]) => `<div class="ap-stack" data-type-fields="${k}" style="gap:16px"${k === src.type ? '' : ' hidden'}>
<p class="ap-help" style="margin:0">${esc(t.help)}</p>
${t.fields.map(([n, label, type, ph, help]) => {
    const name = `${k}-${n}`;
    if (type === 'select') return field({ name, label, control: select(name, ['hmac-sha256', 'hmac-sha512'], 'hmac-sha256') });
    const secret = type === 'password';
    return field({
      name, label, type: secret ? 'password' : 'text', data: !secret, value: n === 'port' ? '53' : '',
      placeholder: secret && editing ? 'Saved. Enter a new value to replace it.' : ph, optional: secret && editing,
      attrs: `autocomplete="off" spellcheck="false" autocapitalize="none"${type === 'number' ? ' inputmode="numeric"' : ''}`,
      help: secret ? (help ? help + ' ' : '') + 'Stored encrypted, and never shown again.' : help,
    });
  }).join('')}</div>`).join('');
  const d = dialog({
    title: editing ? `Edit ${esc(p.name)}` : 'Add DNS provider', backdrop: false, size: 'lg',
    body: `<form class="ap-form" id="dp-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: src.name, placeholder: 'Office DNS', attrs: 'autocomplete="off"', help: 'Shown to Operators when they choose how a certificate is checked.' })}
${field({ name: 'type', label: 'Provider', control: select('type', Object.entries(DNS_TYPES).map(([k, t]) => [k, t.label]), src.type) })}
${field({ name: 'domains', label: 'Domains it proves', control: textarea('domains', src.domains.join('\n'), 'rows="2" spellcheck="false" autocapitalize="none" placeholder="example.com"'), help: 'One per line. Covers the domain and every hostname under it, such as shop.example.com. Where another provider has a narrower domain, that one is suggested.' })}
<fieldset class="ap-field" data-field="where" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Where the challenge records go</legend><div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-radio" type="radio" name="where" value="delegate"${src.delegate || !editing ? ' checked' : ''}><span class="ap-choice-text"><span>In a separate challenge zone <span class="ap-tag">Recommended</span></span><span class="ap-help">You add a CNAME once per hostname, pointing its <span class="ap-data">_acme-challenge</span> name into a zone used only for this. If these credentials leak, they can’t touch your other records.</span></span></label>
<label class="ap-choice"><input class="ap-radio" type="radio" name="where" value="direct"${editing && !src.delegate ? ' checked' : ''}><span class="ap-choice-text"><span>In the domain’s own zone</span><span class="ap-help">No CNAMEs needed, but the credentials can usually change any record there, including mail and website records.</span></span></label></div></fieldset>
<div data-delegate>${field({ name: 'delegate', label: 'Challenge zone', value: src.delegate, data: true, placeholder: 'acme.example.net', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'A zone this provider serves, used only for challenge records.' })}<div data-cname style="margin-top:12px"></div></div>
${typeFields}
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="dp-form" data-busy="Saving and testing…" data-write>${editing ? 'Save and test' : 'Add and test'}</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#dp-form', d.el);
  const rules = () => {
    const type = f.elements.type.value;
    const r = {
      name: v => {
        const x = String(v || '').trim();
        if (!x) return 'Enter a name, such as Office DNS.';
        if (x.length > 60) return 'Use at most 60 characters.';
        return D.dnsProviders.some(o => o !== p && o.name.toLowerCase() === x.toLowerCase()) ? 'Another provider has this name. Choose another.' : null;
      },
      domains: v => {
        const list = nameLines(v);
        if (!list.length) return 'Enter at least one domain, such as example.com.';
        if (list.length > 20) return 'Enter at most 20 domains.';
        for (const dm of list) {
          const m = V.hostname(dm, { wildcard: false });
          if (m) return m === "Wildcards aren't allowed here." ? 'Enter the domain without *.: it covers every hostname under it.' : `${dm}: ${m}`;
          const other = D.dnsProviders.find(o => o !== p && o.domains.includes(dm));
          if (other) return `${other.name} already proves ${dm}. Edit that provider, or enter a narrower domain.`;
        }
        return null;
      },
      delegate: (v, all) => {
        if (all.where !== 'delegate') return null;
        if (V.hostname(v, { wildcard: false })) return 'Enter the challenge zone, such as acme.example.net.';
        return nameLines(all.domains).includes(String(v).trim().toLowerCase()) ? 'Use a zone other than the domains it proves, so the credentials can’t reach them.' : null;
      },
    };
    DNS_TYPES[type].fields.forEach(([n, label, kind]) => {
      if (kind === 'select') return;
      r[`${type}-${n}`] = v => {
        const x = String(v || '').trim();
        if (!x) return kind === 'password' && editing ? null : `Enter the ${label.charAt(0).toLowerCase() + label.slice(1)}.`;
        if (n === 'port') return V.port(x);
        return n === 'secret' && !/^[A-Za-z0-9+/]+={0,2}$/.test(x) ? 'Enter the secret in Base64, as tsig-keygen prints it.' : null;
      };
    });
    return r;
  };
  const v = form(f, rules, {
    verb: 'save it',
    links: { domains: ['delegate'], where: ['delegate'] },
    submit: async val => {
      await api('write', Proto.state.network === 'slow' ? 4000 : 1600);
      const t = DNS_TYPES[val.type];
      const next = { name: val.name.trim(), type: val.type, domains: nameLines(val.domains), delegate: val.where === 'delegate' ? val.delegate.trim().toLowerCase() : '', test: { at: NOW, ok: true } };
      const newSecret = t.fields.some(([n, , kind]) => kind === 'password' && String(val[`${val.type}-${n}`] || '').trim());
      const saved = p ? Object.assign(p, next, newSecret ? { expired: false } : {}) : Object.assign(next, { id: 'p' + Date.now().toString(36), added: NOW, by: D.me.email });
      if (!p) D.dnsProviders.push(saved);
      if (saved.expired) saved.test = { at: NOW, ok: false, code: 'dns.unauthorized', detail: p.test.detail };
      d.close();
      refresh();
      if (saved.expired) return toast(CERT_MESSAGES['dns.unauthorized'], { tone: 'error', title: `Saved, but ${saved.name} failed the test` });
      toast(`A test record at ${testRecord(saved)} showed up on every name server.${saved.delegate ? ' Certificates list the CNAMEs to create when you request them.' : ''}`, { title: editing ? 'Provider saved' : 'Provider added' });
    },
  });
  const sync = () => {
    const val = v.values();
    $$('[data-type-fields]', f).forEach(g => { g.hidden = g.dataset.typeFields !== val.type; });
    $('[data-delegate]', f).hidden = val.where !== 'delegate';
    const zone = String(val.delegate || '').trim().toLowerCase(), dm = nameLines(val.domains)[0];
    $('[data-cname]', f).innerHTML = zone && dm && !V.hostname(zone, { wildcard: false })
      ? `<p class="ap-help" style="margin:0 0 8px">For a hostname such as <span class="ap-data">shop.${esc(dm)}</span>, you’ll create:</p>${cnameTable([[challengeName('shop.' + dm), `shop.${dm}.${zone}`]])}<p class="ap-help" style="margin:8px 0 0">Apiary lists the exact records when you request a certificate.</p>` : '';
    paint();
  };
  f.addEventListener('input', sync);
  f.addEventListener('change', sync);
  sync();
}

route('/dns-providers', () => {
  const admin = isAdmin();
  const add = admin ? `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add DNS provider</button>` : '';
  const list = D.dnsProviders;
  return {
    title: 'DNS providers',
    html: `${pageHead({ crumbs: [['Certificates', '#/certificates']], title: 'DNS providers', sub: 'Where Apiary writes the TXT records that prove a hostname is yours. Needed for wildcards, internal hostnames and edge nodes without port 80. Only Administrators add or change them.', actions: list.length ? add : '' })}
${failingProviders().map(p => banner('critical', `${esc(p.name)} is failing`, `${esc(CERT_MESSAGES[p.test.code])}<span class="ap-code" style="display:block;margin-top:6px">${esc(p.test.detail)}</span>`, admin ? `<button class="ap-btn ap-btn-sm" type="button" data-edit="${list.indexOf(p)}" data-write>Save new credentials</button>` : 'Ask an Administrator to save new credentials.')).join('')}
<section class="ap-panel">${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">DNS providers</caption><thead><tr><th scope="col">Name</th><th scope="col">Provider</th><th scope="col">Domains</th><th scope="col">Records go in</th><th scope="col">Last test</th><th scope="col" class="ap-num">Certificates</th>${admin ? '<th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th>' : ''}</tr></thead><tbody>
${list.map((p, i) => `<tr><td><div class="ap-cell-main"><strong>${esc(p.name)}</strong><span class="ap-caption">Added by ${esc(p.by)}</span></div></td><td class="ap-muted">${esc(DNS_TYPES[p.type].short)}</td><td class="ap-data">${p.domains.map(esc).join('<br>')}</td>
<td>${p.delegate ? `<span class="ap-data">${esc(p.delegate)}</span> <span class="ap-caption">Delegated</span>` : '<span class="ap-muted">The domain’s own zone</span>'}</td><td>${providerTestText(p)}</td><td class="ap-num">${D.certs.filter(c => certChallenge(c) === p.id).length}</td>
${admin ? `<td class="ap-col-actions"><div class="ap-row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap"><button class="ap-btn ap-btn-sm" type="button" data-test="${i}" data-write>Test</button><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Edit ${esc(p.name)}" data-edit="${i}" data-write>${icon('pencil')}</button><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete ${esc(p.name)}" data-del="${i}" data-write>${icon('trash-2')}</button></div></td>` : ''}</tr>`).join('')}
</tbody></table></div>` : emptyState('No DNS providers yet', admin ? 'Add one to get wildcards, and certificates for hostnames Let’s Encrypt can’t reach on port 80.' : 'An Administrator adds them. Until then, certificates are checked with a file on port 80.', add)}</section>
<section class="ap-panel" aria-labelledby="dz-t" style="margin-top:var(--space-5)"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="dz-t">Why a separate challenge zone</h2></div><div class="ap-panel-body ap-stack" style="gap:10px">
<p style="margin:0">Most providers’ credentials can change every record in a zone. Anyone who gets them could redirect your website or mail. With delegation, each hostname’s <span class="ap-data">_acme-challenge</span> name is a CNAME into a zone used only for challenges, so these credentials only ever reach that zone.</p>
<p style="margin:0">It’s also how internal hostnames get certificates: Let’s Encrypt must find the record on the public internet, so a zone that only exists inside your network needs its challenge names delegated to a public one.</p></div></section>`,
    mount(el) {
      $$('[data-add]', el).forEach(b => b.addEventListener('click', () => dnsProviderDialog(null)));
      $$('[data-test]', el).forEach(b => b.addEventListener('click', () => testDnsProvider(list[+b.dataset.test], b)));
      $$('[data-edit]', el).forEach(b => b.addEventListener('click', () => dnsProviderDialog(list[+b.dataset.edit])));
      $$('[data-del]', el).forEach(b => b.addEventListener('click', () => deleteDnsProvider(list[+b.dataset.del])));
    },
  };
});

/* Request a certificate ahead of any route: wildcards, internal hostnames, or before DNS cutover. Wildcards need DNS-01. */
function requestDialog() {
  const providerOptions = names => {
    const list = providersFor(names);
    return [['', list.length ? 'Choose a provider' : 'No provider proves these names'], ...list.map(p => [p.id, dnsProviderLabel(p)])];
  };
  const d = dialog({
    title: 'Request certificate', backdrop: false, size: 'lg',
    body: `<form class="ap-form" id="rq-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'names', label: 'Hostnames', control: textarea('names', '', 'rows="2" spellcheck="false" autocapitalize="none" placeholder="*.example.com\nexample.com"'), help: 'One per line, up to 10. A wildcard such as *.example.com covers one level, a.example.com but not a.b.example.com or example.com itself, so add both.' })}
<fieldset class="ap-field" data-field="challenge" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">How Let’s Encrypt checks it’s yours</legend><div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-radio" type="radio" name="challenge" value="dns" checked><span class="ap-choice-text"><span>A DNS record (DNS-01)</span><span class="ap-help">Works for wildcards, internal hostnames, closed port 80, and before the hostname points at Apiary.</span></span></label>
<label class="ap-choice"><input class="ap-radio" type="radio" name="challenge" value="http"><span class="ap-choice-text"><span>A file on port 80 (HTTP-01)</span><span class="ap-help">Needs the hostname’s DNS to point at your edge nodes, and port 80 open. No wildcards.</span></span></label></div><span class="ap-error" id="e-challenge" hidden></span></fieldset>
<div data-dns>${field({ name: 'provider', label: 'DNS provider', control: select('provider', providerOptions([]), ''), help: isAdmin() ? 'Add providers on the <a href="#/dns-providers">DNS providers</a> page.' : 'Only Administrators can add providers.' })}<div data-records style="margin-top:12px"></div></div>
<div data-hosts></div>
${field({ name: 'project', label: 'Project', help: 'Only for grouping.', control: select('project', D.projects.map(p => [p.id, p.name]), (D.projects[0] || {}).id) })}
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rq-form" data-busy="Requesting…" data-write>Request certificate</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#rq-form', d.el);
  const v = form(f, {
    names: val => {
      const list = nameLines(val);
      if (!list.length) return 'Enter a hostname, such as *.example.com.';
      if (list.length > 10) return 'Enter at most 10 hostnames.';
      for (const n of list) {
        const m = V.hostname(n);
        if (m) return `${n}: ${m}`;
        if (n.indexOf('*') > 0 || n.split('*').length > 2) return `${n}: a wildcard can only be the first part, as in *.example.com.`;
      }
      const dup = D.certs.find(c => c.source === 'auto' && certHosts(c).join() === list.join());
      return dup ? `Apiary already has a certificate for these names. Open ${dup.host} to change how it’s checked.` : null;
    },
    challenge: (val, all) => (val === 'http' && nameLines(all.names).some(n => n.startsWith('*.')) ? 'Let’s Encrypt issues wildcards only with a DNS record. Choose DNS-01.' : null),
    provider: (val, all) => {
      const list = nameLines(all.names);
      if (all.challenge !== 'dns' || !list.length) return null;
      if (!providersFor(list).length) return isAdmin() ? 'No provider proves every one of these names. Add one, or request them separately.' : 'No provider proves every one of these names. Ask an Administrator to add one.';
      return !val ? 'Choose a DNS provider.' : null;
    },
  }, {
    verb: 'request it',
    links: { names: ['challenge', 'provider'], challenge: ['provider'] },
    submit: async val => {
      await api('write', Proto.state.network === 'slow' ? 5000 : 2400);
      const list = nameLines(val.names), p = val.challenge === 'dns' ? dnsProvider(val.provider) : null, host = list[0];
      const cert = {
        host, hosts: list.length > 1 ? list : undefined, source: 'auto', challenge: p ? p.id : 'http-01', project: val.project, issuer: "Let's Encrypt R11", issued: NOW, expires: NOW + 90 * DAY, status: 'ok', note: 'Issued just now', by: D.me.email,
        ahead: !D.routes.some(r => list.some(n => certCovers(n, r.host))),
        events: [{ at: NOW, kind: 'issued', detail: p ? `TXT record at ${challengeName(host)} seen by every name server after 8 s` : 'File on port 80 fetched from every replica asked', by: D.me.email }],
      };
      D.certs.push(cert);
      const hosts = switchHosts(f, host);
      d.close();
      refresh();
      toast(`Valid until ${fmtDate(cert.expires, false)}.${hosts.length ? ` ${plural(hosts.length, 'hostname')} use${hosts.length === 1 ? 's' : ''} it now.` : cert.ahead ? ' No route uses it yet: it’s ready when one does.' : ''}`, { title: `Got a certificate for ${host}` });
    },
  });
  let last = null;
  const sync = () => {
    const val = v.values(), list = nameLines(val.names);
    $('[data-dns]', f).hidden = val.challenge !== 'dns';
    if (list.join() !== last) {
      last = list.join();
      const sel = f.elements.provider, keep = sel.value, opts = providerOptions(list);
      sel.innerHTML = opts.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join('');
      sel.value = keep && opts.some(o => o[0] === keep) ? keep : (bestProvider(list) || {}).id || '';
      $('[data-hosts]', f).innerHTML = list.some(n => n.startsWith('*.')) ? hostChoices(list, 'Choose the ones that should use the wildcard once it’s issued. The others keep their own certificate.') : '';
    }
    const p = dnsProvider(f.elements.provider.value), rows = val.challenge === 'dns' ? challengeCnames(p, list) : [];
    $('[data-records]', f).innerHTML = rows.length ? `${banner('info', 'Create these records first', `${esc(p.name)} writes challenges in <span class="ap-data">${esc(p.delegate)}</span>. Apiary checks the CNAMEs before asking Let’s Encrypt, so a missing one doesn’t use an attempt.`)}<div style="margin-top:8px">${cnameTable(rows)}</div>` : '';
    paint();
  };
  f.addEventListener('input', sync);
  f.addEventListener('change', sync);
  sync();
}

/* Change how an automatic certificate is checked, from its next renewal */
function challengeDialog(c) {
  const names = certHosts(c), list = providersFor(names), cur = certChallenge(c);
  const d = dialog({
    title: `How ${esc(c.host)} is checked`, backdrop: false,
    body: `<form class="ap-form" id="ch-form" novalidate style="gap:16px"><fieldset class="ap-field" data-field="ch" style="border:0;margin:0;padding:0"><legend class="ap-sr">How it’s checked</legend><div class="ap-stack" style="gap:10px">
${certIsWildcard(c) ? '' : `<label class="ap-choice"><input class="ap-radio" type="radio" name="ch" value="http-01"${cur === 'http-01' ? ' checked' : ''}><span class="ap-choice-text"><span>A file on port 80 (HTTP-01)</span><span class="ap-help">Needs the hostname to point at your edge nodes, with port 80 open.</span></span></label>`}
${list.map(p => `<label class="ap-choice"><input class="ap-radio" type="radio" name="ch" value="${p.id}"${cur === p.id ? ' checked' : ''}><span class="ap-choice-text"><span>A DNS record through ${esc(p.name)}</span><span class="ap-help">${p.delegate ? `Needs the CNAME <span class="ap-data">${esc(challengeName(names[0]))}</span> → <span class="ap-data">${esc(bareName(names[0]) + '.' + p.delegate)}</span>` : 'Writes in the domain’s own zone'}</span></span></label>`).join('')}
</div><span class="ap-error" id="e-ch" hidden></span></fieldset>${list.length ? '' : `<p class="ap-help" style="margin:0">No DNS provider proves ${esc(c.host)}. ${isAdmin() ? 'Add one on the DNS providers page first.' : 'Ask an Administrator to add one.'}</p>`}
<p class="ap-help" style="margin:0">Used from the next renewal. To try it now, save, then Renew now: the certificate in use stays until a new one is issued.</p></form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="ch-form" data-busy="Saving…" data-write>Save</button>`,
  });
  applyWriteLock(d.el);
  form($('#ch-form', d.el), { ch: val => (!val ? 'Choose how it’s checked.' : null) }, {
    submit: async val => {
      await api();
      c.challenge = val.ch;
      d.close();
      refresh();
      toast(`From the next renewal, Let’s Encrypt checks it with ${val.ch === 'http-01' ? 'a file on port 80' : 'a DNS record through ' + dnsProvider(val.ch).name}.`, { title: `Changed how ${c.host} is checked` });
    },
  });
}

/* Switch more hostnames to a wildcard Apiary renews */
function switchHostsDialog(c) {
  const d = dialog({
    title: `Use ${esc(c.host)} for more hostnames`, backdrop: false,
    body: `<form class="ap-form" id="sw-form" novalidate style="gap:16px">${hostChoices(certHosts(c), 'Every route on a chosen hostname starts using the wildcard on every replica at once. Their own certificates are kept for 30 days, then deleted.')}<p class="ap-error" data-none hidden>${icon('circle-alert')}Choose at least one hostname.</p></form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="sw-form" data-write>Switch</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#sw-form', d.el);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const none = !$$('[name="sw"]:checked', f).length;
    $('[data-none]', f).hidden = !none;
    if (none) return;
    try { await run(e.submitter, 'Switching…', () => api()); } catch (err) { return toast(err.detail, { tone: 'error', title: err.title }); }
    const hosts = switchHosts(f, c.host);
    d.close();
    refresh();
    toast(`${plural(hosts.length, 'hostname')} use${hosts.length === 1 ? 's' : ''} ${c.host} now.`, { title: 'Switched' });
  });
}

/* Upload: paste PEM text, or fill it from a file; checked here, then by the server, then confirmed */
function uploadDialog(replacing) {
  const admin = replacing && replacing.admin;
  const title = replacing ? `Replace the certificate for ${esc(replacing.host)}` : 'Upload certificate';
  const drop = (name, caption, accept) => `<label class="ap-drop" style="margin-top:-8px" data-drop="${name}">${icon('file-up')}<span><strong>Choose a file</strong> or drop it here</span><span class="ap-caption">${caption}</span><input type="file" accept="${accept}"></label>`;
  const formFoot = `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="up-form" data-busy="Checking…" data-write>Continue</button>`;
  const d = dialog({
    title, size: 'lg', backdrop: false,
    body: `<form class="ap-form" id="up-form" novalidate style="gap:16px"><div data-summary></div>
${replacing ? '' : field({ name: 'project', label: 'Project', help: 'Only for grouping. Routes in any project can use it.', control: select('project', D.projects.map(p => [p.id, p.name]), (D.projects[0] || {}).id) })}
${field({ name: 'chainPem', label: 'Certificate and chain', help: 'PEM, leaf certificate first, then the intermediates. Include the root if your CA isn’t publicly trusted.', control: textarea('chainPem', '', 'rows="6" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----"') })}
${drop('chainPem', '.pem, .crt or .cer', '.pem,.crt,.cer')}
${field({ name: 'keyPem', label: 'Private key', help: 'PEM, not protected by a passphrase. It’s encrypted with the root key and never shown again.', control: textarea('keyPem', '', 'rows="4" spellcheck="false" placeholder="-----BEGIN PRIVATE KEY-----"') })}
${drop('keyPem', '.pem or .key', '.pem,.key')}
<p class="ap-caption" style="margin:0">Prototype: any text with the right BEGIN line passes. Put "mismatch" in the key to see the server reject it.</p>
</form><div data-preview hidden></div>`,
    foot: formFoot,
    initial: '#f-chainPem',
  });
  applyWriteLock(d.el);
  const f = $('#up-form', d.el), preview = $('[data-preview]', d.el);
  const fill = (name, file) => file.slice(0, 65536).text().then(t => { const ta = f.elements[name]; ta.value = t; ta.dispatchEvent(new Event('change', { bubbles: true })); });
  $$('[data-drop]', f).forEach(z => {
    const input = $('input', z), name = z.dataset.drop;
    input.addEventListener('change', () => { const file = input.files[0]; input.value = ''; if (file) fill(name, file); });
    z.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); z.dataset.over = ''; } });
    z.addEventListener('dragleave', () => { delete z.dataset.over; });
    z.addEventListener('drop', e => { delete z.dataset.over; const file = e.dataTransfer.files[0]; if (file) { e.preventDefault(); fill(name, file); } });
  });
  const host = admin ? 'apiary.internal.example.com' : replacing ? replacing.host : '*.example.net';
  const hosts = host.startsWith('*.') ? [host, host.slice(2)] : [host];
  const back = () => { preview.hidden = true; f.hidden = false; d.foot(formFoot); applyWriteLock(d.el); $('#f-chainPem', d.el).focus(); };
  form(f, {
    project: v => (!replacing && !v ? 'Choose a project.' : null),
    chainPem: v => (!String(v).trim() ? 'Paste the certificate and its chain, or choose the file.' : !v.includes('-----BEGIN CERTIFICATE-----') ? 'Paste a PEM certificate: it starts with -----BEGIN CERTIFICATE-----.' : null),
    keyPem: v => (!String(v).trim() ? 'Paste the private key, or choose the file.' : v.includes('ENCRYPTED') ? 'This key is protected by a passphrase. Remove it first, for example with openssl pkey.' : !/-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(v) ? 'Paste a PEM private key: it starts with -----BEGIN PRIVATE KEY-----.' : null),
  }, {
    verb: 'check it',
    submit: async v => {
      await api('read');
      if (/mismatch/i.test(v.keyPem)) throw { field: 'keyPem', message: CERT_MESSAGES['certificate.keyMismatch'] };
      f.hidden = true;
      preview.hidden = false;
      preview.innerHTML = `<div class="ap-stack"><div data-fail></div><p style="margin:0">Check that this is the certificate you expect.</p><dl class="ap-kv"><dt>Covers</dt><dd class="ap-data">${esc(hosts.join(', '))}</dd><dt>Issuer</dt><dd>Example Internal CA</dd><dt>Valid</dt><dd><span class="ap-data">${fmtDate(NOW)}</span> to <span class="ap-data">${fmtDate(NOW + 365 * DAY)}</span> UTC</dd><dt>Chain</dt><dd>${status('ok', 'Complete, 2 certificates')}</dd></dl></div>`;
      d.foot(`<button class="ap-btn ap-btn-ghost" type="button" data-back>Back</button><button class="ap-btn ap-btn-primary" type="button" data-add data-write>${replacing ? 'Replace certificate' : 'Add certificate'}</button>`);
      applyWriteLock(d.el);
      $('[data-back]', d.el).addEventListener('click', back);
      const add = $('[data-add]', d.el);
      add.focus();
      add.addEventListener('click', async () => {
        $('[data-fail]', preview).innerHTML = '';
        try { await run(add, 'Adding…', () => api()); }
        catch (err) { $('[data-fail]', preview).innerHTML = `<div role="alert">${banner('critical', '', esc(err.detail))}</div>`; return paint(); }
        const fresh = { issued: NOW, expires: NOW + 365 * DAY, issuer: 'Example Internal CA', status: 'ok', note: '' };
        if (admin) Object.assign(adminCert(), { selfSigned: false, hosts, issuer: fresh.issuer, expires: fresh.expires, fingerprint: '5B:E1:0D:72:A8:3C:F4:96:21:BA:6F:08:C7:53:E9:1D:84:2A:F6:30:9B:CE:47:15:D8:6E:A3:0F:72:B9:C1:58' });
        else if (replacing) Object.assign(replacing, fresh, { events: [{ at: NOW, kind: 'replaced', by: D.me.email }, ...certEvents(replacing)] });
        else if (!D.certs.some(c => c.host === host)) D.certs.push(Object.assign({ host, source: 'uploaded', project: v.project, by: D.me.email }, fresh));
        d.close();
        toast(`It covers ${hosts.join(', ')} until ${fmtDate(fresh.expires, false)}.`, { title: replacing ? 'Certificate replaced' : 'Certificate added' });
        if (!replacing) go('/certificates/' + encodeURIComponent(host)); else refresh();
      });
    },
  });
}

/* Redirects: a hostname, or a path on it, sent to another address. A redirect at a path answers that path and everything
   under it (/old and /old/page, not /older) before any route, so part of a site can move while the rest keeps reaching
   its routes. With a path, the target can be a path on the same hostname, sent as a relative Location. */
const redirectLabel = x => x.host + (x.path === '/' ? '' : x.path);
const pathUnder = (t, p) => p === '/' || t === p || t.startsWith(p + '/');
const normPath = s => { s = String(s || '').trim(); return !s || s === '/' ? '/' : s.replace(/\/+$/, ''); };
const relativeTarget = to => /^\/(?![/\\])/.test(String(to).trim());
const ACME_PATH = '/.well-known/acme-challenge';
const REDIRECT_CODES = { 301: 'Permanent', 308: 'Permanent, keeps method', 302: 'Temporary', 307: 'Temporary, keeps method' };
const redirectsSorted = () => [...D.redirects].sort((a, b) => a.host.localeCompare(b.host) || a.path.localeCompare(b.path));
const redirectFrom = x => `<span class="ap-data">${esc(x.host)}${x.path === '/' ? '' : `<span class="ap-muted">${esc(x.path)}</span>`}</span>`;
const redirectTo = x => `<span class="ap-data ap-muted">${esc(x.to)}</span>${relativeTarget(x.to) ? ' <span class="ap-caption">Same hostname</span>' : ''}`;
const redirectCode = x => `<span class="ap-tag">${x.code}</span> <span class="ap-muted">${REDIRECT_CODES[x.code]}</span>`;

function checkRedirectPath(v, all) {
  const raw = String(v || '').trim();
  const h = String(all.from || '').trim().toLowerCase();
  if (raw && !raw.startsWith('/')) return 'Start the path with /, such as /docs.';
  if (/[?#]/.test(raw)) return 'Enter the path only, without ? or #.';
  if (/\s/.test(raw)) return "Paths can't have spaces. Use %20 if the address has one.";
  const p = normPath(raw);
  if (p !== '/' && (pathUnder(p, ACME_PATH) || pathUnder(ACME_PATH, p))) return "Apiary answers certificate checks under /.well-known/acme-challenge, so it can't redirect that path.";
  const routes = D.routes.filter(r => r.host === h);
  if (p === '/' && routes.length) return 'This hostname is a route. To redirect part of it, enter a path, such as /old.';
  const hidden = routes.find(r => r.path !== '/' && pathUnder(r.path, p));
  if (p !== '/' && hidden) return `This would hide the route ${routeLabel(hidden)}, as the redirect answers first. Choose a path no route uses.`;
  if (D.redirects.some(x => x.host === h && x.path === p)) return p === '/' ? 'This hostname already redirects. Delete that redirect first to change it.' : `${h + p} already redirects. Delete that redirect first to change it.`;
  return null;
}
function checkRedirectTo(v, all) {
  const s = String(v || '').trim();
  const h = String(all.from || '').trim().toLowerCase(), p = normPath(all.path);
  const loop = 'That would send visitors back to the path they came from, in a loop. Choose a path outside it.';
  if (!s) return p === '/' ? 'Enter a full address that starts with https://, such as https://example.com.' : 'Enter a full address, such as https://example.com, or a path on this hostname, such as /new.';
  if (/^(\/\/|\\|\/\\)/.test(s)) return 'Start with one / for a path on this hostname, or with https:// for another site.';
  if (s.startsWith('/')) {
    if (p === '/') return 'A path alone works only when you redirect a path. Enter a full address, such as https://example.com.';
    return pathUnder(normPath(s.split(/[?#]/)[0]), p) ? loop : null;
  }
  let u;
  try { u = new URL(s); } catch (e) { u = null; }
  if (!u || !/^https?:$/.test(u.protocol)) return p === '/' ? 'Enter a full address that starts with https://, such as https://example.com.' : 'Enter a full address that starts with https://, or a path that starts with /.';
  if (u.hash) return "Remove the #: browsers don't send it, so Apiary can't keep it.";
  if (u.hostname === h && (p === '/' || pathUnder(normPath(u.pathname), p))) return p === '/' ? 'That would send visitors back to the same hostname, in a loop.' : loop;
  return null;
}

/* What one sample request becomes, so the effect of keeping the rest of the path shows before saving */
function redirectExample(v) {
  const h = String(v.from || '').trim().toLowerCase(), p = normPath(v.path), to = String(v.to || '').trim();
  if (!h || !to || checkRedirectTo(to, v)) return '';
  const sample = p === '/' ? '/shoes' : p + '/2026';
  const dest = v.keepPath ? `${to.replace(/\/+$/, '')}${sample.slice(p === '/' ? 0 : p.length)}?ref=mail` : to;
  return `<span class="ap-data">${esc(h + sample)}${v.keepPath ? '?ref=mail' : ''}</span> goes to <span class="ap-data">${esc(relativeTarget(to) ? h + dest : dest)}</span>${relativeTarget(to) ? ', on the same scheme the visitor used' : ''}.`;
}

function deleteRedirect(x) {
  confirmDialog({
    title: `Delete the redirect from ${esc(redirectLabel(x))}?`,
    text: x.path === '/' ? 'Requests to it get a 404 at once. Browsers may remember a permanent redirect for a while.' : `Requests to this path go to the routes of ${esc(x.host)} again, or get a 404 if there are none. Browsers may remember a permanent redirect for a while.`,
    confirm: 'Delete redirect', busy: 'Deleting…',
    onConfirm: async () => { await api(); D.redirects.splice(D.redirects.indexOf(x), 1); refresh(); toast(`The redirect from ${redirectLabel(x)} was deleted.`); },
  });
}

route('/redirects', () => {
  const list = redirectsSorted();
  const add = `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add redirect</button>`;
  return {
    title: 'Redirects',
    html: `${pageHead({ title: 'Redirects', sub: 'Send a hostname, or a path on it, to another address.', actions: list.length ? add : '' })}
<section class="ap-panel">${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Redirects</caption><thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Status code</th><th scope="col">Rest of the path</th><th scope="col">Project</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map((x, i) => `<tr><td><div class="ap-cell-main">${redirectFrom(x)}${x.stack ? stackTag(x.stack.name) : ''}</div></td><td>${redirectTo(x)}</td><td>${redirectCode(x)}</td><td class="ap-muted">${x.keepPath ? 'Kept' : 'Dropped'}</td><td class="ap-muted">${esc(trafficProject(x.project))}</td><td class="ap-col-actions">${x.stack ? '' : `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete redirect from ${esc(redirectLabel(x))}" data-del="${i}" data-write>${icon('trash-2')}</button>`}</td></tr>`).join('')}
</tbody></table></div>` : emptyState('No redirects yet', 'A redirect sends a hostname, such as <span class="ap-code">www.example.com</span>, or a path on it, such as <span class="ap-code">example.com/old</span>, to another address, with a 308 or 307.', add)}</section>`,
    mount(el) {
      $$('[data-add]', el).forEach(b => b.addEventListener('click', () => redirectDialog()));
      $$('[data-del]', el).forEach(b => b.addEventListener('click', () => deleteRedirect(list[+b.dataset.del])));
    },
  };
});

/* From a route's page (`fixed`), the hostname is set and a path is required. */
function redirectDialog(fixed) {
  const d = dialog({
    title: fixed ? 'Add path redirect' : 'Add redirect', backdrop: false,
    body: `<form class="ap-form" id="rd-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'from', label: 'From hostname', data: true, value: fixed ? fixed.host : '', placeholder: 'www.example.com', attrs: `autocomplete="off" spellcheck="false" autocapitalize="none"${fixed ? ' readonly' : ''}`, help: fixed ? '' : 'Gets an automatic certificate, so HTTPS visitors are redirected too.' })}
${field({ name: 'path', label: 'Path', optional: !fixed, data: true, placeholder: '/old', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: fixed ? 'This path and everything under it, such as /old and /old/page, but not /older.' : 'Leave empty to redirect the whole hostname. With a path, only that path and everything under it redirect, and the hostname can still have routes.' })}
${field({ name: 'to', label: 'To', data: true, placeholder: fixed ? '/new or https://example.com' : 'https://example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none" inputmode="url"', help: 'A full address, or, when you redirect a path, a path on the same hostname, such as /new.' })}
<fieldset class="ap-field" data-field="code" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Type</legend><div class="ap-stack" style="gap:10px">
${[[308, 'Permanent', 'Search engines move to the new address, and browsers remember it. Keeps POST requests as POST.'], [307, 'Temporary', 'Search engines keep the old address. Use it until you are sure.']].map(([c, t, h], i) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="code" value="${c}"${i === 0 ? ' checked' : ''}><span class="ap-choice-text"><span>${t} <span class="ap-caption">${c}</span></span><span class="ap-help">${h}</span></span></label>`).join('')}</div><span class="ap-error" id="e-code" hidden></span></fieldset>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="keepPath" checked><span class="ap-choice-text"><span>Keep the rest of the path</span><span class="ap-help">Adds what follows the redirected path, and the query, to the address.</span></span></label>
<p class="ap-help" data-example aria-live="polite" style="margin:0"></p>
${field({ name: 'project', label: 'Project', help: 'Only for grouping.', control: select('project', D.projects.map(p => [p.id, p.name]), fixed ? fixed.project : (D.projects[0] || {}).id) })}
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rd-form" data-busy="Adding…" data-write>Add redirect</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#rd-form', d.el);
  const v = form(f, {
    from: val => {
      const m = V.hostname(val, { wildcard: false });
      return m === "Wildcards aren't allowed here." ? 'Redirect a single hostname, without *.' : m;
    },
    path: (val, all) => (fixed && normPath(val) === '/' ? 'Enter the path to redirect, such as /old.' : checkRedirectPath(val, all)),
    to: checkRedirectTo,
    project: val => (!val ? 'Choose a project.' : null),
  }, {
    verb: 'add it',
    links: { from: ['path', 'to'], path: ['to'] },
    submit: async val => {
      await api();
      const x = { host: val.from.trim().toLowerCase(), path: normPath(val.path), to: val.to.trim(), code: +val.code, keepPath: val.keepPath, project: val.project };
      D.redirects.push(x);
      d.close();
      refresh();
      toast(`${redirectLabel(x)} now redirects to ${x.to}.`, { title: 'Redirect added' });
    },
  });
  const ex = $('[data-example]', f);
  const show = () => { ex.innerHTML = redirectExample(v.values()); };
  f.addEventListener('input', show);
  f.addEventListener('change', show);
  show();
}

/* On a route's page, between Targets and Certificate: the paths on its hostname that never reach it */
function pathRedirectsPanel(r) {
  const list = redirectsSorted().filter(x => x.host === r.host && x.path !== '/');
  return `<section class="ap-panel" aria-labelledby="s-pr"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s-pr">Path redirects</h2><p class="ap-panel-desc">Paths on <span class="ap-data">${esc(r.host)}</span> that send visitors elsewhere before they reach any route.</p></div><button class="ap-btn ap-btn-sm" type="button" data-add-pr data-write>${icon('plus')}Add path redirect</button></div>
${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Path redirects on ${esc(r.host)}</caption><thead><tr><th scope="col">Path</th><th scope="col">To</th><th scope="col">Status code</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map((x, i) => `<tr><td><div class="ap-cell-main"><span class="ap-data">${esc(x.path)}</span>${x.stack ? stackTag(x.stack.name) : ''}</div></td><td>${redirectTo(x)}</td><td>${redirectCode(x)}</td><td class="ap-col-actions">${x.stack ? '' : `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete redirect from ${esc(redirectLabel(x))}" data-del-pr="${i}" data-write>${icon('trash-2')}</button>`}</td></tr>`).join('')}
</tbody></table></div>` : `<div class="ap-panel-body"><p class="ap-muted" style="margin:0">No path redirects. Every path on this hostname reaches its routes.</p></div>`}</section>`;
}
function mountPathRedirects(el, r) {
  const list = redirectsSorted().filter(x => x.host === r.host && x.path !== '/');
  $$('[data-add-pr]', el).forEach(b => b.addEventListener('click', () => redirectDialog({ host: r.host, project: r.project })));
  $$('[data-del-pr]', el).forEach(b => b.addEventListener('click', () => deleteRedirect(list[+b.dataset.delPr])));
}

/* Stacks: Swarm stacks whose routes come from apiary.* labels in their stack file. Apiary never reads Docker: the
   stack's pipeline runs `apiary apply`, which reads the labels and sends them to the admin API with a pipeline token. */
const STACK_NAME = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const waiting = s => !s.applied;
const andList = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const declaredText = d => [d.routes.length ? plural(d.routes.length, 'route') : '', d.streams.length ? plural(d.streams.length, 'stream route') : '', d.redirects.length ? plural(d.redirects.length, 'redirect') : ''].filter(Boolean);
const tokenValue = () => 'apiary_pt_' + btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, '');
const applyCommand = stack => `docker stack deploy --compose-file stack.yaml ${stack}
docker run --rm -e APIARY_TOKEN -v "$PWD:/work" datapointsoftware/apiary \\
  apply --server ${APIARY_URL} --stack ${stack} /work/stack.yaml`;
const dryRunCommand = stack => `docker run --rm -e APIARY_TOKEN -v "$PWD:/work" datapointsoftware/apiary \\
  apply --dry-run --server ${APIARY_URL} --stack ${stack} /work/stack.yaml`;
const sampleLabels = `services:
  web:
    image: registry.example.com/shop/web:2.14.0
    deploy:
      labels:
        apiary.project: Shop
        apiary.route.web.host: shop.example.com
        apiary.route.web.port: "8080"
        apiary.route.web.timeout: "30"
        apiary.redirect.www.from: www.shop.example.com
        apiary.redirect.www.to: https://shop.example.com`;
const setupPanel = stack => `<section class="ap-panel" style="max-width:800px" aria-labelledby="su-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="su-t">Apply from your pipeline</h2><p class="ap-panel-desc">Apiary never connects to Docker. Your pipeline reads the labels from the stack file and sends them here, so routes change in the same commit as the services. It calls the admin port, so it must run inside your network, like the people who use this interface.</p></div></div><div class="ap-panel-body ap-stack">
<ol class="ap-stack" style="gap:12px;margin:0;padding-left:20px">
<li class="ap-stack" style="gap:8px"><span>Add <span class="ap-data">apiary.*</span> labels under <span class="ap-data">deploy.labels</span> of each service:</span>${copyText(sampleLabels, true)}<span class="ap-muted">Passwords, sign-in links, certificates and allowed addresses can’t be set by labels: anyone who can inspect the service could read them.</span></li>
<li class="ap-stack" style="gap:8px"><span>In merge requests, show what an apply would change, without changing it:</span>${copyText(dryRunCommand(stack), true)}</li>
<li class="ap-stack" style="gap:8px"><span>After the deploy, apply it. Routes of ${esc(stack)} missing from the file are removed.</span>${copyText(applyCommand(stack), true)}</li>
</ol></div></section>`;

function planList(p) {
  const rows = [
    ...p.added.map(([kind, what]) => [status('ok', 'Added'), `${kind} <span class="ap-data">${esc(what)}</span>`]),
    ...p.changed.map(([kind, what, f, a, b, by]) => [status(by ? 'warn' : 'info', by ? 'Replaced a change' : 'Changed'), `${kind} <span class="ap-data">${esc(what)}</span>: ${esc(f)} <span class="ap-data">${esc(a)}</span> → <span class="ap-data">${esc(b)}</span>${by ? `<span class="ap-caption" style="display:block">${esc(a)} was set by ${esc(by[0])}, ${ago(by[1])}. A label now sets it, so it’s locked.</span>` : ''}`]),
    ...p.removed.map(([kind, what]) => [status('warn', 'Removed'), `${kind} <span class="ap-data">${esc(what)}</span>`]),
  ];
  return rows.length ? `<div class="ap-list">${rows.map(([s, t]) => `<div class="ap-list-row"><div class="ap-list-text"><span>${t}</span></div>${s}</div>`).join('')}</div>` : '<p class="ap-muted" style="margin:0">Nothing changed: the stack file matched what Apiary had.</p>';
}

/* Pipeline tokens: created by an Administrator from a stack, so each reaches only that stack, and shown once */
function tokenDialog(stack) {
  const d = dialog({
    title: `Create a pipeline token for ${esc(stack)}`, backdrop: false,
    body: `<form id="pt-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', data: true, placeholder: `${stack}-deploy`, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Shown in the audit log for every apply, so name the pipeline that uses it.' })}
<div style="max-width:280px">${field({ name: 'days', label: 'Expires after', control: select('days', [['30', '30 days'], ['90', '90 days'], ['365', '1 year']], '90'), help: 'Create a new one before it expires, and update the CI variable.' })}</div>
<p class="ap-caption" style="margin:0">It can only apply ${esc(stack)}: it can’t change other stacks, routes not from a stack, users or settings.</p></form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="pt-form" data-busy="Creating…" data-write>Create token</button>`,
  });
  form($('#pt-form', d.el), { name: v => V.required(v, 'a name') || (D.pipelineTokens.some(t => t.name === String(v).trim()) ? 'Another token has this name. Choose another.' : null) }, {
    verb: 'create the token',
    submit: async v => {
      await api();
      const t = { id: 'pt' + Date.now().toString(36), name: v.name.trim(), stack, created: NOW, by: D.me.email, expires: NOW + +v.days * DAY, last: null };
      D.pipelineTokens.push(t);
      D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `created pipeline token <code>${esc(t.name)}</code> for stack <code>${esc(stack)}</code>`, meta: 'From 10.0.4.21' });
      d.close();
      refresh();
      showToken(t);
    },
  });
}
function showToken(t) {
  dialog({
    title: `Token ${esc(t.name)}`, mark: ['ok', 'key-round'], initial: '[data-copy]',
    body: `<p style="margin:0">Store it as a masked, protected CI variable named <span class="ap-data">APIARY_TOKEN</span>. You won’t see it again: Apiary keeps only a hash.</p>${copyText(tokenValue())}
<p class="ap-caption" style="margin:0">Anyone with it can change or remove the routes of ${esc(t.stack)}. If it leaks, revoke it here.</p>`,
    foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>I stored it</button>',
  });
}
function revokeToken(t) {
  confirmDialog({
    title: `Revoke ${esc(t.name)}?`, text: `Pipelines that use it can’t apply <span class="ap-data">${esc(t.stack)}</span> anymore. The routes it applied stay as they are.`,
    confirm: 'Revoke token', busy: 'Revoking…',
    onConfirm: async () => {
      await api();
      D.pipelineTokens.splice(D.pipelineTokens.indexOf(t), 1);
      D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `revoked pipeline token <code>${esc(t.name)}</code>`, meta: 'From 10.0.4.21' });
      refresh();
      toast(`${t.name} no longer works.`);
    },
  });
}
const tokensTable = (list, withStack) => `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Pipeline tokens</caption><thead><tr><th scope="col">Token</th>${withStack ? '<th scope="col">Stack</th>' : ''}<th scope="col">Created</th><th scope="col">Last used</th><th scope="col">Expires</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map(t => `<tr><td class="ap-data">${esc(t.name)}</td>${withStack ? `<td><a class="ap-tag" href="#/stacks/${esc(t.stack)}">${esc(t.stack)}</a></td>` : ''}<td class="ap-muted">${ago(t.created)} by ${esc(t.by)}</td><td class="ap-muted">${t.last ? ago(t.last) : 'Never'}</td><td class="ap-data">${fmtDate(t.expires, false)}</td><td class="ap-col-actions">${isAdmin() ? `<button class="ap-btn ap-btn-sm" type="button" data-revoke="${t.id}" data-write>Revoke…</button>` : ''}</td></tr>`).join('')}
</tbody></table></div>`;
const bindTokens = el => $$('[data-revoke]', el).forEach(b => b.addEventListener('click', () => revokeToken(D.pipelineTokens.find(t => t.id === b.dataset.revoke))));

/* Add stack makes an empty stack and its first token, so a new install has somewhere to start */
function addStackDialog() {
  const d = dialog({
    title: 'Add a stack', backdrop: false,
    body: `<form id="as-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'stack', label: 'Stack name', data: true, placeholder: 'shop', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'The name your pipeline gives <span class="ap-data">docker stack deploy</span>, such as <span class="ap-data">shop</span>.' })}
${field({ name: 'project', label: 'Project', optional: true, control: select('project', [['', 'Set by the apiary.project label'], ...D.projects.map(p => [p.id, p.name])], ''), help: 'Where its routes go when their labels don’t name a project.' })}
${field({ name: 'name', label: 'Token name', data: true, placeholder: 'shop-deploy', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'For the stack’s first pipeline token. It appears in the audit log for every apply, so name the pipeline that uses it.' })}
<div style="max-width:280px">${field({ name: 'days', label: 'Token expires after', control: select('days', [['30', '30 days'], ['90', '90 days'], ['365', '1 year']], '90') })}</div>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="as-form" data-busy="Adding…" data-write>Add stack</button>`,
  });
  const f = $('#as-form', d.el);
  let named = false;
  f.elements.name.addEventListener('input', () => { named = true; });
  f.elements.stack.addEventListener('input', () => { if (!named) f.elements.name.value = f.elements.stack.value.trim() ? `${f.elements.stack.value.trim()}-deploy` : ''; });
  form(f, {
    stack: v => { const n = String(v).trim(); return !n ? 'Enter the stack name.' : !STACK_NAME.test(n) ? 'Use the name as Docker writes it: lowercase letters, digits, hyphens and underscores.' : stackOf(n) ? 'This stack is already here. Open it to create another token.' : null; },
    name: v => V.required(v, 'a token name') || (D.pipelineTokens.some(t => t.name === String(v).trim()) ? 'Another token has this name. Choose another.' : null),
  }, {
    verb: 'add the stack',
    links: { stack: ['name'] },
    submit: async v => {
      await api();
      const s = { name: v.stack.trim(), project: v.project, created: NOW, createdBy: D.me.email, applied: null };
      const t = { id: 'pt' + Date.now().toString(36), name: v.name.trim(), stack: s.name, created: NOW, by: D.me.email, expires: NOW + +v.days * DAY, last: null };
      D.stacks.push(s);
      D.pipelineTokens.push(t);
      D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `added stack <code>${esc(s.name)}</code> and pipeline token <code>${esc(t.name)}</code>`, meta: 'From 10.0.4.21' });
      d.close();
      go('/stacks/' + s.name);
      showToken(t);
    },
  });
}
/* Remove stack, after `docker stack rm`: deletes what the stack declared and revokes its tokens */
function removeStack(s) {
  const d = declaredIn(s.name), tokens = D.pipelineTokens.filter(t => t.stack === s.name), lost = declaredText(d);
  confirmDialog({
    title: `Remove stack ${esc(s.name)}?`,
    text: `${lost.length ? `Apiary deletes its ${andList(lost)} on every replica, and requests to them get a 404 at once. ` : ''}${tokens.length ? `${tokens.length === 1 ? 'Its pipeline token stops' : `Its ${tokens.length} pipeline tokens stop`} working. ` : ''}Do this after <span class="ap-data">docker stack rm ${esc(s.name)}</span>: Apiary never touches Docker, so the services keep running until you run it. Routes not from this stack don’t change.`,
    confirm: 'Remove stack', busy: 'Removing…', type: s.name,
    onConfirm: async () => {
      await api();
      D.routes = D.routes.filter(r => !d.routes.includes(r));
      D.streams = D.streams.filter(x => !d.streams.includes(x));
      D.redirects = D.redirects.filter(x => !d.redirects.includes(x));
      D.pipelineTokens = D.pipelineTokens.filter(t => t.stack !== s.name);
      D.stacks = D.stacks.filter(x => x !== s);
      D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `removed stack <code>${esc(s.name)}</code>`, meta: `${andList(lost) || 'Nothing declared'} · ${plural(tokens.length, 'token')} revoked · from 10.0.4.21` });
      go('/stacks');
      toast(`${s.name} is gone${lost.length ? `, with its ${andList(lost)}` : ''}.`);
    },
  });
}

/* Prototype only: what an apply does to a stack, and what the pipeline log shows, when it works and when it doesn't */
const SIMULATIONS = [['works', 'works'], ['conflict', 'finds a hostname in use'], ['quorum', 'can’t reach a quorum'], ['empty', 'removes everything']];
const commitId = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 7);
function pipelineLog(title, ok, log, note) {
  dialog({
    title, mark: ok ? ['ok', 'circle-check'] : ['critical', 'circle-alert'], size: 'lg',
    body: `<p style="margin:0">What the pipeline log shows:</p><div class="ap-copy" style="align-items:flex-start"><code style="white-space:pre;line-height:1.6;overflow:auto">${esc(log)}</code></div>${note ? `<p class="ap-caption" style="margin:0">${note}</p>` : ''}`,
    foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>Close</button>',
  });
}
function simulateApply(s, outcome) {
  const t = D.pipelineTokens.find(x => x.stack === s.name);
  const cmd = `$ apiary apply --server ${APIARY_URL} --stack ${s.name} /work/stack.yaml`;
  if (!t) return pipelineLog('The apply was refused', false, `${cmd}\nerror: auth.invalidToken: APIARY_TOKEN isn't a valid pipeline token for stack ${s.name}.\n       It may have expired or been revoked. Ask an Administrator for a new one.\nNothing was changed.`, 'Apiary doesn’t record refused tokens on the stack page or in the audit log: anyone could send one. Its server log has a warning for each.');
  if (outcome === 'quorum' || Proto.state.cluster === 'quorum') {
    return pipelineLog('The apply failed', false, `${cmd}\nRead 3 services and 14 apiary labels from stack.yaml.\nerror: cluster.noQuorum: only 1 of 3 voting replicas can be reached, so Apiary can't save changes.\nNothing was changed. Every replica keeps serving the current routes. Run the job again when the cluster has quorum.`, 'Nothing appears on this page or in the audit log: without quorum, Apiary can’t save anything, its own records included. Only the pipeline log shows it, which is why the command exits with an error and fails the job.');
  }
  const fail = (code, title, text, log, labels = 14) => {
    s.failed = { at: NOW, code, title, text, token: t.name };
    t.last = NOW;
    D.audit.unshift({ at: NOW, actor: `Pipeline ${t.name}`, via: 'API', denied: true, text: `tried to apply stack <code>${esc(s.name)}</code>`, meta: `${code} · from 10.0.12.7` });
    refresh();
    pipelineLog('The apply failed', false, `${cmd}\nRead 3 services and ${labels} apiary labels from stack.yaml.\n${log}\nNothing was changed.`);
  };
  if (outcome === 'conflict') {
    return fail('route.hostInUse', 'a hostname is already in use', 'The stack file declares <span class="ap-data">grafana.internal.example.com</span>, which a route in Internal tools, not from a stack, already uses. Nothing changed.',
      `error: route.hostInUse: grafana.internal.example.com is already used by a route that isn't in stack ${s.name}\n       (project Internal tools, not from a stack). Apiary won't take it over.\n       Remove the label, or delete or move the other route first.`);
  }
  const d = declaredIn(s.name), all = d.routes.length + d.streams.length + d.redirects.length;
  if (outcome === 'empty') {
    return fail('stack.removesEverything', 'it would remove everything', `The stack file declares nothing, so the apply would delete all ${plural(all, 'item')} of ${esc(s.name)}. That usually means the wrong file or labels that went missing.`,
      `Plan for stack ${s.name}: 0 added, 0 changed, ${all} removed.\nerror: stack.removesEverything: this apply would remove everything stack ${s.name} declares,\n       which usually means the wrong file or missing labels.\n       If you mean it, run again with --allow-removing-all.`, 0);
  }
  const plan = { added: [], changed: [], removed: [] }, lines = [];
  if (waiting(s)) {
    const host = `${s.name}.example.com`;
    D.routes.push({ id: 'r' + Date.now().toString(36), host, path: '/', project: s.project || D.projects[0].id, targets: [{ host: `${s.name}_web`, port: 8080, weight: 100 }], protocols: ['HTTP/2'], status: 'ok', cert: 'auto', rpm: 0, timeout: 30, allow: [], changed: [NOW, t.name], stack: { name: s.name, service: `${s.name}_web`, fields: ['host', 'path', 'targets', 'timeout'] } });
    plan.added.push(['Route', host]);
    lines.push(`  + route ${host}   → ${s.name}_web:8080`);
  } else {
    const r = d.routes.find(x => x.hand && x.hand.timeout && !x.stack.fields.includes('timeout'));
    if (r) {
      const by = r.hand.timeout;
      plan.changed.push(['Route', routeLabel(r), 'Timeout', `${r.timeout} seconds`, '30 seconds', by]);
      lines.push(`  ~ route ${routeLabel(r)}   timeout ${r.timeout} s → 30 s`, `      replaces a value set by ${by[0]} on ${fmtDate(by[1], false)}; the label locks it from now on`);
      Object.assign(r, { timeout: 30, changed: [NOW, t.name] });
      r.stack.fields.push('timeout');
      delete r.hand.timeout;
    }
  }
  const n = plan.added.length + plan.changed.length + plan.removed.length;
  Object.assign(s, { applied: NOW, token: t.name, commit: commitId(), pipeline: s.pipeline || `https://gitlab.example.com/${s.name}/-/pipelines/${18000 + D.audit.length}`, plan, failed: null });
  t.last = NOW;
  D.audit.unshift({ at: NOW, actor: `Pipeline ${t.name}`, via: 'API', text: `applied stack <code>${esc(s.name)}</code>`, meta: `${plan.added.length} added, ${plan.changed.length} changed, ${plan.removed.length} removed · commit ${s.commit} · from 10.0.12.7` });
  refresh();
  pipelineLog('The apply worked', true, `${cmd}\nRead 3 services and 14 apiary labels from stack.yaml.\n${n ? `Plan for stack ${s.name}:\n${lines.join('\n')}\n` : `Stack ${s.name} already matches stack.yaml.\n`}Applied to every replica at once: ${plan.added.length} added, ${plan.changed.length} changed, ${plan.removed.length} removed.`, n ? 'A dry run in the merge request prints the same plan, without applying it.' : 'Try another outcome, or run it again after a failure to see it clear.');
}

route('/stacks', () => {
  const add = isAdmin() ? `<button class="ap-btn ap-btn-primary" type="button" data-add-stack data-write>${icon('plus')}Add stack</button>` : '';
  const head = pageHead({ title: 'Stacks', sub: 'Swarm stacks whose routes come from labels in their stack file. Their pipeline applies the file after each deploy.', actions: D.stacks.length ? add : '' });
  const mount = el => $$('[data-add-stack]', el).forEach(b => b.addEventListener('click', addStackDialog));
  if (!D.stacks.length) return { title: 'Stacks', mount, html: `${head}<section class="ap-panel">${emptyState('No stacks yet', `Add the stacks you deploy from CI. Apiary gives each one a pipeline token, and its pipeline applies the routes in the stack file’s labels.${isAdmin() ? '' : ' Only Administrators can add stacks.'}`, add)}</section>` };
  return {
    title: 'Stacks', mount,
    html: `${head}<section class="ap-panel"><div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Stacks</caption><thead><tr><th scope="col">Stack</th><th scope="col">Project</th><th scope="col">Declares</th><th scope="col">Last applied</th><th scope="col">Changes</th></tr></thead><tbody>
${D.stacks.map(s => {
    const n = waiting(s) ? 0 : s.plan.added.length + s.plan.changed.length + s.plan.removed.length;
    return `<tr><td><a class="ap-data" href="#/stacks/${esc(s.name)}">${esc(s.name)}</a></td><td class="ap-muted">${esc((projectOf(s.project) || {}).name || 'From labels')}</td><td class="ap-muted">${waiting(s) ? '–' : declaredText(declaredIn(s.name)).join(' · ') || 'Nothing'}</td><td>${s.failed ? status('warn', 'Last apply failed') : waiting(s) ? status('info', 'Waiting for the first apply') : `<span class="ap-muted">${ago(s.applied)} by <span class="ap-data">${esc(s.token)}</span></span>`}</td><td class="ap-muted">${waiting(s) ? '–' : n ? plural(n, 'change') : 'No changes'}</td></tr>`;
  }).join('')}</tbody></table></div></section>`,
  };
});
route('/stacks/:name', name => {
  const s = stackOf(name);
  if (!s) return notFound();
  const d = declaredIn(s.name), tokens = D.pipelineTokens.filter(t => t.stack === s.name), admin = isAdmin();
  const items = [...d.routes.map(r => [`<a class="ap-data" href="#/routes/${r.id}">${esc(routeLabel(r))}</a>`, 'Route', r.stack.service]), ...d.streams.map(x => [`<span class="ap-data">${esc(x.name)}</span>`, `Stream route, ${x.proto} ${x.listen}`, x.stack.service]), ...d.redirects.map(x => [`<span class="ap-data">${esc(redirectLabel(x))}</span>`, 'Redirect', x.stack.service])];
  const sub = waiting(s) ? `${status('info', 'Waiting for the first apply')} &nbsp;·&nbsp; Added ${ago(s.created)} by ${esc(s.createdBy)}`
    : `Last applied ${ago(s.applied)} by pipeline <span class="ap-data">${esc(s.token)}</span> &nbsp;·&nbsp; commit <a class="ap-data" href="${esc(s.pipeline)}" target="_blank" rel="noopener">${esc(s.commit)}</a>`;
  const lastApply = waiting(s)
    ? `<section class="ap-panel" style="max-width:800px" aria-labelledby="la-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="la-t">First apply</h2></div></div><div class="ap-panel-body">${banner('info', `Nothing has applied ${esc(s.name)} yet`, `Add the commands under Apply from your pipeline, below, to the pipeline that deploys ${esc(s.name)}, with its token as <span class="ap-data">APIARY_TOKEN</span>. After its first run, the routes in its labels appear here.`)}</div></section>`
    : `<section class="ap-panel" style="max-width:800px" aria-labelledby="la-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="la-t">Last apply</h2><p class="ap-panel-desc">${fmtDate(s.applied)} UTC. Every apply is in the audit log.</p></div></div><div class="ap-panel-body">${planList(s.plan)}</div></section>
<section class="ap-panel" style="max-width:800px" aria-labelledby="de-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="de-t">What it declares</h2><p class="ap-panel-desc">Fields the labels set are locked on their pages. Disabling and maintenance windows stay available.</p></div></div>
<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">What ${esc(s.name)} declares</caption><thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Service</th></tr></thead><tbody>${items.map(([a, b, c]) => `<tr><td>${a}</td><td class="ap-muted">${b}</td><td class="ap-data ap-muted">${esc(c)}</td></tr>`).join('')}</tbody></table></div></section>`;
  return {
    title: s.name,
    html: `${pageHead({ crumbs: [['Stacks', '#/stacks']], title: s.name, sub })}
${s.failed ? banner('critical', `The last apply failed ${ago(s.failed.at)}: ${esc(s.failed.title)}`, `${s.failed.text} Pipeline <span class="ap-data">${esc(s.failed.token)}</span>, error <span class="ap-data">${esc(s.failed.code)}</span>. This clears when an apply succeeds.`) : ''}
<div class="pt-row"><span class="ap-caption">Prototype: simulate an apply that</span>${SIMULATIONS.map(([k, t]) => `<button class="ap-btn ap-btn-sm" type="button" data-simulate="${k}">${t}</button>`).join('')}</div>
${lastApply}
<section class="ap-panel" style="max-width:800px" aria-labelledby="tk-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="tk-t">Pipeline tokens</h2><p class="ap-panel-desc">A pipeline needs one to apply ${esc(s.name)}.${admin ? '' : ' Only Administrators can create or revoke them.'}</p></div>${admin ? `<button class="ap-btn" type="button" data-new-token data-write>${icon('plus')}Create token</button>` : ''}</div>
${tokens.length ? tokensTable(tokens, false) : emptyState('No tokens', `Nothing can apply ${esc(s.name)} until an Administrator creates a token.`)}</section>
${setupPanel(s.name)}
<section class="ap-panel ap-panel-danger" style="max-width:800px" aria-labelledby="dz-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="dz-t">Danger zone</h2></div></div><div class="ap-panel-body ap-list">
<div class="ap-list-row"><div class="ap-list-text"><strong>Remove this stack</strong><span class="ap-muted">After <span class="ap-data">docker stack rm</span>. Deletes everything it declared and revokes its tokens.${admin ? '' : ' Needs the Administrator role.'}</span></div><button class="ap-btn" type="button" style="color:var(--critical)" data-remove-stack data-write${admin ? '' : ' disabled'}>Remove stack…</button></div></div></section>`,
    mount(el) {
      bindTokens(el);
      $('[data-new-token]', el)?.addEventListener('click', () => tokenDialog(s.name));
      $('[data-remove-stack]', el).addEventListener('click', () => removeStack(s));
      $$('[data-simulate]', el).forEach(b => b.addEventListener('click', () => simulateApply(s, b.dataset.simulate)));
    },
  };
});
