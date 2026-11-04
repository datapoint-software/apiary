/* Idea being tried: visitor pages carry the operator's brand (logo, name, accent color, contact line), and a project
   can have its own, such as one project per client. Every page ends with a small "Powered by Apiary" line, which a
   commercial license can remove. */

const brandOf = projectId => (projectId && projectOf(projectId) && projectOf(projectId).brand) || D.brand || null;

/* Button text is white or near-black, whichever reads better on the accent, so every accent color meets WCAG AA. */
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const onAccent = hex => (contrast(hex, '#FFFFFF') >= contrast(hex, '#111111') ? '#FFFFFF' : '#111111');

/* The frame of every visitor page: brand at the top, the page, the contact line, and "Powered by Apiary". */
/* note: a prototype-only remark, kept last so it doesn't read as part of the page. */
function visitorPage(brand, inner, { width = '26rem', attrs = '', note = '' } = {}) {
  return `<div style="font:16px/1.5 var(--font-text);display:grid;grid-template-rows:1fr auto;min-height:100vh;background:var(--ground);color:var(--ink)">
<div style="display:grid;place-items:center"><main style="width:100%;max-width:${width};padding:var(--space-6);box-sizing:border-box"${attrs}>
${brand ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:var(--space-6)" translate="no">${brand.logo ? `<img src="${brand.logo}" alt="" style="height:32px;width:auto">` : ''}<span style="font-weight:600">${esc(brand.name)}</span></div>` : ''}
<div data-visitor-body>${inner}</div>
${brand && brand.contact ? `<p style="margin:var(--space-6) 0 0;font-size:0.875rem;color:var(--ink-2)" translate="no">${esc(brand.contact)}</p>` : ''}
${note}
</main></div>
${poweredBy()}</div>`;
}
/* The Datapoint logo, then the Apiary mark and "Powered by Apiary", inline so the page needs no stylesheet. */
const datapointLogo = (w = 64) => $('[data-dp-logo]').innerHTML.replace('<svg', `<svg style="width:${w}px;height:auto;display:block"`);
const poweredBy = ({ small = false } = {}) => `<footer style="padding:${small ? '0' : 'var(--space-6) var(--space-4) var(--space-8)'};display:flex;justify-content:center;align-items:center;gap:${small ? '8px' : '14px'};font-size:${small ? '0.6875rem' : '0.8125rem'};color:var(--ink-3)${small ? ';margin-top:18px' : ''}">
<a href="https://datapoint.software/"${small ? ' target="_blank" rel="noopener"' : ''} style="color:var(--ink-2)">${datapointLogo(small ? 52 : 88)}</a>
<span aria-hidden="true" style="width:1px;height:${small ? 12 : 18}px;background:var(--line-strong)"></span>
<a href="https://apiary.datapoint.software/"${small ? ' target="_blank" rel="noopener"' : ''} style="display:inline-flex;align-items:center;gap:${small ? 6 : 8}px;color:inherit;text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px"><span aria-hidden="true" style="width:${small ? 10 : 16}px;height:${small ? 9 : 14}px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:var(--honey)"></span>Powered by Apiary</a></footer>`;
const visitorButton = brand => {
  const bg = brand ? brand.accent : '#1C1C1E';
  return `font:600 1rem/1.5 var(--font-text);margin-top:var(--space-2);padding:10px 16px;border:0;border-radius:var(--radius-2);background:${bg};color:${onAccent(bg)};cursor:pointer`;
};

const VISITOR_PREVIEWS = [['not-found', 'Not found'], ['unavailable', 'Unavailable'], ['maintenance', 'Maintenance'], ['not-allowed', 'Not allowed'], ['too-many-requests', 'Too many requests'], ['starting', 'Starting'], ['password', 'Password'], ['link', 'Sign-in link']];

function brandSummary(b) {
  return `<div style="display:flex;gap:14px;align-items:center;min-width:0">${b.logo ? `<img src="${b.logo}" alt="" style="height:40px;width:40px;object-fit:contain;flex:none">` : `<span class="ap-avatar" aria-hidden="true" style="width:40px;height:40px;flex:none">${esc(initialsOf(b.name))}</span>`}
<div class="ap-cell-main" style="min-width:0"><strong translate="no">${esc(b.name)}</strong><span class="ap-caption" translate="no">${b.contact ? esc(b.contact) : 'No contact line'}</span></div></div>`;
}
const swatch = hex => `<span style="display:inline-flex;align-items:center;gap:8px"><span aria-hidden="true" style="width:16px;height:16px;border-radius:4px;background:${hex};box-shadow:inset 0 0 0 1px var(--line)"></span><span class="ap-data">${hex.toUpperCase()}</span></span>`;

route('/visitor-pages', () => {
  const ops = canOperate();
  const own = D.projects.filter(p => p.brand);
  const others = D.projects.filter(p => !p.brand);
  const b = D.brand;
  const previews = target => `<div class="ap-row" style="flex-wrap:wrap;gap:8px">${VISITOR_PREVIEWS.map(([k, t]) => `<a class="ap-btn ap-btn-sm" href="#/public/${k}/${target}">${t}</a>`).join('')}</div>`;
  return {
    title: 'Visitor pages',
    html: `${pageHead({ title: 'Visitor pages', sub: 'What visitors see when Apiary answers instead of a site: an unknown address, a disabled route, maintenance, or a password. Each page ends with a small “Powered by Apiary” line.' })}
<section class="ap-panel" aria-labelledby="vb-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="vb-t">Cluster brand</h2><p class="ap-panel-desc">On every visitor page, including addresses with no route, unless the route’s project has its own.</p></div>${b && ops ? `<div class="ap-row"><button class="ap-btn" type="button" data-brand-remove="" data-write>Remove…</button><button class="ap-btn" type="button" data-brand-edit="" data-write>Edit…</button></div>` : ''}</div>
<div class="ap-panel-body ap-stack">${b ? `<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center">${brandSummary(b)}<div class="ap-cell-main" style="align-items:flex-end">${swatch(b.accent)}<span class="ap-caption">Changed ${ago(b.changed[0])} by ${esc(b.changed[1])}</span></div></div>
<div class="ap-field"><span class="ap-label">See the pages with this brand</span>${previews('cluster')}</div>`
    : emptyState('No brand yet', 'Visitor pages show only their message and “Powered by Apiary”. Add your logo, name and colors so visitors know who runs the site.', ops ? '<button class="ap-btn ap-btn-primary" type="button" data-brand-edit="" data-write>Set up the brand</button>' : '')}</div></section>

<section class="ap-panel" aria-labelledby="vp-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="vp-t">Projects with their own brand</h2><p class="ap-panel-desc">For a project that belongs to a client, so its visitors see the client’s brand.</p></div>${ops && others.length && own.length ? `<button class="ap-btn" type="button" data-brand-add data-write>${icon('plus')}Give a project its own brand</button>` : ''}</div>
${own.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Projects with their own brand</caption><thead><tr><th scope="col">Project</th><th scope="col">Brand</th><th scope="col">Accent color</th><th scope="col">Changed</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${own.map(p => `<tr><td><a href="#/projects/${p.id}">${esc(p.name)}</a></td><td>${brandSummary(p.brand)}</td><td>${swatch(p.brand.accent)}</td><td class="ap-muted">${ago(p.brand.changed[0])} by ${esc(p.brand.changed[1])}</td>
<td class="ap-col-actions"><div class="ap-row" style="justify-content:flex-end;gap:4px;flex-wrap:nowrap"><a class="ap-btn ap-btn-sm ap-btn-ghost" href="#/public/password/${p.id}">Preview</a>${ops ? `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Edit the brand of ${esc(p.name)}" data-brand-edit="${p.id}" data-write>${icon('pencil')}</button><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Remove the brand of ${esc(p.name)}" data-brand-remove="${p.id}" data-write>${icon('trash-2')}</button>` : ''}</div></td></tr>`).join('')}
</tbody></table></div>` : `<div class="ap-panel-body">${emptyState('Every project uses the cluster brand', 'Give a project its own brand when it belongs to a client.', ops && others.length ? `<button class="ap-btn" type="button" data-brand-add data-write>${icon('plus')}Give a project its own brand</button>` : '')}</div>`}
</section>`,
    mount(el) {
      $$('[data-brand-edit]', el).forEach(btn => btn.addEventListener('click', () => brandDialog(btn.dataset.brandEdit || null)));
      $$('[data-brand-add]', el).forEach(btn => btn.addEventListener('click', () => brandDialog(null, true)));
      $$('[data-brand-remove]', el).forEach(btn => btn.addEventListener('click', () => {
        const p = btn.dataset.brandRemove ? projectOf(btn.dataset.brandRemove) : null;
        confirmDialog({
          title: p ? `Remove the brand of ${esc(p.name)}?` : 'Remove the cluster brand?',
          text: p ? 'Its visitor pages use the cluster brand again.' : 'Visitor pages without a project brand show only their message and “Powered by Apiary”.',
          confirm: 'Remove brand', busy: 'Removing…',
          onConfirm: async () => { await api(); if (p) delete p.brand; else D.brand = null; refresh(); toast(p ? `${p.name} uses the cluster brand again.` : 'The cluster brand was removed.'); },
        });
      }));
    },
  };
});

/* Edits the cluster brand (projectId null), a project's brand, or gives a project one (adding). */
function brandDialog(projectId, adding) {
  const p = projectId ? projectOf(projectId) : null;
  const cur = (p ? p.brand : adding ? null : D.brand) || { name: '', logo: null, logoName: '', accent: '#1D4ED8', contact: '' };
  let logo = cur.logo, logoName = cur.logoName, logoError = null;
  const choices = D.projects.filter(x => !x.brand);
  const title = adding ? 'Give a project its own brand' : p ? `Brand of ${esc(p.name)}` : D.brand ? 'Cluster brand' : 'Set up the brand';
  const d = dialog({
    title, size: 'xl', backdrop: false,
    body: `<form class="ap-form" id="br-form" novalidate style="gap:16px"><div data-summary></div>
<div class="ap-grid-2" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start"><div class="ap-stack" style="gap:16px">
${adding ? field({ name: 'project', label: 'Project', control: select('project', [['', 'Choose a project'], ...choices.map(x => [x.id, x.name])], '') }) : ''}
${field({ name: 'name', label: 'Name', value: cur.name, placeholder: 'Example Lda.', attrs: 'autocomplete="off"', help: 'Next to the logo, and the alternative text for it.' })}
<div class="ap-field" data-field="logo"><span class="ap-label">Logo <span class="ap-optional">(optional)</span></span>
<div data-logo-current></div>
<label class="ap-drop" data-logo-drop>${icon('image-up')}<span><strong>Choose a file</strong> or drop it here</span><span class="ap-caption">PNG, WebP or SVG, up to 100 KB</span><input type="file" accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml"></label>
<span class="ap-help" id="h-logo">Shown 32 pixels high, on light and dark backgrounds, so choose one that works on both.</span><span class="ap-error" id="e-logo" hidden></span></div>
<div class="ap-field" data-field="accent"><label class="ap-label" for="f-accent">Accent color</label><div class="ap-row" style="gap:8px"><input type="color" value="${cur.accent}" aria-label="Pick the accent color" data-accent-pick style="width:44px;height:36px;padding:0;border:0;background:none;cursor:pointer"><input class="ap-input ap-data" id="f-accent" name="accent" value="${cur.accent.toUpperCase()}" style="max-width:140px" autocomplete="off" spellcheck="false" aria-describedby="h-accent e-accent"></div><span class="ap-help" id="h-accent">For buttons. Apiary picks white or black text, whichever reads better on it.</span><span class="ap-error" id="e-accent" hidden></span></div>
${field({ name: 'contact', label: 'Contact line', optional: true, value: cur.contact, placeholder: 'Questions? Write to help@example.com.', help: 'Up to 120 characters, on every page. Error pages tell visitors to contact whoever runs the site, so say how.' })}
</div>
<div class="ap-field"><span class="ap-label">Preview</span><div data-brand-preview style="border-radius:var(--radius-2);box-shadow:inset 0 0 0 1px var(--line);background:var(--ground);padding:20px 18px 10px;font-size:0.875rem"></div></div></div>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="br-form" data-busy="Saving…" data-write>Save brand</button>`,
  });
  applyWriteLock(d.el);
  const f = $('#br-form', d.el), pick = $('[data-accent-pick]', d.el);
  const hexOk = s => /^#[0-9a-f]{6}$/i.test(String(s).trim());
  function draw() {
    const name = f.elements.name.value.trim() || 'Your name', accent = hexOk(f.elements.accent.value) ? f.elements.accent.value.trim() : '#1C1C1E';
    $('[data-brand-preview]', d.el).innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">${logo ? `<img src="${logo}" alt="" style="height:22px;width:auto">` : ''}<strong translate="no">${esc(name)}</strong></div>
<div style="font:600 1rem/1.3 var(--font-display);margin-bottom:4px">Restricted access</div><div style="color:var(--ink-2);margin-bottom:12px">Enter the password you were given.</div>
<div style="height:30px;border-radius:var(--radius-1);box-shadow:inset 0 0 0 1px var(--line-strong);background:var(--surface);margin-bottom:8px"></div>
<div style="text-align:center;font-weight:600;padding:6px;border-radius:var(--radius-1);background:${accent};color:${onAccent(accent)}">Continue</div>
${f.elements.contact.value.trim() ? `<div style="color:var(--ink-2);margin-top:14px" translate="no">${esc(f.elements.contact.value.trim())}</div>` : ''}
${poweredBy({ small: true })}`;
    $('[data-logo-current]', d.el).innerHTML = logo ? `<div class="ap-row" style="gap:10px;margin-bottom:8px"><img src="${logo}" alt="" style="height:32px;width:auto"><span class="ap-caption ap-data" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(logoName || '')}</span><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-logo-remove>Remove logo</button></div>` : '';
    $('[data-logo-drop]', d.el).hidden = !!logo;
    $('[data-logo-remove]', d.el)?.addEventListener('click', () => { logo = null; logoName = ''; draw(); });
    const err = $('#e-logo', d.el); err.textContent = logoError || ''; err.hidden = !logoError;
  }
  const readLogo = file => {
    logoError = !/^image\/(png|webp|svg\+xml)$/.test(file.type) ? 'Choose a PNG, WebP or SVG file.' : file.size > 100 * 1024 ? `This file is ${Math.ceil(file.size / 1024)} KB. Choose one up to 100 KB.` : null;
    if (logoError) { draw(); return; }
    const reader = new FileReader();
    reader.onload = () => { logo = reader.result; logoName = file.name; draw(); };
    reader.readAsDataURL(file);
  };
  const zone = $('[data-logo-drop]', d.el), input = $('input', zone);
  input.addEventListener('change', () => { const file = input.files[0]; input.value = ''; if (file) readLogo(file); });
  zone.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); zone.dataset.over = ''; } });
  zone.addEventListener('dragleave', () => { delete zone.dataset.over; });
  zone.addEventListener('drop', e => { delete zone.dataset.over; const file = e.dataTransfer.files[0]; if (file) { e.preventDefault(); readLogo(file); } });
  pick.addEventListener('input', () => { f.elements.accent.value = pick.value.toUpperCase(); f.elements.accent.dispatchEvent(new Event('input', { bubbles: true })); });
  f.addEventListener('input', e => { if (e.target.name === 'accent' && hexOk(e.target.value)) pick.value = e.target.value.trim(); draw(); });
  draw();
  form(f, {
    project: v => (adding && !v ? 'Choose a project.' : null),
    name: v => (!String(v).trim() ? 'Enter a name, such as Example Lda.' : String(v).trim().length > 60 ? 'Use at most 60 characters.' : null),
    accent: v => (hexOk(v) ? null : 'Enter a color like #1D4ED8, or pick one.'),
    contact: v => (String(v).trim().length > 120 ? 'Use at most 120 characters.' : null),
  }, {
    verb: 'save it',
    submit: async v => {
      if (logoError) { $('#e-logo', d.el).focus?.(); return; }
      await api();
      const target = adding ? projectOf(v.project) : p;
      const next = { name: v.name.trim(), logo, logoName, accent: v.accent.trim().toUpperCase(), contact: v.contact.trim(), changed: [NOW, D.me.email] };
      if (target) target.brand = next; else D.brand = next;
      d.close();
      refresh();
      toast(target ? `${target.name} has its own brand now.` : 'Brand saved. Visitor pages use it now.', { title: 'Brand saved' });
    },
  });
}
