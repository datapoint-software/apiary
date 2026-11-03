# DatePicker

A date and time field: type it, or choose it on a calendar.

- The text field takes `YYYY-MM-DD HH:MM` and stays the source of truth; the calendar button beside it opens a popover (`ap-cal-pop`, `role="dialog"`) that writes into it.
- **Every time is UTC**, and the field says so with a `UTC` suffix. Everyone on call reads the same times, and the audit log, logs and Raft agree.
- Weeks start on Monday. Today is in `honey-text`, the selection is a honey disc, days outside the allowed range are disabled.
- Keyboard: arrows move by day and week, Page Up and Page Down by month (with Shift, by year), Home and End to the week's start and end, Enter selects, Escape closes and returns focus to the button.
- With time, picking a day keeps the popover open for the time; **Done** closes it. Date only: picking a day closes it.
- Validated like any field: an impossible date ("2026-02-31") or the wrong format gets an error that shows the expected format; ranges check that the end is after the start.

**The consumer provides:** label, value, whether it has a time, and the earliest and latest allowed dates.
