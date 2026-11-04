"""Writes the Shell and DisplaySettings cards of the Apiary Design System.

Run through design/tools/build.py."""
import os
import re
import sys

PROJECT, LOGO_FILE = sys.argv[1:3]
LUCIDE = "https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"


def icon(name):
    return f'<i data-lucide="{name}" class="ap-icon" aria-hidden="true"></i>'


logo = open(LOGO_FILE).read()
logo = re.sub(r"<title>.*?</title>\s*", "", logo, flags=re.S)
logo = logo.replace('role="img" aria-label="Datapoint Software"', 'role="img" aria-label="Datapoint Software" focusable="false"')
logo = re.sub(r' width="628" height="156"', "", logo)

# The Shell card shows the sidebar with Overview selected; the prototype builds the same sidebar from its data.
NAV = [
    ("", [("layout-dashboard", "Overview", None, True)]),
    ("Projects", [("shopping-bag", "Shop", "9", False), ("credit-card", "Payments API", "6", False), ("wrench", "Internal tools", "14", False), ("archive", "Legacy", "critical", False), ("plus", "New project", None, False)]),
    ("Traffic", [("route", "All routes", "42", False), ("cable", "Stream routes", "4", False),
                 ("shield-check", "Certificates", "warn", False), ("corner-up-right", "Redirects", None, False)]),
    ("Cluster", [("hexagon", "Replicas", None, False), ("archive", "Backups", None, False), ("key-round", "Root key", None, False)]),
    ("Access", [("users", "Users", None, False), ("bot", "Connected agents", "2", False), ("scroll-text", "Audit log", None, False)]),
]


def sidebar(attribution=True):
    groups = []
    for title, items in NAV:
        links = []
        for ic, label, badge, current in items:
            extra = ""
            if badge in ("warn", "critical"):
                extra = f'<span class="ap-dot" style="color:var(--{badge})" aria-hidden="true"></span><span class="ap-sr">, needs attention</span>'
            elif badge:
                extra = f'<span class="ap-count"><span class="ap-sr">, </span>{badge}</span>'
            cur = ' aria-current="page"' if current else ""
            links.append(f'<a class="ap-nav-item" href="#" data-label="{label}"{cur}>{icon(ic)}<span class="ap-nav-label">{label}</span>{extra}</a>')
        head = f'<span class="ap-overline" aria-hidden="true">{title}</span>' if title else ""
        groups.append(f'<nav class="ap-nav" aria-label="{title or "Main"}">{head}{"".join(links)}</nav>')
    foot = ""
    if attribution:
        foot = f"""<div class="ap-side-foot">
<nav class="ap-nav" aria-label="Help"><button class="ap-nav-item ap-nav-button" type="button" data-label="About Apiary" data-about>{icon("info")}<span class="ap-nav-label">About Apiary</span></button></nav></div>"""
    return f"""<aside class="ap-side" id="side" aria-label="Sidebar">
<div class="ap-side-head"><a class="ap-brand" href="#" aria-label="Apiary, Overview"><span class="ap-brand-mark" aria-hidden="true"></span><span class="ap-brand-name">Apiary</span></a></div>
{"".join(groups)}
{foot}
</aside>
<div class="ap-side-scrim" data-drawer-close aria-hidden="true"></div>"""


APP_FOOT = f"""<footer class="ap-app-foot">
<div class="ap-app-foot-row"><a href="https://datapoint.software/" aria-label="Datapoint Software" class="ap-app-foot-logo">{logo}</a><span class="ap-app-foot-sep" aria-hidden="true"></span>
<span><a href="https://apiary.datapoint.software/" class="ap-app-foot-apiary"><span class="ap-brand-mark" aria-hidden="true"></span>Apiary</a> 0.4.0 · <a href="#">AGPL-3.0</a> · <a href="#">Source</a></span></div>
<span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span>
</footer>"""

DISPLAY = '<div class="ap-popover" role="dialog" aria-modal="false" aria-labelledby="display-t" id="display" hidden style="right:0;top:calc(100% + 8px)">\n<h2 class="ap-h ap-h-3" id="display-t">Display and accessibility</h2>\n<div class="ap-setting"><span class="ap-label" id="set-theme">Appearance</span><div class="ap-seg" role="group" aria-labelledby="set-theme" data-setting="theme"><button type="button" aria-pressed="true" data-value="system">Automatic</button><button type="button" aria-pressed="false" data-value="light">Light</button><button type="button" aria-pressed="false" data-value="dark">Dark</button></div></div>\n<div class="ap-setting"><span class="ap-label" id="set-text">Text size</span><div class="ap-seg" role="group" aria-labelledby="set-text" data-setting="text"><button type="button" aria-pressed="true" data-value="default">Default</button><button type="button" aria-pressed="false" data-value="large">Large</button><button type="button" aria-pressed="false" data-value="larger">Larger</button></div></div>\n<div class="ap-setting"><span class="ap-label" id="set-contrast">Contrast</span><div class="ap-seg" role="group" aria-labelledby="set-contrast" data-setting="contrast"><button type="button" aria-pressed="true" data-value="system">Automatic</button><button type="button" aria-pressed="false" data-value="standard">Standard</button><button type="button" aria-pressed="false" data-value="more">More</button></div></div>\n<div class="ap-setting"><span class="ap-label" id="set-motion">Motion</span><div class="ap-seg" role="group" aria-labelledby="set-motion" data-setting="motion"><button type="button" aria-pressed="true" data-value="system">Automatic</button><button type="button" aria-pressed="false" data-value="standard">Standard</button><button type="button" aria-pressed="false" data-value="reduce">Reduced</button></div></div>\n<p class="ap-caption" style="margin:0">Automatic follows your device settings. Saved in this browser only.</p>\n</div>'

TOP = f"""<header class="ap-top">
<button class="ap-btn ap-btn-ghost ap-btn-icon ap-sidebar-btn" type="button" aria-controls="side" aria-expanded="true" aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl or ⌘ + B)" data-sidebar>{icon("panel-left")}</button>
<div class="ap-search" role="search">{icon("search")}<input class="ap-input" type="search" placeholder="Search routes, certificates, users" aria-label="Search"><span class="ap-kbd">⌘K</span></div>
<div class="ap-top-end">
<span class="ap-status ap-status-ok"><span class="ap-dot" aria-hidden="true"></span>3 of 3 voters<span class="ap-sr">, writes are accepted</span></span>
<div style="position:relative"><button class="ap-btn ap-btn-ghost ap-btn-icon" type="button" aria-label="Display and accessibility" aria-haspopup="dialog" aria-expanded="false" aria-controls="display" data-display>{icon("accessibility")}</button>{DISPLAY}</div>
<div style="position:relative"><button class="ap-avatar ap-avatar-btn" type="button" aria-label="Account: Ana Lopes" aria-haspopup="menu" aria-expanded="false" aria-controls="account" data-account>AL</button>
<div class="ap-menu ap-account" role="menu" aria-label="Account" id="account" hidden>
<div class="ap-menu-head"><span class="ap-avatar ap-avatar-lg" aria-hidden="true">AL</span><span><strong>Ana Lopes</strong><span class="ap-secondary">ana@example.com</span><span class="ap-secondary">Administrator</span></span></div>
<div class="ap-menu-sep" role="separator"></div>
<button class="ap-menu-item" role="menuitem" type="button">{icon("user-round")}Your account</button>
<button class="ap-menu-item" role="menuitem" type="button">{icon("shield-check")}Security</button>
<button class="ap-menu-item" role="menuitem" type="button">{icon("monitor-smartphone")}Active sessions</button>
<div class="ap-menu-sep" role="separator"></div>
<button class="ap-menu-item" role="menuitem" type="button" data-signout>{icon("log-out")}Sign out</button></div></div>
</div>
</header>"""

ABOUT = f"""<div class="ap-scrim" id="about" hidden>
<div class="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="about-t">
<div class="ap-dialog-head"><span class="ap-brand-mark" aria-hidden="true" style="display:block;margin-bottom:12px;width:28px;height:25px"></span><h2 class="ap-h ap-h-2" id="about-t">Apiary 0.4.0</h2></div>
<div class="ap-dialog-body"><div class="ap-attribution" style="font-size:0.8125rem;line-height:1.125rem;gap:10px"><span style="color:var(--ink-2)">{logo}</span>
<span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span>
<span>Free software under the <a href="#">GNU Affero General Public License, version 3</a>, with additional terms. This program comes with no warranty. <a href="#">Source code</a></span></div></div>
<div class="ap-dialog-foot"><button class="ap-btn" type="button" data-close>Close</button></div>
</div></div>"""

OVERLAYS = ABOUT + f"""<div class="ap-menu" role="menu" aria-label="Route actions" id="row-menu" hidden style="position:absolute;z-index:20">
<button class="ap-menu-item" role="menuitem" type="button">{icon("pencil")}Edit route</button>
<button class="ap-menu-item" role="menuitem" type="button">{icon("copy")}Duplicate</button>
<button class="ap-menu-item" role="menuitem" type="button">{icon("eraser")}Purge cache</button>
<div class="ap-menu-sep" role="separator"></div>
<button class="ap-menu-item ap-menu-danger" role="menuitem" type="button" data-delete>{icon("trash-2")}Delete route…</button></div>
<div class="ap-scrim" id="dlg" hidden>
<div class="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">
<div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="dlg-t">Delete route <span id="dlg-host">shop.example.com</span>?</h2></div>
<div class="ap-dialog-body"><p style="margin:0" id="dlg-d">Requests to this hostname will get a 404 on all 3 replicas as soon as you confirm. Its automatic certificate is kept for 30 days in case you add the route again.</p>
<div class="ap-field"><label class="ap-label" for="dlg-in">Type the hostname to confirm</label><input class="ap-input ap-data" id="dlg-in" autocomplete="off"></div></div>
<div class="ap-dialog-foot"><button class="ap-btn ap-btn-ghost" type="button" data-close>Keep route</button><button class="ap-btn ap-btn-danger" type="button" data-confirm disabled>Delete route</button></div>
</div></div>
<div id="toasts" aria-live="polite" style="position:fixed;right:max(16px, env(safe-area-inset-right, 0px));bottom:calc(16px + env(safe-area-inset-bottom, 0px));z-index:60;display:flex;flex-direction:column;gap:8px"></div>"""

SCRIPT = r"""<script src="LUCIDE"></script>
<script>
(function () {
  if (window.lucide) lucide.createIcons();
  var root = document.documentElement;
  var shell = document.querySelector('[data-shell]');
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('apiary.' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('apiary.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trap(container, e) {
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(container.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  /* Toasts, announced politely to screen readers */
  function toast(text) {
    var box = document.getElementById('toasts');
    var t = document.createElement('div');
    t.className = 'ap-toast';
    t.innerHTML = '<svg class="ap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg><span style="flex:1"></span>';
    t.lastChild.textContent = text;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 6000);
  }

  /* Sidebar: one button in the top bar collapses it on wide screens and opens it as a drawer on phones */
  var sideBtn = document.querySelector('[data-sidebar]');
  var side = document.getElementById('side');
  var phone = matchMedia('(max-width: 639px)');
  function label() {
    var open = phone.matches ? shell.getAttribute('data-drawer') === 'open' : shell.getAttribute('data-collapsed') !== 'true';
    var text = phone.matches ? (open ? 'Close navigation' : 'Open navigation') : (open ? 'Collapse sidebar' : 'Expand sidebar');
    sideBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    sideBtn.setAttribute('aria-label', text);
    sideBtn.title = phone.matches ? text : text + ' (Ctrl or \u2318 + B)';
  }
  function setCollapsed(on, save) {
    shell.setAttribute('data-collapsed', on ? 'true' : 'false');
    if (save) store.set('sidebarCollapsed', on);
    label();
  }
  function setDrawer(open) {
    shell.setAttribute('data-drawer', open ? 'open' : 'closed');
    label();
    if (open) { var f = side.querySelector('.ap-nav-item'); if (f) setTimeout(function () { f.focus(); }, 50); }
    else sideBtn.focus();
  }
  var saved = store.get('sidebarCollapsed');
  setCollapsed(saved === null ? innerWidth < 1024 : saved, false);
  requestAnimationFrame(function () { requestAnimationFrame(function () { shell.setAttribute('data-animate', ''); }); });
  sideBtn.addEventListener('click', function () {
    if (phone.matches) setDrawer(shell.getAttribute('data-drawer') !== 'open');
    else setCollapsed(shell.getAttribute('data-collapsed') !== 'true', true);
  });
  phone.addEventListener('change', label);
  document.querySelector('[data-drawer-close]').addEventListener('click', function () { setDrawer(false); });
  side.addEventListener('keydown', function (e) { if (phone.matches && shell.getAttribute('data-drawer') === 'open') trap(side, e); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !phone.matches) { e.preventDefault(); sideBtn.click(); }
  });

  /* Display and accessibility settings */
  var displayBtn = document.querySelector('[data-display]');
  var display = document.getElementById('display');
  var prefs = store.get('display') || {};
  function apply() {
    ['theme', 'text', 'contrast', 'motion'].forEach(function (k) {
      var v = prefs[k];
      if (!v || v === 'system' || v === 'default') root.removeAttribute('data-' + k);
      else root.setAttribute('data-' + k, v);
      var seg = display.querySelector('[data-setting="' + k + '"]');
      var cur = v || seg.querySelector('button').getAttribute('data-value');
      seg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === cur ? 'true' : 'false'); });
    });
  }
  apply();
  display.addEventListener('click', function (e) {
    var b = e.target.closest('[data-value]'); if (!b) return;
    prefs[b.parentElement.getAttribute('data-setting')] = b.getAttribute('data-value');
    store.set('display', prefs); apply();
  });
  function setDisplay(open) {
    display.hidden = !open;
    displayBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) display.querySelector('[aria-pressed="true"]').focus(); else displayBtn.focus();
  }
  displayBtn.addEventListener('click', function () { setDisplay(display.hidden); });
  document.addEventListener('click', function (e) {
    if (!display.hidden && !e.target.closest('#display') && !e.target.closest('[data-display]')) { display.hidden = true; displayBtn.setAttribute('aria-expanded', 'false'); }
  });

  /* Segmented controls: one pressed button per group */
  document.querySelectorAll('.ap-seg:not([data-setting])').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });

  /* Tabs: ARIA tabs with arrow keys, Home and End */
  document.querySelectorAll('[role=tablist]').forEach(function (list, li) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role=tab]'));
    var scope = list.parentElement;
    tabs.forEach(function (tab, i) {
      tab.id = tab.id || 'tab-' + li + '-' + i;
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      var key = tab.getAttribute('data-tab');
      var panel = key && scope.querySelector('[data-panel="' + key + '"]');
      if (panel) { panel.id = 'panel-' + li + '-' + i; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); tab.setAttribute('aria-controls', panel.id); }
    });
    function select(tab) {
      tabs.forEach(function (x) { var on = x === tab; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
      var key = tab.getAttribute('data-tab');
      if (key) scope.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      tab.focus();
    }
    list.addEventListener('click', function (e) { var t = e.target.closest('[role=tab]'); if (t) select(t); });
    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement); if (i < 0) return;
      var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault(); select(tabs[(next + tabs.length) % tabs.length]);
    });
  });

  /* Project groups in tables */
  document.querySelectorAll('.ap-group-title').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.closest('tbody').querySelectorAll('tr:not(.ap-group)').forEach(function (r) { r.hidden = !open; });
    });
  });

  /* Row menu: arrow keys, Home, End, Escape */
  var menu = document.getElementById('row-menu'), current = null;
  var items = Array.prototype.slice.call(menu.querySelectorAll('.ap-menu-item'));
  items.forEach(function (it) { it.tabIndex = -1; });
  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    if (current) { current.setAttribute('aria-expanded', 'false'); if (refocus) current.focus(); }
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-menu]');
    if (opener) {
      if (current && current !== opener) current.setAttribute('aria-expanded', 'false');
      current = opener;
      opener.setAttribute('aria-expanded', 'true');
      var r = opener.getBoundingClientRect();
      menu.hidden = false;
      menu.style.top = (r.bottom + scrollY + 4) + 'px';
      menu.style.left = Math.max(16, r.right + scrollX - menu.offsetWidth) + 'px';
      items[0].focus();
      return;
    }
    if (!e.target.closest('#row-menu')) closeMenu(false);
  });
  menu.addEventListener('keydown', function (e) {
    var i = items.indexOf(document.activeElement);
    var next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next !== undefined) { e.preventDefault(); items[(next + items.length) % items.length].focus(); }
    if (e.key === 'Tab') closeMenu(false);
  });

  /* Dialogs: focus moves in, stays in, and returns */
  function openDialog(scrim, focusEl, opener) {
    scrim.hidden = false; scrim._opener = opener;
    (focusEl || scrim.querySelector(FOCUSABLE)).focus();
  }
  function closeDialog(scrim) { scrim.hidden = true; if (scrim._opener) scrim._opener.focus(); }
  document.querySelectorAll('.ap-scrim').forEach(function (scrim) {
    scrim.addEventListener('keydown', function (e) { trap(scrim, e); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim || e.target.closest('[data-close]')) closeDialog(scrim); });
  });
  var dlg = document.getElementById('dlg'), input = document.getElementById('dlg-in'), confirmBtn = dlg.querySelector('[data-confirm]'), host = '';
  menu.querySelector('[data-delete]').addEventListener('click', function () {
    closeMenu(false);
    var row = current && current.closest('tr');
    host = row ? row.querySelector('.ap-data').textContent : 'shop.example.com';
    document.getElementById('dlg-host').textContent = host;
    input.value = ''; confirmBtn.disabled = true;
    openDialog(dlg, input, current);
  });
  input.addEventListener('input', function () { confirmBtn.disabled = input.value.trim() !== host; });
  confirmBtn.addEventListener('click', function () { closeDialog(dlg); toast('Route ' + host + ' deleted on 3 of 3 replicas.'); });
  var about = document.getElementById('about');
  document.querySelector('[data-about]').addEventListener('click', function (e) { openDialog(about, about.querySelector('[data-close]'), e.currentTarget); });

  /* Account menu: opens below the avatar, same keys as the row menu */
  var accountBtn = document.querySelector('[data-account]'), account = document.getElementById('account');
  var accountItems = Array.prototype.slice.call(account.querySelectorAll('.ap-menu-item'));
  accountItems.forEach(function (it) { it.tabIndex = -1; });
  function setAccount(open, refocus) {
    account.hidden = !open;
    accountBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) accountItems[0].focus(); else if (refocus) accountBtn.focus();
  }
  accountBtn.addEventListener('click', function () { setAccount(account.hidden, false); });
  document.addEventListener('click', function (e) {
    if (!account.hidden && !e.target.closest('#account') && !e.target.closest('[data-account]')) setAccount(false, false);
  });
  account.addEventListener('keydown', function (e) {
    var i = accountItems.indexOf(document.activeElement);
    var next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: accountItems.length - 1 }[e.key];
    if (next !== undefined) { e.preventDefault(); accountItems[(next + accountItems.length) % accountItems.length].focus(); }
    if (e.key === 'Tab') setAccount(false, false);
  });
  accountItems.forEach(function (it) {
    it.addEventListener('click', function () {
      setAccount(false, true);
      if (it.hasAttribute('data-signout')) toast('Signed out. In the real app this returns to the sign-in page.');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) return closeMenu(true);
    if (!account.hidden) return setAccount(false, true);
    var openScrim = document.querySelector('.ap-scrim:not([hidden])');
    if (openScrim) return closeDialog(openScrim);
    if (!display.hidden) return setDisplay(false);
    if (shell.getAttribute('data-drawer') === 'open') return setDrawer(false);
  });

  var save = document.querySelector('[data-save]');
  if (save) save.addEventListener('click', function () { toast('Route saved. Applied on 3 of 3 replicas.'); });
  var copy = document.querySelector('[data-copy]');
  if (copy) copy.addEventListener('click', function () {
    var code = copy.parentElement.querySelector('code');
    var done = function () { var s = copy.querySelector('span'); s.textContent = 'Copied'; setTimeout(function () { s.textContent = 'Copy'; }, 2000); };
    try { navigator.clipboard.writeText(code.textContent).then(done, function () { getSelection().selectAllChildren(code); }); }
    catch (err) { getSelection().selectAllChildren(code); }
  });
})();
</script>
""".replace("LUCIDE", LUCIDE)

# Shell card: the frame alone.
d = os.path.join(PROJECT, "components", "Shell")
os.makedirs(d, exist_ok=True)
open(os.path.join(d, "preview.html"), "w").write(f"""<!-- @dsCard group="Navigation" height=560 width=1100 -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Shell — preview</title>
<style>html, body {{ margin: 0; }} body {{ background: var(--ground); }} .ap-shell {{ min-height: 560px; }} .ap-shell-body {{ min-height: 560px; }}</style>
</head>
<body class="ap" lang="en">
<a class="ap-skip" href="#main">Skip to content</a>
<div class="ap-shell" data-shell>
{sidebar()}
<div class="ap-shell-body">
{TOP}
<main class="ap-content" id="main" tabindex="-1"><div class="ap-stack" style="gap:6px"><nav class="ap-crumbs" aria-label="Breadcrumb"><a href="#">prod-eu-west</a><span aria-hidden="true">/</span><span>Overview</span></nav><h1 class="ap-h ap-h-1">Overview</h1><p class="ap-muted" style="margin:0">Collapse the sidebar with the button next to the name, or Ctrl or ⌘ + B.</p></div></main>
{APP_FOOT}
</div>
</div>
{OVERLAYS}
{SCRIPT}
</body>
</html>
""")
open(os.path.join(d, "README.md"), "w").write("""# Shell

The shell frames every page: sidebar, top bar and content area.

- **Sidebar** (`ap-side`, `sidebar` wide): on `ground` with a hairline edge, with the Apiary name after a honey hexagon, the Overview, then navigation grouped under an `overline`: Projects (each with its route count), Traffic, Cluster, Access. Up to 7 items per group. The current page has `aria-current="page"` and `honey-soft`. Counts in `ap-count`; an item needing attention shows a status dot instead of a number.
- **Attribution** (`ap-app-foot`): a footer centered under the content of every page, with the Datapoint logo (linking to datapoint.software), a hairline, the honey hexagon and "Apiary" (linking to apiary.datapoint.software) with the version, the license and a link to the source, and "Based on Apiary by Datapoint - Sistemas de Informação, Lda." below. On short pages it sits at the bottom of the window; on long ones it follows the content. On phones it stacks: logo, then version, license and source, then the credit. It replaces the sidebar footer, which a collapsed sidebar hid. Required by the license in every version: never remove it. The sign-in and visitor pages end the same way.
- **Top bar** (`ap-top`, 52px, sticky, on `ground` with a hairline below): the sidebar button, global search with its shortcut, the cluster's write status (Status: "3 of 3 voters"), the display and accessibility button, and the account.
- **Account menu:** the avatar is a button (`aria-haspopup="menu"`) that opens a Menu anchored below it, right-aligned: a header with the user's name, email and role, then Your account, Security, Active sessions, and Sign out last, after a separator. Sign out is a plain item, not a danger one: it loses nothing. Arrow keys move, Escape closes and returns focus to the avatar.
- **Content** (`ap-content`): breadcrumb starting with the cluster's name, the page title (`title-1`, one per page), then the page. At most `content-max` wide.
- **Collapsing:** the sidebar button at the left of the top bar (or Ctrl or ⌘ + B) collapses the sidebar to icons (`sidebar-collapsed`, 68px) with a 300ms animation; labels and group titles fade, and each icon shows its label in a tooltip on hover and focus. The button stays in the same place in both states. The choice is remembered in the browser; below 1024px the sidebar starts collapsed.
- **Phones:** under 640px the same button opens the sidebar as a drawer that slides in from the left over a scrim. Focus moves into it and stays there; Escape or the scrim closes it.
- **About Apiary:** the last sidebar item opens a dialog with the version, the attribution, the full license notice and a link to the source.
- **Skip link:** "Skip to content" is the first focusable element and jumps to `main`.

**The consumer provides:** the cluster name, the navigation with counts, the page title and content.
""")


# Display settings card: the popover, shown open.
d = os.path.join(PROJECT, "components", "DisplaySettings")
os.makedirs(d, exist_ok=True)
card = DISPLAY.replace(' hidden style="right:0;top:calc(100% + 8px)"', ' style="position:static"')
open(os.path.join(d, "preview.html"), "w").write(f"""<!-- @dsCard group="Accessibility" height=420 -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>DisplaySettings — preview</title>
<style>html, body {{ margin: 0; }} body {{ background: var(--ground); }} .pv {{ padding: 20px; }}</style>
</head>
<body class="ap" lang="en">
<div class="pv">{card}</div>
<script>
document.querySelectorAll('[data-setting]').forEach(function (seg) {{
  seg.addEventListener('click', function (e) {{
    var b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(function (x) {{ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }});
  }});
}});
</script>
</body>
</html>
""")
open(os.path.join(d, "README.md"), "w").write("""# DisplaySettings

Display settings let each person adjust Apiary to how they see and read: appearance, text size, contrast and motion.

- Opened from the accessibility button in the top bar, as a solid popover (`ap-popover`, `role="dialog"`). Like every floating element it is solid, so nothing behind it competes with its controls. Escape or a click outside closes it and returns focus to the button.
- Each setting is a Segmented control. **Automatic** follows the operating system (`prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-motion`); the other options override it.
- The choice is set as an attribute on the root element (`data-theme`, `data-text`, `data-contrast`, `data-motion`), which `bundle.css` responds to, and saved in the browser's local storage only. Nothing reaches the server.
- **Text size** scales every font size, set in `rem`, to 112.5% or 125%. Layouts reflow; nothing is cut off.
- **More contrast** darkens secondary text, makes hairlines and control edges solid, outlines cards and buttons and thickens the focus ring.

**The consumer provides:** nothing; the component reads and writes the preferences itself.
""")
