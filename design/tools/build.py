"""Rebuilds everything under design/ from its sources.

- the tokens and styles: src/web/projects/apiary-ui/styles is the source. tokens.css is compiled
  there from tokens.json, and tokens.json and apiary.css are copied into design/project
  (as components/bundle.css), where the published design system reads them
- design/project/components/*/: the design system's cards (gen_components.py, gen_showcase.py)
- the Prototype card: the clickable prototype (design/prototype/build.py)

Usage: python3 design/tools/build.py [preview.html]
The optional argument also writes a copy of the prototype to open locally.
"""
import os
import runpy
import shutil
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.dirname(TOOLS)
REPO = os.path.dirname(DESIGN)
PROJECT = os.path.join(DESIGN, "project")
STYLES = os.path.join(REPO, "src", "web", "projects", "apiary-ui", "styles")


def run(script, *args):
    saved = sys.argv
    sys.argv = [script, *args]
    try:
        runpy.run_path(script, run_name="__main__")
    finally:
        sys.argv = saved


def sync_styles():
    sys.path.insert(0, os.path.join(DESIGN, "prototype"))
    from build import token_css
    with open(os.path.join(STYLES, "tokens.css"), "w", encoding="utf-8") as f:
        f.write("/* Compiled from tokens.json by design/tools/build.py. */\n" + token_css() + "\n")
    shutil.copyfile(os.path.join(STYLES, "tokens.json"), os.path.join(PROJECT, "tokens.json"))
    shutil.copyfile(os.path.join(STYLES, "apiary.css"), os.path.join(PROJECT, "components", "bundle.css"))


sync_styles()
run(os.path.join(TOOLS, "gen_components.py"), PROJECT)
run(os.path.join(TOOLS, "gen_showcase.py"), PROJECT, os.path.join(REPO, "branding", "datapoint-logo.svg"))
run(os.path.join(DESIGN, "prototype", "build.py"), *sys.argv[1:])
