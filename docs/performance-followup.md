# Performance checkpoint before the NPR art pass

The reviewed 0.4.1 commit remains `83c673bdd9ed86c4b1b747c59d72a8e4d0bfd9cf`.
No renderer changes were made during this investigation.

Six counterbalanced upstream/reviewed pairs at 1600 x 1000, DPR 1,
240 timed samples per run after 60 warmup frames, reproduce a median increase:
baseline run medians 2.584-2.738 ms; reviewed 2.868-2.951 ms. All runs use
fixed animation time, muted headless Chromium, RTX 5070 Ti / ANGLE.

Independent review found an important distribution caveat: upstream has
40-56 queries below 0.5 ms per run, versus 0-4 in the reviewed build. Those
samples are retained. Conditioning on the remaining samples substantially
shrinks the difference; that is a diagnostic, not a replacement result.
Do not attribute the full median increase to room geometry from these data.

The recorded whole-world shadow matrices, projection, light position, target
and 2048 map are exactly equal across all 12 paired runs. Focused shadow
framing therefore does not explain the whole-world result. Separate ablations
show large GPU power-state changes (P3/P5/P8, memory clocks 405-7001 MHz) and
one 14.977 ms run. No OS/GPU settings were changed. Room ablations swap both
voice/friends chunks including their decorations, not only pavilion shells.

The user redirected priority to a substantial NPR/geometry art pass before
further timing investigation. Preserve the raw data and revisit timing with
per-query draw counts and disjoint invalidation before performance claims.
The 0.4.1 original 2.647 -> 2.783 ms measurement remains disclosed.
These are desktop results, not Quest qualification.

Scripts: `qa/build-perf-fixtures.mjs`, `qa/investigate-performance.py`.
Raw local records: `evidence/performance-followup/{baseline,attribution}-raw.json`.
Independent review: no application edits, world shadow equivalence confirmed,
ablation limitation and timer-mode caveat recorded.
