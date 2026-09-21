# Kaelthûr — 3D RPG Character Showcase

Real WebGL2 scene built with Three.js: PerspectiveCamera, PBR materials, real
lights and shadows, a procedural HDR environment (PMREM), shader-driven VFX
(fresnel aura, spiral energy trails, rune rings, glowing ground cracks),
GPU-instanced 3D particles, and a post-processing chain (SSAO, UnrealBloom,
Bokeh depth-of-field, vignette + film grain, ACES tone mapping).

No build step required — everything runs as native ES modules via an
`importmap`, loading Three.js from a CDN.

## Run it

Browsers block ES module imports from `file://`, so serve the folder over
HTTP, e.g.:

```bash
cd character-showcase
python3 -m http.server 8080
# open http://localhost:8080
```

or `npx serve .`.

## Use your own character

Drop a rigged/unrigged model at:

```
assets/character/character.glb
```

`src/character/CharacterLoader.js` tries to load it automatically. If it's
missing (404), a fully procedural 3D placeholder — built from real meshes per
armor part (helm, chest, pauldrons, bracers, gauntlets, belt, greaves, boots,
cape, weapon) with PBR `MeshStandardMaterial`s — is used instead, so the scene
always renders something.

## Project structure

```
src/
  main.js              renderer, render loop, pointer input
  scene/
    Scene.js           wires character + ground + lights + VFX together
    Ground.js           stone pedestal mesh + glowing crack shader overlay
    Environment.js      fog, background, procedural PMREM environment
  character/
    CharacterLoader.js  GLTF loader with placeholder fallback
    PlaceholderCharacter.js  procedural mesh-based armor character
  camera/
    CameraRig.js        cinematic idle drift + mouse parallax
  lighting/
    Lighting.js          key / rim / fill / magic point lights
  vfx/
    Aura.js              fresnel + noise energy hull shader
    EnergyRings.js        rotating rune-segment ground rings
    EnergyTrails.js        spiral tube-geometry energy trails
  particles/
    ParticleSystem.js    GPU-instanced embers + ambient dust (real x/y/z motion)
  shaders/               GLSL sources used by the modules above
  postprocessing/
    Composer.js          SSAO -> Bloom -> Bokeh DoF -> vignette/grain -> ACES

assets/
  character/  drop character.glb here
  textures/   optional PBR texture maps
  environment/ optional .hdr (currently unused — env lighting is procedural)
```

## Interaction

- Move the cursor: camera parallax, character/light response.
- Hold the mouse down: VFX energy ramps up (brighter aura, faster particles).
