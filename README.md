# Current local candidate: 0.5.1

Open `duderworld-v0-5-1.html` directly offline. This bounded pass adds composed
arrivals and sea terraces to the existing Voice/Friends rooms while reducing
static geometry from 385,348 to 331,072 triangles. It retains 18 static batches,
the NPR materials, controls and deterministic exports.

Build: `npm run build:archipelago`; export: `npm run bake:archipelago`;
verify: `npm test`. Current GLB: `duderworld-archipelago-v0-5-1.glb`.
Read [verification and measured tradeoffs](docs/verification-v0-5-1.md), including
the slower paced world timing and GPU power-state limitations.

![Arrivals and terraces](docs/media/duderworld-0.5.1-arrivals.png)


---

# DuderWorld 0.5.0: NPR garden lounges

Open **[duderworld-v0-5-0.html](duderworld-v0-5-0.html)** offline. This art candidate adds original curved leaf blades, stems, rosette plants, turned ceramic pots, individual sofa cushions, tilted pillows, acoustic panels and social-room reliefs. Warm ceramic, rose upholstery and sea-glass green sit under a single-pass NPR shader with colored light bands and restrained opaque highlights. The connected world, skate park, controls and exports remain.

The current world uses a corrected closed rounded-box primitive. The inherited helper duplicated the X faces and omitted Z faces; a new closed-surface regression test catches that defect. The historical V0.2 generator and the 0.4.1 HTML/GLB checkpoint are preserved.

**Budget:** 385,348 static triangles, 292,636 indexed vertices, 18 static material batches. The visual improvements cost 33.6% more static triangles than 0.4.1. No new postprocessing, alpha foliage cards or texture downloads. Browser chunks and GLB use 16-bit indices where possible, with 32-bit fallback. Expanded browser/native triangle positions and colors match exactly, with normal differences below 1.1e-11.

**Measurements:** three matched pairs per view at 1600 x 1000 DPR 1 on RTX 5070 Ti. Candidate run medians: whole world 2.725-3.101 ms; voice room 2.679-3.112 ms. GPU power states varied, so these do not establish a reliable speedup. [Full verification and limitations](docs/verification-v0-5-0.md), [timing JSON](docs/verification-v0-5-0.json).

```sh
npm ci
npm run build
npm run bake:archipelago   # duderworld-archipelago-v0-5-0.glb
npm run export:worldmeta   # version-4 JSON, sourceBuild 0.5.0
npm test
```

The GLB preserves mesh colors and Standard materials. **The custom NPR shader is a preview treatment and is not embedded in GLB**; Unity needs a material port. Duder Lab, EOS and physics integration remain separate. This has not been qualified on Quest or inside Unity.

Original editable plant meshes are also available in the background-generated Blender study. Reproduce with `node qa/build-botanical-lab.mjs`, then Blender `--background --factory-startup --python qa/blender-botanical-study.py`. No desktop input or audio is used.

## Preserved 0.4.1 checkpoint

Open **[duderworld-v0-4-1.html](duderworld-v0-4-1.html)** directly in a desktop browser. It is a self-contained offline Three.js authoring preview. The voice lounge and friends courtyard now have continuous rounded wall shells, canopy wings, real sea-facing apertures and capsule-ended seating. The original connected skate park, activity islands, layout recipes and Duder Lab / Unity / TrontEOS separation remain intact.

This local candidate is based on verified GitHub main `f204f2ac5021c02089f0dd96022fb3e6efef8674`, package **0.4.0**. The historical V0.3 HTML and GLBs remain unchanged. No publication or deployment is part of this pass.

![Matched before and after social rooms](docs/media/duderworld-v0-4-1-comparison.png)

Repeated desktop measurements and limitations: [verification notes](docs/verification-v0-4-1.md), [full metric JSON](docs/verification-v0-4-1.json).

- Default static scene: **288,460 triangles / 192,274 indexed vertices / 18 material batches**, compared with 305,750 / 227,625 / 18 at the source baseline. Low detail: 211,112 triangles.
- Continuous swept architecture and arches avoid caps between every short tube segment. Curved boundary spans no longer get redundant fivefold subdivision.
- Preview crowd: six instanced batches instead of nine, with unchanged body-part geometry. The crowd remains a viewport scale reference, excluded from exported GLBs.
- Focus buttons visit the two rooms and the skate park. Existing orbit, top-down, walk, recipe, outline, reroll and export controls remain available.
- Fixed the upstream detailed viewer's missing `TAU` constant, which prevented its rebuilt source from reaching the first rendered frame.
- Browser and CLI use one metadata builder. Version-4 fields remain, with additive room descriptors and navigation keepouts. Whole-island collision cylinders are coarse proxies, not completed Unity colliders.
- Shadow framing follows the inspected region at the same 2048 texture resolution and snaps to shadow texels in light space. No new post-processing or texture assets.

## Build and checks

```sh
npm ci
npm run build             # V0.4 layout studio + V0.4.1 detailed viewer
npm test
npm run bake:archipelago  # duderworld-archipelago-v0-4-1.glb
npm run export:worldmeta  # version-4 JSON with room descriptors
```

`npm run build:lobby` now writes the historical V0.2 viewer to `duderworld-v0-2.html`; it no longer overwrites `static.html`. The V0.4 simplified layout studio is still `static.html`.

`qa/check-soft-rooms.mjs` casts standing-height rays through the actual generated room meshes across radial, ring, chain and hybrid layouts. It verifies a 3 m-wide arrival lane, unit normals and navigation/geometry consistency. `qa/check-browser.py` verifies actual UI downloads and three rebuild cycles in a muted headless browser without mouse/keyboard injection, focus or pointer lock. `qa/inspect-offscreen.py` captures matched views and GPU query timings. The Python scripts accept no desktop input and currently name the installed Chromium path; adjust that path on another machine.

See `evidence/` for before/after captures, repeated renderer measurements and the verification report. Desktop measurements are from RTX 5070 Ti / ANGLE D3D11 at 1600 x 1000. They are **not Quest, Unity, stereo VR, thermal, EOS or multiplayer qualification**. Ramps and other older props still need production Unity collision/navigation treatment; the new room keepouts cover this pass's rooms, not every legacy object.

---

# DuderWorld V0.4 — procedural level generation for TrontEOS

**Standalone offline V0.4 layout studio:** [static.html](static.html).
**Original V0.3 authored world and GLB remain intact:** [duderworld-v0-3.html](duderworld-v0-3.html).

V0.4 is a **tooling upgrade**, not a multiplayer minigame: DuderLab creates characters, DuderWorld builds environments, and Unity/TrontEOS owns networking, rigidbodies, gameplay and final runtime assembly. The offline studio is a lightweight WebGL/Canvas inspection tool. It is deliberately *not* a replacement for the full V0.3 art; the production `src/archipelago.mjs` now consumes the same deterministic layout graph.

- 3–12 island recipes; radial, ring, chain or hybrid bridge graphs
- Seeded layout variation, collision-free footprints, semantic zone names
- Original V0.3 seven-island preset preserved as the default
- Bridge openings driven by adjacency rather than hardcoded centre spokes
- JSON recipes, Unity semantic metadata, collision proxies, navigation links
- Static grouped GLB export from the studio (physics actors are not baked as actors)
- WebGL2 display with Canvas2D fallback for restricted QA browsers

```sh
npm ci
npm run test:layout
npm run build:studio
npm run test:archipelago
npm run export:worldmeta # optional recipe/output arguments
```

**Important scope note:** the V0.4 standalone studio uses a simplified geometry preview. The existing V0.3 Three.js source retains its higher-detail 305,750-triangle art and now accepts `{islandCount, topology, variation, spread}`. Existing V0.3 prebuilt GLB and HTML remain unchanged. In the V0.3 generator, some decorative physics toys are still baked into the scenery; the metadata defines future separately spawned interactables for Unity, rather than claiming those have been decoupled already.

---

# DuderWorld V0.3 — Tront-EOS social archipelago

**The preserved V0.3 scene is [duderworld-v0-3.html](duderworld-v0-3.html).** Open it
directly in a modern desktop browser: it is a **self-contained, offline**
Three.js island world, no server, license-sensitive imported models, or CDN.

![V0.3 world from directly above](docs/media/duderworld-v0-3-overhead.png)

![V0.3 skatepark and connected activity islands](docs/media/duderworld-v0-3-skate.png)

The [original archipelago concept](docs/concepts/duderworld-archipelago-concept-v0-3.png)
is an aspirational illustration. V0.3 models its seven-area layout with:

- One 47 m-wide central skate park: **two actual recessed bowl openings**
  through the floor, curved halfpipe, kicker ramps, grind rail, toy blocks,
  spectator benches and promenade.
- Six physically connected smaller islands: friends plaza, positional voice
  lounge, three matchmaking/session gates, co-op physics yard, arcade,
  and networking observatory.
- Irregular layered rocky coastlines, styled cliffs, foamy shoreline,
  arched bridges with posts and structural supports, curved walls, towers,
  lighthouses, neon panels, signs, pavers, palm trees and islands.
- All baked geometry is **indexed with authored normals and vertex colors**,
  with independent mesh groups for the seven islands, bridges, water and
  offshore details. The default build contains **305,750 triangles /
  227,625 indexed vertices / 18 static material batches**.
- **60 instanced preview duders** populate all seven areas, waving,
  walking and performing choreographed aerial tumbles. These animations
  are **not real ragdoll physics and not connected to EOS**. They are
  viewport-only scale references and do not enter the GLB export.

Controls: drag orbit; right-drag pan; mousewheel zoom; press **1** for
top-down, **2** or **F** for walk mode, click to capture the mouse, move with
**WASD**, sprint with **Shift**, release pointer lock with **Esc**.
The UI adjusts island spacing, level-of-detail and greenery, and supports
**reroll**, outline preview, show/hide duders, recipe JSON export and
**BAKE UNITY GLB**.

For direct import, use [duderworld-archipelago-v0-3.glb](duderworld-archipelago-v0-3.glb):
11.9 MB, glTF 2.0 with 18 mesh primitives under spatially grouped nodes.
Unit = 1 meter, +Y up, platform top = 0 meters. Unity still needs
colliders, spawned networked rigidbodies, navigation, duder controllers
and actual EOS integration; scenic skateboards/balls/blocks in this bake
are not individually networked interactables.

### Rebuild and validate V0.3

Run within this repo after npm ci:

- npm run build:archipelago — creates the standalone V0.3 HTML.
- npm run bake:archipelago — creates the indexed GLB.
- npm run test:archipelago — checks the entire mesh including normals,
  triangulation, both bowl holes, and the six bridge landings.

The three docs/media/duderworld-v0-3-* PNGs are independent Mesa GLES 3
software renderings of the baked GLB for geometry verification. Their simple
shading does not represent Three.js lighting or a browser benchmark.

---

## Previous geometry-only interior (V0.2)

A parametric, dense 3D lobby environment for future **Tront-EOS** demo scenes. The second geometry pass is a deliberate response to the generated top-down concept: the first room lacked architectural height, portal recesses, details, colour and landscaping. This build contains **level geometry only**: no duder characters, networking, physics, navmesh, or objectives.

![Code-generated DuderWorld geometry from overhead](docs/media/duderworld-topdown.png)

## Play with the level

Open **`static.html`** directly in a WebGL2-capable browser. The single HTML file contains Three.js, OrbitControls, GLTFExporter, geometry code, shaders, and UI. It works using `file://` without a server or CDN.

- Drag to orbit, right-drag to pan, scroll to zoom.
- `T` switches the overhead orthographic camera on/off.
- `O` toggles the thin preview-only reverse-cull shell outlines. They start **off** so the stacked architectural details look clean; the GLB never includes them.
- `R` restores the recipe. Use the sliders for width, depth, plaza radius, and profile resolution; reroll changes plant placement deterministically.
- **Save Recipe** downloads the current JSON. **Bake GLB** downloads the currently selected geometry with welded indexed records, smooth normals, and vertex colors.

The baked [duderworld-lobby-v0-2.glb](duderworld-lobby-v0-2.glb) is also included for immediate import through a glTF-capable Unity importer. It stores ordinary static meshes: a common vertex-coloured environment mesh and one emissive/portal mesh. The preview outline shell, Three.js lights, controls, and UI are deliberately excluded from the export. One scene unit equals one metre.

## Geometry implementation

`src/world.mjs` is the only source of level shapes. It generates two indexed geometry batches directly from `DEFAULT_RECIPE` plus editable parameters. No stock 3D models, external textures, or AI-generated images are imported into the scene.

| Operation | Lobby geometry |
| --- | --- |
| Continuous radial tessellation | Colourful integrated central plaza medallion with baked geometric DUDER LAB lettering |
| Offset ceramic tile patches | Subtly varied square floor tiles surrounding the medallion; no texture maps or extra material calls |
| Rounded-box SDF projection | Substantial layered perimeter, portal recesses and crowns, riser stairs, terrace, wall trim, illuminated sconces |
| Closed sweeps and curved solids | Nested portal arches, layered threshold steps, four-part sofas with separate backrests and seat cushions |
| Lathed profiles | Striped corner towers, planters, lobby fountain and integrated lounge tables |
| Analytic ellipsoids | Dense stylized succulent clusters and long planter troughs |
| Paired rendering buckets | Opaque architectural geometry + emissive portal/water/lights; **two scene mesh batches** |

Smooth normals are authored for these shapes; identical compatible position/normal/colour records are welded into each indexed batch. Colour seams retain distinct records where required. Architectural pieces are intersecting solids, not a single boolean-unioned watertight mesh. Geometry is immutable once built; changing a recipe regenerates it deterministically.

Default 32 m × 24 m level: **66,822 triangles, 39,459 indexed vertex records, and two static geometry batches**. The optional preview shell and shadows add their own rendering work; these counts are not total rendering passes or a hardware benchmark. The heavier geometry is the consequence of modeling more of the concept rather than painting flat decals.

## Source and bake

With Node installed:

```sh
npm ci
npm run build
npm run bake
npm test
```

`npm run build` creates the offline `static.html` using esbuild. `npm run bake` creates the default GLB using Three.js `GLTFExporter`; the viewer's download button bakes whichever recipe is currently shown instead. `npm test` runs geometry checks across 27 width/depth/detail combinations plus a GLB roundtrip through Three.js's loader.

Independent Mesa/GLES captures in `docs/media/` confirm the *same generated geometry buffers* from two angles, using a deliberately basic validation shader rather than Three.js's lighting setup. They are not browser screenshots or performance measurements. The Three.js viewer is the intended interactive visual reference.

## Unity handoff

Import the `.glb` with a glTF-compatible importer in Unity, then add static colliders, spawn points, navigation, interaction volumes and EOS networking. Those systems are intentionally out of scope here. A single merged mesh is easy to render and rigidly bake, but you'll likely want per-room collision proxies and instanced decoration for a shipping scene with many copies.

## Bundled licenses

The character and environment meshes are original deterministic procedural geometry, not imported art packs. The build bundles **Three.js 0.180.0** (MIT) and uses **esbuild 0.25.12** (MIT) as a build dependency. Their license texts are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No project-wide license has been assigned to the DuderWorld-specific source.
