# DuderWorld 0.4.1 local verification

Source baseline: `TrentSterling/duderworld`, v0.4.0, `f204f2ac5021c02089f0dd96022fb3e6efef8674`. The comparison HTML was rebuilt from that source with only the missing `TAU` boot repair and inspection hooks. Its geometry and lighting were unchanged. The candidate adds the rounded rooms and renderer/UI fixes. The historical V0.3 HTML and GLBs are untouched.

## Desktop renderer

Three sequential matched pairs, 1600 x 1000, pixel ratio 1, antialiasing, RTX 5070 Ti / ANGLE D3D11. GPU time uses `EXT_disjoint_timer_query_webgl2`; 140 GPU query samples per view/run. CPU submission and frame intervals use 120 samples after warmup. The table takes the median of three run medians. Draw calls count color and shadow passes; they are not just the 18 static scene batches.

| View | All-pass draws before / after | GPU median ms before / after |
| --- | ---: | ---: |
| Whole world | 43 / 38 | 2.647 / 2.783 |
| Voice | 35 / 27 | 2.709 / 2.760 |
| Friends | 33 / 25 | 2.749 / 2.733 |
| Interior | 29 / 20 | 2.755 / 2.794 |
| Skate | 43 / 38 | 3.228 / 2.991 |

Static scene: 305,750 -> 288,460 triangles (-5.7%); 227,625 -> 192,274 indexed vertices (-15.5%); 18 static material batches unchanged. Color-pass calls in the world view: 27 -> 24. The new room silhouette and focused shadows have a small measured GPU cost in several views despite reduced geometry/draw overhead. CPU submission medians were around 0.1-0.2 ms. Frame scheduling remained around 16.7 ms, so GPU query time must not be inverted into a claimed maximum FPS. Run ranges and p95 data remain in the JSON.

The timed build hash and final build hash are recorded in the JSON. The only change after timing added explicit metadata distance fields; geometry and rendering did not change.

## Validation

- `npm test` passes: 27 legacy geometry recipes, current and legacy GLB loader roundtrips, zero archipelago winding errors/degenerates, two bowl openings, 360 layout cases, and 310 actual mesh approach raycasts across six recipes.
- Tested room arrivals have a 3 m-wide corridor at standing waist/head heights. Room analytic keepouts match emitted seating and the fountain footprint. These checks do not qualify every older prop or ramp as a navigation obstacle.
- Muted headless browser checks pass: focus buttons, view/walk toggles without pointer lock, crowd/outline controls, layout controls, actual recipe/metadata/GLB downloads, exact browser/CLI metadata match, and three rebuild cycles without growing renderer geometry counts. No page errors.
- Actual UI GLB and CLI GLB each contain 288,460 triangles in 18 meshes with normals, colors and indices. CLI materials now share the viewer's three material definitions.
- Silent video: H.264, 1600 x 1000, 30 fps, 180 frames, 6 seconds; ffprobe confirms one video stream and no audio stream. The video is an offline frame sequence, not a real-time performance recording.

## Independent review

The reviewer found invisible short-seat keepouts, oversized fountain clearance, omitted CLI room metadata, the existing V0.2/V0.4 build output collision, and a canopy shadow artifact. All were addressed and reviewed again. No unresolved blocking findings remained. The shadow artifact disappeared with shadows disabled and was resolved in the final render by focusing the same 2048 shadow map on the inspected region, with light-space texel snapping.

The shared metadata adopts the browser's `bridge.length` deck-span meaning. `deckLength` and `centerDistance` now state both distances explicitly; the previous CLI used center distance for `length`. Metadata version remains 4 with additive room descriptors. Island cylinders and bridge boxes remain coarse collision proxies. Duder Lab was not modified.

No Quest hardware, Unity runtime/import, stereo VR, thermal behavior, real ragdoll simulation, EOS or multiplayer qualification occurred. All testing was headless/offscreen and muted, with no physical cursor/keyboard injection, focus stealing, pointer lock, audio playback, or global audio changes. Nothing was pushed, published, merged or deployed.
