# DuderWorld Coast V0.5.0

A compact, authored visual study built with Three.js. This is an environment modeling lab, not a web game. Approved geometry will be converted to Unity locally later.

## Preview and build

Open `duderworld-coast-v0-5.html` directly from disk. It is self-contained and needs no CDN, server, network request, or runtime install. The preserved V0.2 lobby, V0.3 world, V0.4 studio and default `static.html` are not overwritten.

```
npm ci
npm run build:coast
npm test
```

Orbit with left drag, pan with right drag, zoom with the wheel. Keys 1-4 select overview, courtyard, skatepark and beach. H hides the interface, D toggles scale figures and W toggles wireframe. The GLB button exports static scenery and named anchors; Recipe downloads metadata; Atlas downloads the shared palette PNG.

## This art pass

Three related spaces, rather than seven lightly dressed platforms:

- A compact portal courtyard with substantial layered arches, inset opaque portal panels, a central palm planter, concentric paving, curved seating and integrated garden beds.
- A skatepark with a real recessed bowl opening, curved kicker, grind ledge, terrace and spectator seating.
- A low beach with a solid striped kiosk canopy, modeled umbrellas and loungers, connected entrance stairs, dock and rowboat.

Bridges, cliffs, shoreline bands and offshore rocks connect the composition. Foliage is solid geometry, not alpha cards. Water and foam are opaque static surfaces. No bloom, refraction, transmission, transparent material or reflection pass is used.

This is an authored default composition. Seed changes only limited offshore planting variation. The optional greenery switch removes optional palms, not all plants. It is not the arbitrary-island-count V0.4 generator.

## Rendering and export contract

- One embedded **128x128 palette atlas**. Each swatch has a wide gutter and a mild vertical tone gradient. The UVs are authored for this atlas, not a general-purpose texture unwrap or lightmap UV set.
- Two standard materials: matte scenery (roughness 0.94), and a restrained portal/lamp accent (roughness 0.82, low emissive contribution). Both have metalness 0, opacity 1, no alpha test and no transparency.
- Nine indexed scenery batches, merged by spatial area and material. There are no hidden multi-material geometry groups. Area boundaries remain useful for culling and later conversion.
- Default static environment: **201,872 triangles and 198,827 indexed vertex records**. Optional preview figures add one batch and 20,532 triangles.
- The browser reports **9 steady main-view calls without figures, 10 with figures**. Shadow-map work is additional. The 2048px shadow map is refreshed when geometry visibility changes, not on every camera movement. These are draw-count observations, not a hardware performance claim.
- GLB contains nine scenery meshes, two opaque materials, one embedded PNG, named area groups and six named anchors. The atlas uses linear filtering without mipmaps; preserve that sampling when importing or add a suitable gutter-aware mip chain.
- Meter units, +Y up. Cliff, bridge and courtyard heights are explicit; the beach is lower than the hub and has modeled connecting steps. Retain normals, indices, UVs and node transforms when converting.

The little beans are static scale-reference figures, **not the actual DuderLab mesh or rig**. They stay separate and are excluded from GLB. DuderLab is untouched.

No Unity project, Unity shader, collider system, lightmap UVs, navmesh, network component or gameplay was added. The dock, boat and skate props are currently baked static scenery, not separate simulated or networked actors. Mesh part ranges and anchors provide identification, not a finished interaction system.

## Verification

`qa/check-coast.mjs` validates finite indexed geometry, nondegenerate winding, normals, atlas UV gutters, material count/opacity, draw-budget boundaries, bowl and landing raycasts, outward cliff faces and recipe reproducibility. The original four test suites are still included in `npm test`.

`qa/check-coast-browser.py` boots the exact built HTML in Chromium with ANGLE SwiftShader. It captures four camera presets, checks nonblank rendering, inspects console errors, exercises camera/wireframe/figure controls and downloads the GLB, metadata and atlas. It does not navigate to any external website. On Linux where ANGLE needs an X server:

```
xvfb-run -a python3 qa/check-coast-browser.py --out output/coast
```

This optional QA tool requires Python Playwright, Pillow and an installed Chromium; these are not application dependencies.

To additionally load and compare the exported GLB, bundle `qa/coast-roundtrip-entry.js` with the existing esbuild dependency and supply its path through `--roundtrip-script`. The test compares every position, normal, UV and index, verifies exactly two materials and one embedded atlas, and confirms the preview crowd is absent. A second QA-only Three.js bundle can emit a duplicate-import warning; the ordinary viewer does not load that bundle.

The release was locally checked in software Chromium: no viewer console/page errors, no viewer warnings and no external runtime requests. The GLB round-trip preserved geometry attributes and indices exactly. Browser inspection also caught and corrected initial cliff winding and ramp-placement problems. Unity import and hardware/Quest performance have **not** been tested.

## Source organization

- `src/coast-kit.mjs`: palette, opaque materials, mesh batching and modeling helpers.
- `src/coast-world.mjs`: the three authored environments, support scenery and preview figures.
- `src/coast-viewer.js`: camera inspection, rendering, export and QA hooks.
- `build-coast.mjs`: standalone HTML bundling; does not rebuild old previews.

The CI preparation helper creates immutable build blobs and a downloadable manifest. It never moves branches or commits by itself. Publishing a reviewed build is a separate explicit Git commit.
