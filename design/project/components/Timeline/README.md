# Timeline

The timeline lists audit log entries: who did what, from where, through which surface, and when.

- One entry per line: actor, verb in the past tense, object (in the data face), then a meta line with the change, source IP and surface (UI, MCP, CLI).
- Dot tones: `line-strong` for changes, `info` (`ap-event-agent`) for actions by agents, `critical` (`ap-event-denied`) for denied actions.
- Never show an action's arguments beyond what the audit log stores: no passwords, keys or tokens.
- Times in the data face, UTC, newest first; group by day with an `overline` heading when a list spans days.

**The consumer provides:** the entries, already formatted.
