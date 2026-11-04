"""Reports the server's test coverage and fails when a project falls below its threshold.

Each test project writes its own Cobertura report to TestResults/. A line counts as covered when
any project's tests ran it. Only hand-written code under src/ counts: generated code (anything
under obj/, *.g.cs) and the tests themselves are left out.

The thresholds are in tools/coverage-thresholds.json, as percentages of lines and branches per
project. Raise them as coverage grows; never lower one without saying why in the commit.

Usage: python3 tools/coverage.py [--check] [--files] [reports...]
--check fails if a project is below its threshold. --files also lists each file's coverage.
Without reports, it reads TestResults/*.cobertura.xml.
"""
import collections
import glob
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
THRESHOLDS = os.path.join(TOOLS, "coverage-thresholds.json")
SOURCE = re.compile(r"[\\/]src[\\/](Datapoint\.Apiary[^\\/]*)[\\/](.+)$")


def project_and_path(filename):
    match = SOURCE.search(filename)
    if not match or match.group(2).startswith(("obj/", "obj\\", "bin/", "bin\\")) or filename.endswith(".g.cs"):
        return None
    return match.group(1), match.group(2).replace("\\", "/")


def read(reports):
    lines = collections.defaultdict(dict)
    branches = collections.defaultdict(dict)
    for report in reports:
        for cls in ET.parse(report).getroot().iter("class"):
            key = project_and_path(cls.get("filename"))
            if key is None:
                continue
            for line in cls.iter("line"):
                number = int(line.get("number"))
                lines[key][number] = max(lines[key].get(number, 0), int(line.get("hits")))
                condition = line.get("condition-coverage")
                if condition:
                    covered, total = map(int, condition.split("(")[1].rstrip(")").split("/"))
                    previous = branches[key].get(number, (0, total))
                    branches[key][number] = (max(previous[0], covered), total)
    return lines, branches


def percent(covered, total):
    return 100.0 * covered / total if total else 100.0


def main(arguments):
    check = "--check" in arguments
    files = "--files" in arguments
    reports = [a for a in arguments if not a.startswith("--")] or glob.glob(os.path.join(REPO, "TestResults", "*.cobertura.xml"))
    if not reports:
        print("No coverage reports found. Run: dotnet test --solution Datapoint.Apiary.slnx --coverage --coverage-output-format cobertura --coverage-settings tests/coverage.config")
        return 1

    lines, branches = read(reports)
    totals = collections.defaultdict(lambda: [0, 0, 0, 0])
    for key in sorted(lines):
        covered = sum(1 for hits in lines[key].values() if hits > 0)
        branch_covered = sum(c for c, _ in branches[key].values())
        branch_total = sum(t for _, t in branches[key].values())
        total = totals[key[0]]
        total[0] += covered
        total[1] += len(lines[key])
        total[2] += branch_covered
        total[3] += branch_total
        if files and covered < len(lines[key]):
            missing = sorted(n for n, hits in lines[key].items() if hits == 0)
            print(f"  {key[0]}/{key[1]}: {percent(covered, len(lines[key])):.0f}% of lines, missing {missing}")

    with open(THRESHOLDS, encoding="utf-8") as stream:
        thresholds = json.load(stream)
    failures = []
    print(f"{'Project':<32} {'Lines':>16} {'Branches':>16}")
    for project, (covered, total, branch_covered, branch_total) in sorted(totals.items()):
        line_rate = percent(covered, total)
        branch_rate = percent(branch_covered, branch_total)
        print(f"{project:<32} {line_rate:6.1f}% {covered:>4}/{total:<4} {branch_rate:6.1f}% {branch_covered:>4}/{branch_total:<4}")
        threshold = thresholds.get(project)
        if threshold is None:
            failures.append(f"{project} has no threshold in {os.path.relpath(THRESHOLDS, REPO)}")
            continue
        if line_rate < threshold["lines"]:
            failures.append(f"{project}: {line_rate:.1f}% of lines, below {threshold['lines']}%")
        if branch_rate < threshold["branches"]:
            failures.append(f"{project}: {branch_rate:.1f}% of branches, below {threshold['branches']}%")

    for failure in failures:
        print("Coverage too low: " + failure)
    return 1 if check and failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
