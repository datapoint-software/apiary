# Stat

A stat shows one current number, what it is compared with, and its recent trend.

- Label in `overline`, value in `data-lg` (the display face, tabular figures), unit after the value in `ink-3`, comparison in one plain sentence.
- The sparkline draws the selected time range on one scale: a honey line over a `honey-soft` area, a baseline, and a dot on the latest value. No axes: the sentence carries the scale.
- Use stats only where the number is the point: traffic, latency, errors. Not for counts that a table already shows.
- Three or four per row at most.

**The consumer provides:** label, value, unit, comparison sentence and the series.
