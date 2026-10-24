# DuderWorld V0.2 — pastel geometry-first Three.js lobby

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
