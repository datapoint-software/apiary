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
${list.map(s => { const [tone, text] = streamActivity(s); return `<tr><td><div class="ap-cell-main"><strong style="font-weight:500">${esc(s.name)}</strong>${s.serverNames.length ? `<span class="ap-caption ap-data">${esc(s.serverNames.join(', '))}</span>` : ''}</div></td><td><span class="ap-data">${s.listen}</span> <span class="ap-tag">${s.proto}</span></td><td class="ap-data ap-muted">${esc(s.target)}:${s.port}</td><td class="ap-muted">${esc(trafficProject(s.project))}</td><td>${status(tone, text)}${s.allow.length ? '<span class="ap-caption" style="display:block">Allowlist</span>' : ''}</td><td class="ap-num">${num(s.conns)}</td><td class="ap-col-actions"><div class="ap-row" style="gap:4px;justify-content:flex-end">
<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Edit ${esc(s.name)}" data-edit="${s.id}" data-write>${icon('pencil')}</button>
${s.disabled ? `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Enable ${esc(s.name)}" data-enable="${s.id}" data-write>${icon('play')}</button>` : `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Disable ${esc(s.name)}" data-disable="${s.id}" data-write>${icon('power')}</button>`}
<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete ${esc(s.name)}" data-del="${s.id}" data-write>${icon('trash-2')}</button></div></td></tr>`; }).join('')}
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
};
const certHosts = c => (c.host.startsWith('*.') ? [c.host, c.host.slice(2)] : [c.host]);
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
const certRoutes = c => D.routes.filter(r => (c.host.startsWith('*.') ? r.host.endsWith(c.host.slice(1)) && r.host.split('.').length === c.host.split('.').length : r.host === c.host));

route('/certificates', () => {
  const sorted = [...D.certs].sort((a, b) => (a.expires || Infinity) - (b.expires || Infinity));
  const admin = D.me.role === 'Administrator';
  const heading = c => ({ expired: `The certificate for ${esc(c.host)} expired`, expiring: `The certificate for ${esc(c.host)} expires in ${certDays(c)} days` }[certStatus(c)] || `Apiary can’t get a certificate for ${esc(c.host)}`);
  const upload = `<button class="ap-btn ap-btn-primary" type="button" data-upload data-write>${icon('upload')}Upload certificate</button>`;
  return {
    title: 'Certificates',
    html: `${pageHead({ title: 'Certificates', sub: 'Automatic certificates come from Let’s Encrypt and renew when a third of their lifetime is left. Upload your own for wildcards and internal CAs. Using automatic certificates means accepting Let’s Encrypt’s <a href="https://letsencrypt.org/repository/">Subscriber Agreement</a>, which Apiary accepts for you.', actions: upload })}
${sorted.filter(certAttention).map(c => banner(certStatus(c) === 'expired' ? 'critical' : 'warn', heading(c), certStatus(c) === 'failing' ? esc(CERT_MESSAGES[certFailure(c).code]) : c.source === 'uploaded' ? 'Upload a new one before it expires. Apiary doesn’t renew uploaded certificates.' : '', `<a href="#/certificates/${encodeURIComponent(c.host)}">See details</a>`)).join('')}
<section class="ap-panel">${D.certs.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Certificates, soonest to expire first</caption><thead><tr><th scope="col">Hostname</th><th scope="col">Source</th><th scope="col">Issuer</th><th scope="col" aria-sort="ascending">Expires</th><th scope="col">Status</th><th scope="col" class="ap-num">Routes</th></tr></thead><tbody>
${sorted.map(c => `<tr><td><div class="ap-cell-main"><a class="ap-data" href="#/certificates/${encodeURIComponent(c.host)}">${esc(c.host)}</a>${certHosts(c).length > 1 ? `<span class="ap-caption">and ${certHosts(c).length - 1} more</span>` : ''}</div></td><td class="ap-muted">${certSource(c)}</td><td class="ap-muted">${esc(c.issuer || '–')}</td><td><span class="ap-data">${c.expires ? fmtDate(c.expires, false) : '–'}</span></td><td>${status(certStatusTone(c), certStatusText(c))}</td><td class="ap-num">${certRoutes(c).length}</td></tr>`).join('')}
</tbody></table></div>` : emptyState('No certificates yet', 'Add a route and Apiary gets its certificate for you. Upload your own for a wildcard or internal hostname.', upload)}</section>
${admin ? `<div style="margin-top:var(--space-5)">${adminCertPanel()}</div>` : ''}`,
    mount(el) {
      $$('[data-upload]', el).forEach(b => b.addEventListener('click', () => uploadDialog()));
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
  const renewal = c.source === 'uploaded' ? 'Manual: upload a new one before it expires' : c.expires ? `From ${fmtDate(c.expires - (c.expires - c.issued) / 3, false)}, retrying until it works` : 'As soon as Let’s Encrypt can reach the hostname';
  const names = { issued: 'Issued', renewed: 'Renewed', uploaded: 'Uploaded', replaced: 'Replaced', failed: 'Failed' };
  const meta = e => [e.code ? CERT_MESSAGES[e.code] : '', e.detail || '', e.by ? 'By ' + e.by : ''].filter(Boolean).join(' · ');
  return {
    title: c.host,
    html: `${pageHead({ crumbs: [['Certificates', '#/certificates']], title: c.host, sub: status(certStatusTone(c), certStatusText(c)) + ` &nbsp;·&nbsp; ${certSource(c)}`, actions: c.source === 'auto' ? `<button class="ap-btn ap-btn-primary" type="button" data-renew data-write>${icon('refresh-cw')}Renew now</button>` : `<button class="ap-btn" type="button" data-replace data-write>${icon('upload')}Replace…</button>` })}
${f ? banner('critical', c.expires ? 'Renewal is failing' : 'Apiary can’t get this certificate yet', `${esc(CERT_MESSAGES[f.code])}<span class="ap-code" style="display:block;margin-top:6px">${esc(f.detail)}</span><span style="display:block;margin-top:6px">Apiary tries again at ${fmtDate(f.next)} UTC. Fix the cause, then renew now.</span>`) : st === 'pending' ? banner('info', 'Requesting the certificate', 'Let’s Encrypt checks the hostname by fetching a file from it on port 80, so its DNS must point at your edge nodes. Until then, the route answers over HTTP only.') : ''}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="cd-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="cd-t">Details</h2></div><div class="ap-panel-body">
<dl class="ap-kv"><dt>Covers</dt><dd class="ap-data">${esc(certHosts(c).join(', '))}</dd><dt>Issuer</dt><dd>${esc(c.issuer || '–')}</dd>${c.expires ? `<dt>Valid</dt><dd><span class="ap-data">${fmtDate(c.issued)}</span> to <span class="ap-data">${fmtDate(c.expires)}</span> UTC</dd>` : ''}<dt>Renewal</dt><dd>${renewal}</dd>${c.expires ? '<dt>Chain</dt><dd>2 certificates</dd>' : ''}${project ? `<dt>Project</dt><dd>${esc(project)}</dd>` : ''}
<dt>Used by</dt><dd>${rs.length ? rs.map(r => `<a class="ap-data" href="#/routes/${r.id}">${esc(routeLabel(r))}</a>`).join('<br>') : 'No routes'}</dd></dl></div>
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
      $('[data-del]', el).addEventListener('click', () => confirmDialog({ title: `Delete the certificate for ${esc(c.host)}?`, text: 'No route uses it. Its private key is deleted from every replica.', confirm: 'Delete certificate', busy: 'Deleting…', onConfirm: async () => { await api(); D.certs.splice(D.certs.indexOf(c), 1); go('/certificates'); toast('Certificate deleted.'); } }));
    },
  };
});

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

/* Redirects */
route('/redirects', () => ({
  title: 'Redirects',
  html: `${pageHead({ title: 'Redirects', sub: 'Send one hostname to another address, such as www.example.com to example.com.', actions: D.redirects.length ? `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add redirect</button>` : '' })}
<section class="ap-panel">${D.redirects.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Redirects</caption><thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Status code</th><th scope="col">Path</th><th scope="col">Project</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.redirects.map((x, i) => `<tr><td class="ap-data">${esc(x.from)}</td><td class="ap-data ap-muted">${esc(x.to)}</td><td><span class="ap-tag">${x.code}</span> <span class="ap-muted">${{ 301: 'Permanent', 308: 'Permanent, keeps method', 302: 'Temporary', 307: 'Temporary, keeps method' }[x.code]}</span></td><td class="ap-muted">${x.keepPath ? 'Kept' : 'Dropped'}</td><td class="ap-muted">${esc(trafficProject(x.project))}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete redirect from ${esc(x.from)}" data-del="${i}" data-write>${icon('trash-2')}</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No redirects yet', 'A redirect sends one hostname to another, such as <span class="ap-code">www.example.com</span> to <span class="ap-code">example.com</span>, with a 308 or 307.', `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add redirect</button>`)}</section>`,
  mount(el) {
    $$('[data-add]', el).forEach(b => b.addEventListener('click', redirectDialog));
    $$('[data-del]', el).forEach(b => b.addEventListener('click', () => {
      const x = D.redirects[+b.dataset.del];
      confirmDialog({ title: `Delete the redirect from ${esc(x.from)}?`, text: 'Requests to it get a 404 at once. Browsers may remember a permanent redirect for a while.', confirm: 'Delete redirect', busy: 'Deleting…', onConfirm: async () => { await api(); D.redirects.splice(D.redirects.indexOf(x), 1); refresh(); toast(`The redirect from ${x.from} was deleted.`); } });
    }));
  },
}));
function redirectDialog() {
  const d = dialog({
    title: 'Add redirect', backdrop: false,
    body: `<form class="ap-form" id="rd-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'from', label: 'From hostname', data: true, placeholder: 'www.example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Gets an automatic certificate, so HTTPS visitors are redirected too.' })}
${field({ name: 'to', label: 'To', data: true, placeholder: 'https://example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none" inputmode="url"' })}
<fieldset class="ap-field" data-field="code" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Type</legend><div class="ap-stack" style="gap:10px">
${[[308, 'Permanent', 'Search engines move to the new address. Keeps POST requests as POST.'], [307, 'Temporary', 'Search engines keep the old address.']].map(([c, t, h], i) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="code" value="${c}"${i === 0 ? ' checked' : ''}><span class="ap-choice-text"><span>${t} <span class="ap-caption">${c}</span></span><span class="ap-help">${h}</span></span></label>`).join('')}</div><span class="ap-error" id="e-code" hidden></span></fieldset>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="keepPath" checked><span class="ap-choice-text"><span>Keep the path</span><span class="ap-help">www.example.com/shoes goes to example.com/shoes.</span></span></label>
${field({ name: 'project', label: 'Project', help: 'Only for grouping.', control: select('project', D.projects.map(p => [p.id, p.name]), (D.projects[0] || {}).id) })}
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rd-form" data-busy="Adding…" data-write>Add redirect</button>`,
  });
  applyWriteLock(d.el);
  form($('#rd-form', d.el), {
    from: v => {
      const m = V.hostname(v, { wildcard: false });
      if (m) return m === "Wildcards aren't allowed here." ? 'Redirect a single hostname, without *.' : m;
      const h = String(v).trim().toLowerCase();
      if (D.routes.some(r => r.host === h)) return 'This hostname is already a route. A hostname can be a route or a redirect, not both.';
      if (D.redirects.some(r => r.from === h)) return 'This hostname already redirects. Delete that redirect first to change it.';
      return null;
    },
    to: (v, all) => {
      const s = String(v).trim();
      if (!s) return 'Enter a full address that starts with https://, such as https://example.com.';
      let u;
      try { u = new URL(s); } catch (e) { return 'Enter a full address that starts with https://, such as https://example.com.'; }
      if (!/^https?:$/.test(u.protocol)) return 'Enter a full address that starts with https://, such as https://example.com.';
      if (u.hostname === String(all.from).trim().toLowerCase()) return 'That would send visitors back to the same hostname, in a loop.';
      return null;
    },
    project: v => (!v ? 'Choose a project.' : null),
  }, {
    verb: 'add it',
    links: { from: ['to'] },
    submit: async v => {
      await api();
      D.redirects.push({ from: v.from.trim().toLowerCase(), to: v.to.trim(), code: +v.code, keepPath: v.keepPath, project: v.project });
      d.close();
      refresh();
      toast(`${v.from.trim().toLowerCase()} now redirects to ${v.to.trim()}.`, { title: 'Redirect added' });
    },
  });
}
