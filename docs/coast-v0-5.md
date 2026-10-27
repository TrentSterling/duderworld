# DuderWorld Coast V0.5.2

A compact Three.js environment modeling lab, not a web game. Approved geometry will be converted to Unity locally later. The original V0.2/V0.3/V0.4 previews and the default `static.html` are unchanged.

## Foliage and offshore detail pass (0.5.2)

The approved circulation, three main island footprints, architecture, skating surfaces, bridge widths, cameras, lighting and material setup remain unchanged. This is a botanical modeling pass, not a layout redesign.

Palms now have tapered curved trunks, aligned growth collars, grounded root flares, nine curved feathered fronds, individual solid leaflets, emerging crown spears and coconuts. Ceramic pots have shaped profiles and recessed soil; layered succulent rosettes, leafy sprigs and small flowers replace the old ellipsoid shrubs. The hub garden beds and center planter use the same new botanical kit.

All six offshore locations retain their positions but use composed clusters of bevel-shouldered rocks, lower shelves and submerged talus. Flush irregular groundcover replaces the raised green caps. Rooted planting and face-sampled trailing vines are attached to the rock surfaces. One cluster carries two palms and two low clusters have no palm, rather than repeating a single tree on every rock.

All leaves are closed geometry, including their underside and caps. There are no alpha cards, new texture files, extra material classes or animated shaders. More detail has a real geometry cost: scenery rose from 208,260 triangles / 199,953 vertex records in 0.5.1 to 311,154 triangles / 321,193 vertex records. The geometry regression budget is now 325k triangles; the number of scenery batches remains nine. These counts are not a hardware performance claim.

## Preserved skatepark and clearance pass (0.5.1)

The oversized bowl has been resized and shifted to leave a separate street lane. Its floor and transition have shared derivative normals, continuous atlas shading and a flush roll-in section without raised coping across the mouth. The quarter pipe has a curved riding surface, closed side cheeks, a supported rear deck and a rear rail. The low grind box and separate rail are positioned away from the entrance and quarter-pipe run-out.

Palms now sit in dedicated beds, rather than in the ramp footprint. Spectator seats have their own access space. Hub benches are split around the actual bridge approach corridors. Two beach-entry plants were moved away from the stairs. Bridge decks and rails were widened together; measuring only the centerline was insufficient.

The scene remains deliberately small. This update improves the existing three spaces; it does not add more islands, gameplay, character controllers or networking.

## Run and build

Open `duderworld-coast-v0-5.html` directly from disk. It is a self-contained offline build with no external runtime dependencies. The filename is the stable Coast preview URL; the on-screen version identifies this patch as 0.5.2.

```
npm ci
npm run build:coast
npm test
```

Left drag orbits, right drag pans, and the wheel zooms. Keys 1-4 select the overview, hub, skatepark and beach. H hides the interface, D toggles the scale figures and W toggles wireframe. Export GLB saves scenery and anchors; Recipe saves metadata; Atlas saves the palette image.

## Rendering and export

- One embedded 128x128 palette atlas. UVs are swatch coordinates, not a general texture unwrap or lightmap UV set. Bowl segments share a continuous height gradient rather than restarting the gradient on every strip.
- Two opaque standard materials: roughness 0.94 for scenery and 0.82 for restrained hero accents. Both have metalness 0, opacity 1, no alpha test and no transparency.
- Nine indexed scenery batches, merged by area and material, without multi-material geometry groups. The default scenery is 311,154 triangles and 321,193 indexed vertex records.
- Optional scale figures add one batch and 20,532 triangles. The observed steady overview render is 9 draws without figures and 10 with them. Shadow-map work is additional; these are software-renderer measurements, not hardware performance claims.
- Water, foam, foliage, umbrellas and portal panels remain opaque. No bloom, refraction or reflection pass is used.
- GLB contains nine scenery meshes, two materials, one embedded palette image and six named anchors. Units are meters with +Y up. Preserve the atlas's linear filtering without mipmaps, or provide a gutter-aware mip chain.

The preview figures are not DuderLab assets and are excluded from GLB. No Unity project, shaders, colliders, lightmap UVs, navmesh or physics systems were added. The boat, dock and skate props remain baked scenery.

## Verification and boundaries

`npm test` runs seven suites: the four preserved suites, Coast geometry, clearance and botanical-model checks. The botany suite checks 27 closed-leaf variants, 48 outward rock-face raycasts, planter footprints, per-asset budgets and variation between the six offshore clusters. `qa/check-coast-clearance.mjs` casts against actual merged render meshes at 1,498 sample positions across five authored routes: both 3 m hub exits, the 3 m skatepark entrance, a 2.2 m street run-out and a 1.65 m spectator-access path. It checks floor availability and sampled obstacles up to 2.1 m above the nominal floor. Bowl floor and tangent continuity are checked separately.

These are sampled regression checks for named corridors, not a continuous swept-capsule proof or a complete world collision audit. They do not validate skating physics or every decorative intersection.

Browser acceptance checks load the exact built HTML, inspect four nonblank camera views, exercise controls and downloads, and verify a GLB round trip. Local Chromium with ANGLE SwiftShader reported no viewer errors or warnings, and no external runtime requests. The round trip preserved positions, normals, UVs and indices exactly. The QA-only loader creates a second Three.js instance and emits its expected duplicate-import warning.

```
xvfb-run -a python3 qa/check-coast-browser.py --out output/coast --roundtrip-script /path/to/bundled-roundtrip.js
```

The optional QA tools require Python Playwright, Pillow and Chromium; they are not application dependencies. Bundle `qa/coast-roundtrip-entry.js` using the existing esbuild dependency for the extra round-trip check. Unity import and real hardware/Quest performance remain untested.

## Sources

`src/coast-botany.mjs` contains the shared solid-leaf, palm, succulent, planter and offshore-rock models. `src/coast-kit.mjs` contains the shared atlas, batching and modeling helpers. `src/coast-world.mjs` composes the hub, beach, bridges and figures. `src/coast-skate.mjs` owns the authored skatepark layout and smooth surfaces. `src/coast-viewer.js` contains inspection cameras and exports. `build-coast.mjs` creates the offline HTML without rebuilding preserved previews.
