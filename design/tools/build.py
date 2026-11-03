"""Rebuilds everything under design/ from its sources.

- design/project/components/*/: the design system's cards (gen_components.py, gen_showcase.py)
- the Prototype card: the clickable prototype (design/prototype/build.py)

Usage: python3 design/tools/build.py [preview.html]
The optional argument also writes a copy of the prototype to open locally.
"""
import os
import runpy
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.dirname(TOOLS)
REPO = os.path.dirname(DESIGN)
PROJECT = os.path.join(DESIGN, "project")


def run(script, *args):
    saved = sys.argv
    sys.argv = [script, *args]
    try:
        runpy.run_path(script, run_name="__main__")
    finally:
        sys.argv = saved


run(os.path.join(TOOLS, "gen_components.py"), PROJECT)
run(os.path.join(TOOLS, "gen_showcase.py"), PROJECT, os.path.join(REPO, "branding", "datapoint-logo.svg"))
run(os.path.join(DESIGN, "prototype", "build.py"), *sys.argv[1:])
