# Motion Studio integration plan for the existing After Effects MCP server

> **Proposal, not a claim of runtime integration.** Retain the current Node.js + `AE-MCP-Bridge.jsx` architecture and extend it incrementally. Avoid shipping a parallel Python MCP runtime unless benchmarking establishes a concrete need.

## Why extend this server?

The repository already implements Claude-compatible stdio tools for inspection, composition/layer manipulation, keyframes, expressions, effects, media, and rendering. This is a better foundation than introducing a second runtime that would compete for After Effects control.

## Source material

The independently prepared Motion Studio beta contains a catalog of **39** expression recipes and a Python proof-of-concept. Before importing them, review expression safety and the existing server's naming conventions. Source material is distributed separately as `after-effects-motion-mcp-github-ready.zip`; this PR deliberately does not merge the Python server.

## Proposed modules

| Module | Scope | Initial release constraints |
|---|---|---|
| Expression catalog | Query presets by ID, category and target property | Read-only until code and controls are validated |
| Logo Motion | Cinematic / minimal / punch reveals | Transform animation only; do not redraw brand artwork |
| Kinetic Typography | Character / word / line choreography | Preserve source text and subtitle timing |
| Holographic Workbench | Glow, scanlines, projection and signal modulation | Avoid rapid flicker; support photosensitivity-safe mode |
| Camera & 3D | Parallax, 3D light stage, hero-camera rigs | Native AE layer/camera controls, not actual mesh extrusion |
| Quality Control | Project snapshots, diff, undo checkpoints | Client asset locks respected |

## Proposed tool API

- `list_motion_presets({category?})`: read-only preset discovery
- `get_motion_preset({id})`: read-only code, expected property, controls, caveats
- `apply_motion_preset({comp,layer,id,approved})`: constrained apply, audit log
- `animate_logo({comp,layer,style,durationFrames,approved})`: preserves source art
- `build_hologram({comp,layer,intensity,approved})`: effect-stack builder
- `create_camera_rig({comp,style,approved})`: non-destructive rig
- `snapshot_comp({comp})`: read-only layer-property summary before and after mutation

## Compatibility & security

1. Reuse the existing directory-queue bridge, JSON parser, and per-command undo system.
2. Keep `run_script` disabled by default; never execute arbitrary model-produced ExtendScript automatically.
3. Treat media/brand references as immutable assets; never rewrite packaging or logo graphics.
4. Require user review and approval for destructive or project-changing operations.
5. Maintain per-operation audit records and cap timeouts.
6. Add tests through the current Node VM fake AE DOM, and separately verify on a real After Effects installation.
7. Version APIs and write migration notes before introducing any breaking changes.

## Suggested acceptance tests

- Read-only preset listing works without After Effects being open.
- Tool rejects nonexistent preset IDs and incompatible property targets.
- Effect sliders attach with known names and default values.
- Existing keyframes/expressions are preserved or user is warned before replacement.
- Locked layers cannot be modified.
- Undo restores project state after each mutation.
- Brand/logo source layers are not rasterized, redrawn, or replaced.
- A real AE 2026 project passes an end-to-end smoke test.

## Immediate next step

Build one narrow vertical slice: **browse expression preset → inspect target → approved apply → verify expression error → undo**. After this passes the existing Node test suite and real AE testing, expand to logo and holographic recipe stacks.

## Reference bundle

The separately available `after-effects-motion-mcp-github-ready.zip` contains the complete initial 39-preset catalog and example Python bridge. It remains a reference artifact rather than a replacement for the existing Node server.
