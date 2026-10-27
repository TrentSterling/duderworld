# DuderWorld Coast V0.5.3

A compact Three.js modeling lab, not a web game. The existing V0.2/V0.3/V0.4 previews and default studio remain unchanged. Approved geometry will be converted to Unity locally later.

## Same scene, depth cleanup and fewer draws

This patch preserves the Coast 0.5.2 composition, botanical detail, palette, lighting, camera presets, materials and circulation. It does not add gameplay, a Unity package, custom runtime shaders or new dependencies.

Duplicate same-facing coplanar coverage is geometrically trimmed, including the beach bridge landing, quarter-pipe side panels and overlapping architectural faces. This is a mesh repair, not polygon offset or render-order masking. Attribute interpolation retains the source normals and atlas mapping. Faces proven wholly enclosed by a conservative solid-deck volume are discarded. The skate bowl opening is excluded from this interior-face removal.

The flat ocean has two triangles instead of 2,888; its visible plane, color and extent are unchanged. Rounded wavelets, palms, individual leaflets, planters, rocks, buildings and skating surfaces retain their modeled detail.

## Rendering and batching

| Measurement | 0.5.2 | 0.5.3 |
| --- | ---: | ---: |
| Static scenery draws, steady main pass | 9 | 3 |
| With preview figures | 10 | 4 |
| Scenery triangles | 311,154 | 304,477 |
| Indexed vertex records | 321,193 | 316,219 |
| Geometry buffer bytes | 13,035,668 | 12,180,436 |
| Exported GLB bytes | 13,668,752 | 12,953,828 |
| Materials | 2 | 2 |
| Palette atlas | 128 x 128 | 128 x 128 |

The three batches are matte scenery, hero accents and ocean. The ocean shares the matte material but stays separate because it does not cast shadows. There are no hidden multi-material draw groups. Shadow-map rendering is additional and cached for this static scene. The optional figures add one draw and are excluded from export.

Both materials remain opaque standard PBR materials: roughness 0.94/0.82, metalness 0, opacity 1, alpha test 0. No transparency, reflection, refraction or bloom was introduced.

Position and normal attributes remain Float32. Palette UVs use normalized Uint16 coordinates, supported by core glTF 2.0; maximum coordinate rounding error is 1/131070, under 0.001 atlas texel. Unreferenced vertices are removed. No mesh-compression decoder or material-specific import extension is required for these UVs.

Batching combines the small scene's visible geometry to reduce submissions. It trades per-island renderer culling for fewer draws. The generator retains `buildCoast(materials, {batching:'zones'})` for a nine-batch, cleaned, spatially separated build. Named zone transforms and zone/part index ranges remain in merged export metadata, so the authoring boundaries are not lost. For first-person/VR Unity scenes, compare the merged and spatial variants on target hardware rather than assuming the fewest draws always wins.

The viewer now schedules frames only during camera movement/damping or a requested update. It also fits camera depth planes to the static scene bounds. The geometry fixes do not rely on that browser-specific precision improvement.

## Run and build

Open `duderworld-coast-v0-5.html` directly from disk. The stable filename is unchanged; the UI identifies patch 0.5.3. It is an offline single HTML file without external runtime requests.

    npm ci
    npm run build:coast
    npm test

Left drag orbits, right drag pans, wheel zooms. Keys 1-4 select overview/hub/skatepark/beach. H hides UI, D toggles figures, W toggles wireframe. Export GLB saves scenery and anchors; Recipe saves metadata; Atlas saves the palette image.

## Export handoff

The default GLB contains three static meshes, two materials, one embedded atlas and six named anchors. Units are meters, +Y up. It contains ordinary indexed geometry, not runtime procedural generation. Preview figures are not DuderLab rigs and are not exported.

Palette UVs are not a lightmap unwrap. Preserve linear texture filtering without mipmaps, or construct a gutter-aware mip chain. A Unity import still needs appropriate material assignment/import support, lightmap UVs if baking, simplified colliders and any gameplay-prefab separation. The dock, boat and skate props remain baked static scenery. This is not a watertight boolean-unioned CAD model.

No Unity project, colliders, navigation, physics, networking or automatic conversion package is included. Actual Unity import and hardware/Quest performance have not been validated in this patch.

## Verification

`npm test` includes eight suites: four legacy suites, Coast geometry, clearance, botany and optimization. The existing clearance checks sample the actual merged meshes at 1,498 positions across five named paths. They are sampled regressions, not a full swept-capsule collision proof.

The optimization suite checks independent overlapping-square clipping cases, three real batches, opaque materials, zero geometry material groups, referenced vertices, valid per-zone ranges and normalized UV packing. The optional independent Python coplanar audit groups geometric planes and intersects projected triangles across authored parts. The 0.5.2 baseline produced 159 overlapping part-plane pairs; 0.5.3 produced zero above the audit's area/tolerance threshold. This does not prove the absence of every possible near-parallel intersection or shadow artifact.

Browser acceptance checks use the actual self-contained HTML in Chromium/ANGLE SwiftShader: four camera presets, nonblank canvases, controls, downloads and GLB loading. Fixed-camera before/after images preserve the same framing and lighting. These are software-renderer checks, not hardware FPS measurements.

    xvfb-run -a python3 qa/check-coast-browser.py --out output/coast --roundtrip-script /path/to/bundled-roundtrip.js

The optional browser QA requires Python Playwright, Pillow and Chromium. The independent coplanar QA requires NumPy and Shapely; neither is a runtime or npm dependency. `qa/dump-coast-audit.mjs` prepares raw mesh data for `qa/audit-coplanar.py`. The normal npm suites require only the locked Node dependencies.

## Source map and preserved work

`coast-kit.mjs`: atlas and modeling primitives. `coast-botany.mjs`: solid foliage and offshore gardens. `coast-world.mjs`: authored composition. `coast-skate.mjs`: bowl, quarter pipe and clearance layout. `coast-optimize.mjs`: geometry cleanup, UV packing and render batching. `coast-viewer.js`: inspection and export. `build-coast.mjs`: offline bundle.

The 0.5.1 clearance improvements and 0.5.2 solid foliage are preserved. Parameters vary planting, not architectural quality. Source recipes and named anchors remain available for the later local Unity conversion.
