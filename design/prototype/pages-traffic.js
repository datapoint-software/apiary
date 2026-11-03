/* Stream routes, certificates and redirects. */
const RESERVED_PORTS = { 80: 'HTTP routes and certificate challenges', 443: 'HTTPS routes', 8443: "the admin interface and MCP, on the internal network" };

route('/streams', () => ({
  title: 'Stream routes',
  html: `${pageHead({ title: 'Stream routes', sub: 'TCP and UDP traffic, such as MQTT or databases, forwarded as it is. Apiary doesn’t read or change it.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add stream route</button>` })}
${banner('info', 'Each stream route needs its port published', 'Swarm only sends traffic to ports your compose file publishes. After adding a stream route, add its port to the edge service and deploy the stack again.')}
<section class="ap-panel">${D.streams.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Stream routes</caption><thead><tr><th scope="col">Name</th><th scope="col">Listens on</th><th scope="col">Target</th><th scope="col">Project</th><th scope="col">Status</th><th scope="col" class="ap-num">Connections</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.streams.map(s => `<tr><td><strong style="font-weight:500">${esc(s.name)}</strong></td><td><span class="ap-data">${s.listen}</span> <span class="ap-tag">${s.proto}</span></td><td class="ap-data ap-muted">${esc(s.target)}:${s.port}</td><td class="ap-muted">${esc((projectOf(s.project) || {}).name || '–')}</td><td>${status(s.status, s.statusText || 'Healthy')}</td><td class="ap-num">${num(s.conns)}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for ${esc(s.name)}" aria-haspopup="menu" aria-expanded="false" data-smenu="${s.id}">${icon('ellipsis')}</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No stream routes', 'Forward TCP or UDP traffic, such as MQTT on port 1883, to a service on the shared network.', `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add stream route</button>`)}</section>`,
  mount(el) {
    $$('[data-add]', el).forEach(b => b.addEventListener('click', () => streamDialog()));
    $$('[data-smenu]', el).forEach(b => b.addEventListener('click', () => {
      const s = D.streams.find(x => x.id === b.dataset.smenu);
      menu(b, [
        { icon: 'pencil', label: 'Edit stream route', write: true, run: () => streamDialog(s) },
        '-',
        { icon: 'trash-2', label: 'Delete stream route…', danger: true, write: true, run: () => confirmDialog({ title: `Delete ${esc(s.name)}?`, text: `Connections to port ${s.listen}/${s.proto} are refused at once, and open ones are closed. Remove the port from your compose file afterwards.`, confirm: 'Delete stream route', busy: 'Deleting…', onConfirm: async () => { await api(); D.streams.splice(D.streams.indexOf(s), 1); refresh(); toast(`${s.name} deleted.`); } }) },
      ], { label: 'Actions for ' + s.name });
    }));
  },
}));

function streamDialog(s) {
  const editing = !!s;
  const d = dialog({
    title: editing ? 'Edit stream route' : 'Add stream route', size: 'lg', backdrop: false,
    body: `<form class="ap-form" id="st-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: s ? s.name : '', placeholder: 'MQTT', attrs: 'autocomplete="off"' })}
<fieldset class="ap-field" data-field="proto" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Protocol</legend><div class="ap-row" style="gap:20px">${['TCP', 'UDP'].map(p => `<label class="ap-choice"><input class="ap-radio" type="radio" name="proto" value="${p}"${(s ? s.proto : 'TCP') === p ? ' checked' : ''}>${p}</label>`).join('')}</div><span class="ap-error" id="e-proto" hidden></span></fieldset>
<div class="ap-grid-2">${field({ name: 'listen', label: 'Listens on port', value: s ? s.listen : '', data: true, attrs: 'inputmode="numeric"', help: 'On every edge node.' })}${field({ name: 'project', label: 'Project', control: select('project', [['', 'Choose a project'], ...D.projects.map(p => [p.id, p.name])], s ? s.project : '') })}</div>
<div class="ap-target-row" style="grid-template-columns:minmax(0,2fr) minmax(84px,1fr)">${field({ name: 'target', label: 'Target', value: s ? s.target : '', data: true, placeholder: 'mqtt', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}${field({ name: 'port', label: 'Port', value: s ? s.port : '', data: true, attrs: 'inputmode="numeric"' })}</div>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="st-form" data-busy="${editing ? 'Saving…' : 'Adding…'}" data-write>${editing ? 'Save' : 'Add stream route'}</button>`,
  });
  applyWriteLock(d.el);
  form($('#st-form', d.el), {
    name: v => (!String(v).trim() ? 'Enter a name, such as MQTT.' : String(v).length > 40 ? 'Use 40 characters or fewer.' : null),
    listen: (v, all) => {
      const m = V.port(v);
      if (m) return m;
      if (RESERVED_PORTS[+v]) return `Port ${+v} is used by ${RESERVED_PORTS[+v]}. Choose another.`;
      const clash = D.streams.find(x => x !== s && x.listen === +v && x.proto === all.proto);
      return clash ? `Port ${+v}/${all.proto} is already used by ${clash.name}.` : null;
    },
    project: v => (!v ? 'Choose a project.' : null),
    target: V.target,
    port: v => V.port(v),
  }, {
    links: { proto: ['listen'] },
    submit: async v => {
      await api();
      const next = { name: v.name.trim(), proto: v.proto, listen: +v.listen, target: v.target.trim(), port: +v.port, project: v.project };
      if (editing) { Object.assign(s, next); d.close(); refresh(); return toast(`${next.name} saved.`); }
      D.streams.push(Object.assign({ id: 's' + Date.now().toString(36), status: 'ok', conns: 0 }, next));
      refresh();
      /* A second step in the same dialog: what to do next */
      $('.ap-dialog-head', d.el).innerHTML = `<span class="ap-dialog-mark ap-dialog-mark-ok">${icon('circle-check')}</span><h2 class="ap-h ap-h-2" id="${d.box.getAttribute('aria-labelledby')}">Publish port ${next.listen}</h2>`;
      d.body(`<p style="margin:0">${esc(next.name)} is ready. To send it traffic, publish the port on the edge service in your compose file, then deploy the stack again.</p>
<div class="ap-copy"><code>- { target: ${next.listen}, published: ${next.listen}, protocol: ${next.proto.toLowerCase()}, mode: host }</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>
<span class="ap-help">Under <span class="ap-code">services.apiary.ports</span>. Host mode keeps each visitor's address.</span>`);
      d.foot('<button class="ap-btn ap-btn-primary" type="button" data-close>Done</button>');
      $('[data-close]', d.el).focus();
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

/* Certificates */
const certRoutes = c => D.routes.filter(r => (c.host.startsWith('*.') ? r.host.endsWith(c.host.slice(1)) && r.host.split('.').length === c.host.split('.').length : r.host === c.host));
route('/certificates', () => {
  const failing = D.certs.filter(c => certTone(c) !== 'ok');
  const sorted = [...D.certs].sort((a, b) => a.expires - b.expires);
  return {
    title: 'Certificates',
    html: `${pageHead({ title: 'Certificates', sub: "Automatic certificates come from Let's Encrypt and renew 30 days before they expire. Upload your own for wildcards and internal CAs.", actions: `<button class="ap-btn ap-btn-primary" type="button" data-upload data-write>${icon('upload')}Upload certificate</button>` })}
${failing.map(c => banner('warn', `Renewal is failing for ${esc(c.host)}`, `It expires in ${Math.round((c.expires - NOW) / DAY)} days. Apiary retries every 6 hours, and warns again 7 days before it expires.`, `<a href="#/certificates/${encodeURIComponent(c.host)}">See why</a>`)).join('')}
<section class="ap-panel">${D.certs.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Certificates, soonest to expire first</caption><thead><tr><th scope="col">Hostname</th><th scope="col">Source</th><th scope="col">Issuer</th><th scope="col" aria-sort="ascending"><span class="ap-sort">Expires ${icon('arrow-up')}</span></th><th scope="col">Status</th><th scope="col" class="ap-num">Routes</th></tr></thead><tbody>
${sorted.map(c => { const left = Math.round((c.expires - NOW) / DAY); const tone = certTone(c); return `<tr><td><div class="ap-cell-main"><a class="ap-data" href="#/certificates/${encodeURIComponent(c.host)}">${esc(c.host)}</a></div></td><td class="ap-muted">${c.source === 'auto' ? 'Automatic' : 'Uploaded'}</td><td class="ap-muted">${esc(c.issuer)}</td><td><span class="ap-data">${fmtDate(c.expires, false)}</span></td><td>${status(tone, tone === 'ok' ? `${left} days left` : `${c.note}, ${left} days left`)}</td><td class="ap-num">${certRoutes(c).length}</td></tr>`; }).join('')}
</tbody></table></div>` : emptyState('No certificates yet', 'Add a route with an automatic certificate, or upload your own for a wildcard or internal hostname.', `<button class="ap-btn ap-btn-primary" type="button" data-upload data-write>${icon('upload')}Upload certificate</button>`)}</section>`,
    mount(el) { $$('[data-upload]', el).forEach(b => b.addEventListener('click', () => uploadDialog())); },
  };
});

route('/certificates/:host', host => {
  const c = D.certs.find(x => x.host === host);
  if (!c) return notFound();
  const rs = certRoutes(c), tone = certTone(c), left = Math.round((c.expires - NOW) / DAY);
  const failing = c.note === 'Renewal failed';
  const log = c.source === 'auto' ? (failing ? [
    [NOW - 40 * MIN, true, 'Challenge failed', 'legacy.example.com resolves to 203.0.113.50, which isn\'t an edge node'],
    [NOW - 6 * HOUR - 40 * MIN, true, 'Challenge failed', 'Same as above. Next try at 18:00 UTC.'],
    [NOW - 21 * DAY, false, 'Renewal window opened', '30 days before expiry'],
    [c.issued, false, 'Issued', "Let's Encrypt R10, valid 90 days"],
  ] : [[c.issued, false, 'Issued', `${c.issuer}, valid 90 days`]]) : [[c.issued, false, 'Uploaded', 'By ' + (c.by || 'ana@example.com')]];
  return {
    title: c.host,
    html: `${pageHead({ crumbs: [['Certificates', '#/certificates']], title: c.host, sub: status(tone, `${left} days left`) + ` &nbsp;·&nbsp; ${c.source === 'auto' ? 'Automatic' : 'Uploaded'}`, actions: c.source === 'auto' ? `<button class="ap-btn ap-btn-primary" type="button" data-renew data-write>${icon('refresh-cw')}Renew now</button>` : `<button class="ap-btn" type="button" data-replace data-write>${icon('upload')}Replace…</button>` })}
${failing ? banner('critical', 'Renewal fails because the DNS points elsewhere', `Let's Encrypt checks the hostname by fetching a file from it on port 80. <span class="ap-code">${esc(c.host)}</span> resolves to <span class="ap-code">203.0.113.50</span>, which isn't one of your edge nodes, so the check never reaches Apiary.`, '<span>To fix it, point the hostname\'s A record at your edge nodes, wait for DNS to update, then renew now.</span>') : ''}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="cd-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="cd-t">Details</h2></div><div class="ap-panel-body">
<dl class="ap-kv"><dt>Covers</dt><dd class="ap-data">${esc(c.host)}${c.host.startsWith('*.') ? `, ${esc(c.host.slice(2))}` : ''}</dd><dt>Issuer</dt><dd>${esc(c.issuer)}</dd><dt>Issued</dt><dd><span class="ap-data">${fmtDate(c.issued)}</span> UTC</dd><dt>Expires</dt><dd><span class="ap-data">${fmtDate(c.expires)}</span> UTC</dd><dt>Renewal</dt><dd>${c.source === 'auto' ? `From <span class="ap-data">${fmtDate(c.expires - 30 * DAY, false)}</span>, every 6 hours until it works` : 'Manual: upload a new one before it expires'}</dd>
<dt>Used by</dt><dd>${rs.length ? rs.map(r => `<a class="ap-data" href="#/routes/${r.id}">${esc(routeLabel(r))}</a>`).join('<br>') : 'No routes'}</dd></dl></div>
<div class="ap-panel-foot ap-row" style="justify-content:space-between"><span class="ap-caption">Keys never leave the cluster, and are encrypted with the root key.</span><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-del data-write style="color:var(--critical)">Delete…</button></div></section>
<section class="ap-panel" aria-labelledby="cl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="cl-t">${c.source === 'auto' ? 'Renewal log' : 'History'}</h2></div><div class="ap-panel-body" style="padding-block:4px" data-log>
<ol class="ap-timeline">${log.map(([at, bad, t, m]) => `<li class="ap-event${bad ? ' ap-event-denied' : ''}"><span class="ap-dot" aria-hidden="true"></span><div><div>${esc(t)}</div><div class="ap-event-meta">${esc(m)}</div></div><time>${fmtDate(at)}</time></li>`).join('')}</ol></div></section></div>`,
    mount(el) {
      const renew = $('[data-renew]', el);
      if (renew) renew.addEventListener('click', async () => {
        try {
          await run(renew, 'Renewing…', async () => {
            await api('write', Proto.state.network === 'slow' ? 3500 : 1800);
            if (failing) throw new ApiError('Renewal failed', 'legacy.example.com still resolves to 203.0.113.50. Nothing changed; the current certificate keeps working for ' + left + ' days.');
          });
          Object.assign(c, { issued: NOW, expires: NOW + 90 * DAY, note: 'Renewed just now', issuer: "Let's Encrypt R11" });
          refresh();
          toast(`Valid until ${fmtDate(c.expires, false)}. Replicas pick it up within a minute.`, { title: 'Certificate renewed' });
        } catch (err) { toast(err.detail, { tone: 'error', title: err.title }); }
      });
      const rep = $('[data-replace]', el);
      if (rep) rep.addEventListener('click', () => uploadDialog(c));
      $('[data-del]', el).addEventListener('click', () => {
        if (rs.length) return dialog({ title: "This certificate is in use", mark: ['warn', 'triangle-alert'], role: 'alertdialog', describe: true, body: `<p style="margin:0">${plural(rs.length, 'route')} use${rs.length === 1 ? 's' : ''} it: ${rs.map(r => `<span class="ap-data">${esc(routeLabel(r))}</span>`).join(', ')}. Change their certificate first, or delete them.</p>`, foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>OK</button>' });
        confirmDialog({ title: `Delete the certificate for ${esc(c.host)}?`, text: 'No route uses it. Its private key is deleted from every replica.', confirm: 'Delete certificate', busy: 'Deleting…', onConfirm: async () => { await api(); D.certs.splice(D.certs.indexOf(c), 1); go('/certificates'); toast('Certificate deleted.'); } });
      });
    },
  };
});

/* Upload: files or pasted PEM, checked here first, then by the server, then confirmed */
function uploadDialog(replacing) {
  const d = dialog({
    title: replacing ? `Replace the certificate for ${esc(replacing.host)}` : 'Upload certificate', size: 'lg', backdrop: false,
    body: `<form class="ap-form" id="up-form" novalidate style="gap:16px"><div data-summary></div>
<div class="ap-seg" role="group" aria-label="How to add it" data-mode style="align-self:flex-start"><button type="button" aria-pressed="true" data-v="files">Choose files</button><button type="button" aria-pressed="false" data-v="paste">Paste text</button></div>
<div data-files class="ap-stack" style="gap:16px">
${dropField('certFile', 'Certificate and chain', '.pem, .crt or .cer, leaf certificate first')}
${dropField('keyFile', 'Private key', '.pem or .key, not protected by a passphrase')}</div>
<div data-paste class="ap-stack" style="gap:16px" hidden>
${field({ name: 'certText', label: 'Certificate and chain', control: textarea('certText', '', 'rows="5" placeholder="-----BEGIN CERTIFICATE-----"') })}
${field({ name: 'keyText', label: 'Private key', control: textarea('keyText', '', 'rows="4" placeholder="-----BEGIN PRIVATE KEY-----"') })}</div>
<p class="ap-caption" style="margin:0">Prototype: any text with the right BEGIN line passes. Put "mismatch" in the key to see the server reject it.</p>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="up-form" data-busy="Checking…" data-write>Continue</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#up-form', d.el);
  let mode = 'files';
  $('[data-mode]', f).addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    mode = b.dataset.v;
    $$('[data-mode] button', f).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    $('[data-files]', f).hidden = mode !== 'files';
    $('[data-paste]', f).hidden = mode !== 'paste';
  });
  const texts = {};
  $$('.ap-drop', f).forEach(drop => {
    const input = $('input', drop), name = input.name;
    const show = file => {
      const out = drop.parentElement.querySelector('[data-picked]');
      out.innerHTML = file ? `<div class="ap-file">${icon('file-key')}<span>${esc(file.name)}</span><span class="ap-caption" style="flex:none">${(file.size / 1024).toFixed(1)} KB</span><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Remove ${esc(file.name)}" data-unpick>${icon('x')}</button></div>` : '';
      drop.hidden = !!file;
      paint();
      if (file) { const rd = new FileReader(); rd.onload = () => { texts[name] = String(rd.result); input.dispatchEvent(new Event('change', { bubbles: true })); }; rd.readAsText(file.slice(0, 200000)); }
    };
    input.addEventListener('change', e => { if (e.isTrusted) show(input.files[0]); });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.dataset.over = ''; });
    drop.addEventListener('dragleave', () => { delete drop.dataset.over; });
    drop.addEventListener('drop', e => { e.preventDefault(); delete drop.dataset.over; input.files = e.dataTransfer.files; show(input.files[0]); });
    drop.parentElement.addEventListener('click', e => { if (e.target.closest('[data-unpick]')) { input.value = ''; delete texts[name]; show(null); input.focus(); } });
  });
  const pem = (txt, kind) => (kind === 'cert' ? /-----BEGIN CERTIFICATE-----/.test(txt) : /-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(txt));
  const fileRule = (kind, label) => v => {
    if (mode !== 'files') return null;
    if (!v) return `Choose the ${label} file.`;
    if (!/\.(pem|crt|cer|key)$/i.test(v.name)) return `${v.name} isn't a .pem, .crt, .cer or .key file.`;
    const t = texts[kind === 'cert' ? 'certFile' : 'keyFile'];
    if (t !== undefined && !pem(t, kind)) return kind === 'cert' ? `${v.name} doesn't contain a PEM certificate.` : `${v.name} doesn't contain a PEM private key.` + (/ENCRYPTED/.test(t) ? ' Remove its passphrase first.' : '');
    return null;
  };
  const textRule = (kind, label) => v => (mode !== 'paste' ? null : !String(v).trim() ? `Paste the ${label}.` : !pem(v, kind) ? (kind === 'cert' ? 'Paste a PEM certificate: it starts with -----BEGIN CERTIFICATE-----.' : 'Paste a PEM private key: it starts with -----BEGIN PRIVATE KEY-----.') : null);
  form(f, { certFile: fileRule('cert', 'certificate'), keyFile: fileRule('key', 'private key'), certText: textRule('cert', 'certificate'), keyText: textRule('key', 'private key') }, {
    verb: 'upload it',
    submit: async v => {
      await api();
      const key = mode === 'files' ? texts.keyFile || '' : v.keyText;
      if (/mismatch/i.test(key) || (v.keyFile && /mismatch/i.test(v.keyFile.name))) throw { field: mode === 'files' ? 'keyFile' : 'keyText', message: "This private key doesn't match the certificate. Check that both come from the same request." };
      const host = replacing ? replacing.host : '*.example.net';
      d.body(`<p style="margin:0">Check that this is the certificate you expect.</p><dl class="ap-kv"><dt>Covers</dt><dd class="ap-data">${esc(host)}${host.startsWith('*.') ? ', ' + esc(host.slice(2)) : ''}</dd><dt>Issuer</dt><dd>Example Internal CA</dd><dt>Valid</dt><dd><span class="ap-data">${fmtDate(NOW, false)}</span> to <span class="ap-data">${fmtDate(NOW + 365 * DAY, false)}</span></dd><dt>Chain</dt><dd>${status('ok', 'Complete, 2 certificates')}</dd></dl>`);
      d.foot(`<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="button" data-add data-write>${replacing ? 'Replace certificate' : 'Add certificate'}</button>`);
      const add = $('[data-add]', d.el);
      add.focus();
      add.addEventListener('click', () => quick(add, 'Adding…', () => api(), () => {
        if (replacing) Object.assign(replacing, { issued: NOW, expires: NOW + 365 * DAY, issuer: 'Example Internal CA', status: 'ok', note: '' });
        else D.certs.push({ host, source: 'uploaded', issuer: 'Example Internal CA', issued: NOW, expires: NOW + 365 * DAY, status: 'ok', by: D.me.email });
        d.close();
        refresh();
        toast(`${host} is ready to use in routes.`, { title: replacing ? 'Certificate replaced' : 'Certificate added' });
      }));
    },
  });
}
function dropField(name, label, help) {
  return `<div class="ap-field" data-field="${name}"><span class="ap-label" id="l-${name}">${label}</span><div data-picked></div><label class="ap-drop">${icon('upload')}<span><strong>Choose a file</strong> or drop it here</span><span class="ap-caption">${help}</span><input type="file" name="${name}" accept=".pem,.crt,.cer,.key" aria-labelledby="l-${name}" aria-describedby="e-${name}"></label><span class="ap-error" id="e-${name}" hidden></span></div>`;
}

/* Redirects */
route('/redirects', () => ({
  title: 'Redirects',
  html: `${pageHead({ title: 'Redirects', sub: 'Send one hostname to another address, such as www.example.com to example.com.', actions: D.redirects.length ? `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add redirect</button>` : '' })}
<section class="ap-panel">${D.redirects.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Redirects</caption><thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Status code</th><th scope="col">Path</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.redirects.map((x, i) => `<tr><td class="ap-data">${esc(x.from)}</td><td class="ap-data ap-muted">${esc(x.to)}</td><td><span class="ap-tag">${x.code}</span> <span class="ap-muted">${{ 301: 'Permanent', 308: 'Permanent, keeps method', 302: 'Temporary', 307: 'Temporary, keeps method' }[x.code]}</span></td><td class="ap-muted">${x.keepPath ? 'Kept' : 'Dropped'}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete redirect from ${esc(x.from)}" data-del="${i}" data-write>${icon('trash-2')}</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No redirects yet', 'A redirect sends one hostname to another, such as <span class="ap-code">www.example.com</span> to <span class="ap-code">example.com</span>, with a 301 or 308.', `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add redirect</button>`)}</section>`,
  mount(el) {
    $$('[data-add]', el).forEach(b => b.addEventListener('click', redirectDialog));
    $$('[data-del]', el).forEach(b => b.addEventListener('click', () => {
      const x = D.redirects[+b.dataset.del];
      confirmDialog({ title: `Delete the redirect from ${esc(x.from)}?`, text: 'Requests to it get a 404 at once. Browsers may remember a permanent redirect for a while.', confirm: 'Delete redirect', busy: 'Deleting…', onConfirm: async () => { await api(); D.redirects.splice(+b.dataset.del, 1); refresh(); toast('Redirect deleted.', { action: 'Undo', onAction: () => { D.redirects.push(x); refresh(); } }); } });
    }));
  },
}));
function redirectDialog() {
  const d = dialog({
    title: 'Add redirect', backdrop: false,
    body: `<form class="ap-form" id="rd-form" novalidate style="gap:16px">
${field({ name: 'from', label: 'From hostname', data: true, placeholder: 'www.example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Gets an automatic certificate, so HTTPS visitors are redirected too.' })}
${field({ name: 'to', label: 'To', data: true, placeholder: 'https://example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none" inputmode="url"' })}
<fieldset class="ap-field" data-field="code" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Type</legend><div class="ap-stack" style="gap:10px">
${[[308, 'Permanent', 'Search engines move to the new address. Keeps POST requests as POST.'], [307, 'Temporary', 'Search engines keep the old address.']].map(([c, t, h], i) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="code" value="${c}"${i === 0 ? ' checked' : ''}><span class="ap-choice-text"><span>${t} <span class="ap-caption">${c}</span></span><span class="ap-help">${h}</span></span></label>`).join('')}</div><span class="ap-error" id="e-code" hidden></span></fieldset>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="keepPath" checked><span class="ap-choice-text"><span>Keep the path</span><span class="ap-help">www.example.com/shoes goes to example.com/shoes.</span></span></label>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rd-form" data-busy="Adding…" data-write>Add redirect</button>`,
  });
  applyWriteLock(d.el);
  form($('#rd-form', d.el), {
    from: v => {
      const m = V.hostname(v, { wildcard: false });
      if (m) return m;
      const h = String(v).trim().toLowerCase();
      if (D.routes.some(r => r.host === h)) return `${h} is already a route. A hostname can be a route or a redirect, not both.`;
      if (D.redirects.some(r => r.from === h)) return `${h} already redirects.`;
      return null;
    },
    to: (v, all) => {
      const s = String(v).trim();
      if (!s) return 'Enter the address to send visitors to.';
      let u;
      try { u = new URL(s); } catch (e) { return 'Enter a full address that starts with https://, such as https://example.com.'; }
      if (!/^https?:$/.test(u.protocol)) return 'Use an http:// or https:// address.';
      if (u.hostname === String(all.from).trim().toLowerCase()) return 'That would send visitors back to the same hostname, in a loop.';
      return null;
    },
  }, {
    links: { from: ['to'] },
    submit: async v => {
      await api();
      D.redirects.push({ from: v.from.trim().toLowerCase(), to: v.to.trim(), code: +v.code, keepPath: v.keepPath });
      d.close();
      refresh();
      toast(`${v.from.trim().toLowerCase()} now redirects to ${v.to.trim()}.`, { title: 'Redirect added' });
    },
  });
}
