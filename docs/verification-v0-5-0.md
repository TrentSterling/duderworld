# DuderWorld 0.5.0 art candidate

Based on authoritative `TrentSterling/duderworld` main, package 0.4.0,
`f204f2ac5021c02089f0dd96022fb3e6efef8674`, through preserved checkpoint
`83c673bdd9ed86c4b1b747c59d72a8e4d0bfd9cf`. Local art branch:
`codex/npr-garden-lobbies-20261025`. No push, merge, deployment or publication.

## Art and geometry

Three inspected art passes developed actual leaf laminae, petioles, broad-leaf
crowns and a low rosette, ceramic vessels, cushion modules and tilted pillows,
layered walls/canopies, acoustic panel assemblies, room badges and tea tables.
The palette is warm ceramic, rose/lavender, sea-glass green and controlled coral.
NPR lighting is a single opaque material pass with three broad light levels,
colored shadow/ambient tones and restrained highlights. No postprocessing chain.

ViperOneOne's local modeling notes informed the technique of controlled
cross-sections, reusable assemblies and silhouette inspection. No external
Viper assets, code, shaders or study files were copied or packaged.

Independent review caused concrete revisions: exposed the pot glaze band,
grounded pots at their base, varied plant crowns, replaced the rigid sofa ribbon
with separated modules, enlarged/tilted pillows and separated furniture colors.
Actual renders exposed an inherited rounded-box bug (duplicate X faces, absent
Z faces), now fixed only in the current archipelago. Its regression checks six
axial faces, duplicate faces and two incident triangles per geometric edge.
Historical world.mjs and 0.4.1 outputs stay unchanged.

The final technical review found no blocking structural issue. Small pot-rim
cast-shadow patches and canopy-edge aliasing remain at close inspection.
Shadow-on/off comparisons separate them from missing geometry. This remains an
art candidate for user review, not a claim that the user's final quality bar is met.

## Cost and measured behavior

| Metric | 0.4.1 checkpoint | 0.5.0 candidate |
|---|---:|---:|
| Static triangles | 288,460 | 385,348 (+33.6%) |
| Native indexed vertices | 192,274 | 292,636 |
| Static batches | 18 | 18 |
| Whole-world all-pass draws | 38 | 38 |
| Whole-world all-pass triangles | 642,546 | 840,682 |
| Voice all-pass draws | 27 | 26 |
| Voice all-pass triangles | 411,736 | 497,304 |
| World GPU median of run medians | 3.289 ms | 2.834 ms |
| World run-median range | 2.774-3.371 ms | 2.725-3.101 ms |
| Voice GPU median of run medians | 3.111 ms | 2.744 ms |
| Voice run-median range | 2.949-3.179 ms | 2.679-3.112 ms |

Three counterbalanced pairs per view, 60 warmup frames followed by 240 GPU timer
queries, fixed animation time, 1600 x 1000 DPR 1, muted headless Chromium,
RTX 5070 Ti / ANGLE D3D11. Draw counts are recorded per timed query. GPU-disjoint
events invalidate every pending query. No GPU clocks or OS settings were changed.

GPU P3/P5 states and memory clocks varied substantially between runs. Do not
interpret the smaller candidate medians as a reliable speedup. The first world
pair overlapped CPU-only geometry checks; no concurrent GPU test ran. Pot base
grounding and deterministic leaf-tip normals changed after paired timing;
triangle counts/materials/draw counts are unchanged, vertex count rose by 3,999.
Raw runs are preserved. The earlier upstream-versus-0.4.1 timing investigation
is documented separately in performance-followup.md, including its unusual
short-query mode. The data do not support attributing that whole median change
to the new room shells.

The final offline HTML SHA-256 is
`ed84ce800318e6d04106717800488c8f8a2e160cce848442c9edd0184701ea68`.
A separate final single run after all fixes measured world 2.627 ms, voice
2.699 ms, friends 2.845 ms, interior 2.802 ms and skate 3.316 ms GPU medians.
These are final-build observations, not paired evidence of a speedup. The
six-second 1600 x 1000 H.264 clip contains 180 frames and no audio stream.

## Verification and handoff

- Original 27 lobby recipes, 360 layout checks, two real skate bowl openings.
- Zero current-world winding errors or degenerate triangles.
- 310 standing-height mesh raycasts across six layout recipes preserve 3 m lanes.
- Closed-box manifold checks and latest GLB roundtrip through Three.js.
- Browser controls, layout sliders, focus views, walk/topdown toggles, actual
  recipe/metadata/GLB downloads; zero page or shader-console errors.
- Three rebuilds remain at 24 resident geometries and one shadow texture.
- Browser/CLI semantic metadata agree exactly. GLB has 18 meshes, 385,348
  triangles and Standard material fallbacks; preview crowd stays excluded.
- Blender 4.5.2 background process generated an editable botanical .blend and
  studio render from the same original procedural kit. No UI interaction.

Expanded browser/native triangle comparison exposed unstable normals at collapsed
leaf endpoints. Those now use a deterministic interior derivative. Both exports
report 292,636 vertices and 385,348 triangles. Expanded positions and colors match
exactly; maximum normal-component difference is 1.09e-11. This check supplements
counts and winding tests, which alone would have missed the defect.

The custom preview NPR shader is not exported in GLB. Port its material treatment
to the chosen Unity render pipeline. Coarse collision proxies remain proxies;
ramps and legacy props still need production collision/nav treatment. No Quest,
Unity import, stereo, thermal, EOS networking or actual ragdoll simulation was
qualified. All automated interaction was muted, headless/offscreen, with no
physical mouse/keyboard injection, pointer lock, focus changes or audio playback.

Next useful art step: make the arrival threshold and the sea-facing terrace one
authored composition, with a distinct shelter silhouette and a small social
furniture grouping. Then carry the same hierarchy into the remaining activity
islands instead of multiplying trim on these two rooms.
