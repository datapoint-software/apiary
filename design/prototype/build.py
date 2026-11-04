"""Builds the Prototype card: the clickable Apiary prototype, as one self-contained page.

It compiles the tokens in src/web/projects/apiary-ui/styles/tokens.json into CSS variables, adds the design system's styles,
and inlines the shell and the prototype's scripts.

It's written to design/project/components/Prototype/preview.html, which opens on its own too.

Usage: python3 design/prototype/build.py [preview.html]
The optional argument also writes a copy wrapped in <!doctype html>, for opening locally.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.dirname(HERE)
REPO = os.path.dirname(DESIGN)
PROJECT = os.path.join(DESIGN, "project")
STYLES = os.path.join(REPO, "src", "web", "projects", "apiary-ui", "styles")
LUCIDE = "https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"
SCRIPTS = ["data.js", "ui.js", "shell.js", "pages-projects.js", "pages-routes.js", "pages-traffic.js", "pages-cluster.js", "pages-access.js", "i18n-pt.js"]


def read(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as f:
        return f.read()


def token_css():
    tokens = json.loads(read(STYLES, "tokens.json"))
    light, dark, other = [], [], []
    for fam in ("color", "shadow"):
        for t in tokens[fam]["tokens"]:
            light.append(f"--{t['name']}: {t['value']['light']};")
            dark.append(f"--{t['name']}: {t['value']['dark']};")
    for fam in ("spacing", "radius", "control", "layout"):
        for t in tokens[fam]["tokens"]:
            other.append(f"--{t['name']}: {t['value']};")
    for k, v in tokens["type"]["families"].items():
        other.append(f"--font-{k}: {v};")
    L, D, O = "\n  ".join(light), "\n  ".join(dark), "\n  ".join(other)
    return f""":root {{
  {L}
  {O}
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  {D}
  color-scheme: dark;
}} }}
:root[data-theme="dark"] {{
  {D}
  color-scheme: dark;
}}"""


def logo():
    svg = read(REPO, "branding", "datapoint-logo.svg")
    svg = re.sub(r"<\?xml.*?\?>\s*", "", svg)
    svg = re.sub(r"<title>.*?</title>\s*", "", svg, flags=re.S)
    svg = svg.replace('role="img" aria-label="Datapoint Software"', 'role="img" aria-label="Datapoint Software" focusable="false"')
    return re.sub(r' width="628" height="156"', "", svg)


def build():
    css = read(STYLES, "apiary.css") + "\n" + read(HERE, "prototype.css")
    shell = read(HERE, "shell.html").replace("{{LOGO}}", logo())
    js = "\n".join(read(HERE, name) for name in SCRIPTS) + "\nrender(currentPath(), false);\n"
    return f"""<title>Apiary Prototype</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Built by design/prototype/build.py from design/project and design/prototype. Every screen and its data are invented. */
{token_css()}
html, body {{ height: 100%; margin: 0; }}
body {{ background: var(--ground); color: var(--ink); }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--ground); }}
.ap-top {{ top: env(safe-area-inset-top, 0px); }}
@media (max-width: 639px) {{
  .ap-top {{ padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
  .ap-content {{ padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
}}
{css}
</style>
<div class="ap" lang="en" style="min-height:100%">
{shell}
</div>
<script src="{LUCIDE}"></script>
<script>
{js}</script>
"""


if __name__ == "__main__":
    page = build()
    card = os.path.join(PROJECT, "components", "Prototype")
    os.makedirs(card, exist_ok=True)
    with open(os.path.join(card, "preview.html"), "w", encoding="utf-8") as f:
        f.write('<!-- @dsCard group="Pages" height=900 width=1280 page=true subtitle="Every screen, clickable" -->\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>\n<body>\n' + page + "</body>\n</html>\n")
    with open(os.path.join(card, "README.md"), "w", encoding="utf-8") as f:
        f.write(read(HERE, "README.md"))
    print("wrote", os.path.relpath(card, REPO))
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as f:
            f.write('<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>\n<body>\n' + page + "</body>\n</html>\n")
        print("wrote", sys.argv[1])
