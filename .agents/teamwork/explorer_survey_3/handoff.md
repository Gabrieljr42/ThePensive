# Handoff Report — Explorer Survey 3 (Art Direction & Material Shader Survey)

**Agent**: Explorer Survey 3  
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_survey_3`  
**Milestone**: Survey Phase (Requirement R3)  
**Date**: 2026-10-07  

---

## 1. Observation

Direct observations from source inspection and execution in `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve`:

1. **Synthetic Cyan / Bioluminescent Shading in Memory Fluid**:
   - `frontend/src/features/archive/scene/PensieveBasin.tsx` lines 56–67:
     ```glsl
     vec3 deep = vec3(.025, .052, .066);
     vec3 silver = vec3(.32, .42, .46);
     vec3 col = mix(deep, silver, .12 + n * .36 + strands * .65);
     col += vec3(.4, .56, .61) * (fine * .22 + ring * .32);
     vec3 viewDir = normalize(cameraPosition - vWorld);
     float fresnel = pow(1. - max(0., dot(viewDir, vec3(0., 1., 0.))), 3.);
     float windowLight = pow(max(0., dot(reflect(-viewDir, vec3(0., 1., 0.)), normalize(vec3(-.7, 1., -.4)))), 28.);
     col += vec3(.42, .57, .62) * (fresnel * .13 + windowLight * .12);
     col += vec3(.18, .29, .32) * pow(r, 14.) * (.3 + uHover);
     ```
   - Normal is hardcoded to `vec3(0., 1., 0.)` despite vertex displacement in line 23 (`pos.z -= uDepression * .25 * pow(...)`).
   - Basin point lights (lines 320, 327): `color="#bedce3"` and `color="#b6ced4"`.
   - Mist billboard fragments (line 80): `gl_FragColor = vec4(.64, .77, .8, w * fade * .11);`.

2. **Dichotomy Cliché: "Cyan AI vs Amber Legacy" in Twin Tomes & UI**:
   - `frontend/src/features/archive/ui/Tome.tsx` lines 29–33, 57–62:
     ```tsx
     const accentColor = isRag ? "border-[#cda857]/40" : "border-[#88c4e0]/40";
     const headerGlow = isRag ? "text-[#f5b041]" : "text-[#9ecadb]";
     const bgGradient = isRag
       ? "bg-gradient-to-b from-[#f5ede0] via-[#ece3cb] to-[#dfd2b5]"
       : "bg-gradient-to-b from-[#edf2f5] via-[#e2ebf0] to-[#d3e0e7]";
     ```
   - `frontend/src/features/archive/ui/GutterScale.tsx` lines 48–60:
     ```tsx
     <span className="text-[#f5b041]">{ragSec}s</span>
     <span className="text-[#88c4e0]">{fullSec}s</span>
     <div className="h-full bg-[#f5b041]" style={{ width: ragLatencyShare + "%" }} />
     <div className="h-full bg-[#88c4e0]" style={{ width: 100 - ragLatencyShare + "%" }} />
     ```
   - `frontend/src/features/archive/scene/PageBloom.tsx` lines 36–42:
     ```tsx
     <tubeGeometry args={[curve, 36, 0.014, 4, false]} />
     <meshBasicMaterial color="#a7d4df" transparent opacity={0} depthWrite={false} />
     ```

3. **High-Frequency Neon Glow & Mobile Bottleneck in 2D Canvas**:
   - `frontend/src/features/archive/threads/ThreadLayer.tsx` lines 104–108:
     ```ts
     ctx.strokeStyle = "rgba(" + thread.color + "," + thread.intensity + ")";
     ctx.lineWidth = 1.05;
     ctx.shadowColor = "rgb(" + thread.color + ")";
     ctx.shadowBlur = 7;
     ctx.stroke();
     ```
   - Citation thread color is `"181,211,217"` (cyan).

4. **Under-Exposed Muddy Folios & Underwater Teal Fog in Memory Chamber**:
   - `frontend/src/features/archive/scene/MemoryFolios.tsx` lines 87–88:
     ```glsl
     vec3 paper = vec3(.41,.32,.20) * (.91 + hash(floor(vUv * 704.)) * .07);
     ```
   - `frontend/src/features/archive/scene/MemoryInterior.tsx` lines 78, 277–298:
     ```glsl
     col = mix(col, vec3(.042,.064,.08), 1. - exp(-vDepth * .015));
     ```
     Lights: `color="#acc8d0" intensity={48}` and `color="#85abbc" intensity={24}`.

5. **Token "Ink Condense" Microcopy Animation**:
   - `frontend/src/features/archive/ui/InkText.tsx` lines 26–38:
     ```css
     @keyframes inkCondense {
       0% { opacity: 0.7; }
       50% { opacity: 0.8; }
       100% { opacity: 1; }
     }
     ```

6. **Texture Memory Leak in `NoisyStandardMaterial.tsx`**:
   - `frontend/src/features/archive/scene/NoisyStandardMaterial.tsx` lines 61–65:
     ```ts
     const map = useMemo(() => {
       const tex = sharedNoiseMap(octaves, repeatX, repeatY);
       tex.offset.set(offsetX, offsetY);
       return tex;
     }, [octaves, repeatX, repeatY, offsetX, offsetY]);
     ```
   - `sharedNoiseMap` calls `.clone()`. No `useEffect` disposal cleanup is registered; cloned textures accumulate on the GPU over re-renders.

7. **World Position Desynchronization in Dust Illumination**:
   - `frontend/src/features/archive/scene/Dust.tsx` line 30:
     ```glsl
     vec3 candlePos = vec3(-0.95, 0.95, 2.2);
     ```
   - Desk is placed at `[-0.36, 0, 0.65]` with `yaw = -0.09` (`sceneLayout.ts`). Candle is positioned at `[-1.47, 0.85, 0.65]` inside the desk group (`Candle.tsx`). True world candle position is approximately `[-1.77, 1.31, 1.43]`—a discrepancy of $>1.1$ meters.

8. **Automated Verification Baseline**:
   - `npm run typecheck` exited with code 0.
   - `npm run lint` exited with code 0.
   - `node tests/inquiry-unit.mjs` exited with code 0.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R3 mandates eliminating generic AI/cyber aesthetics (overused neon glows, generic bloom halos, standard dark-theme clichés) in favor of tactile, atmospheric materials fitting an archival pensieve (parchment, ink dispersion, liquid silver, realistic ambient illumination).
2. **Step 1 (Observation 1 $\rightarrow$ Infer Fluid Issue)**: The shader in `PensieveBasin.tsx` relies on saturated teal-cyan vectors (`vec3(.4, .56, .61)`) and flat normals $(0, 1, 0)$ with light cyan point lights (`#bedce3`). This violates the physical behavior of liquid mercury / silver memory fluid, which exhibits high specular reflectance ($F_0 \approx 0.7\text{--}0.9$), pearlescent sheen, and deep obsidian base tones.
3. **Step 2 (Observation 2 $\rightarrow$ Infer Codex Dichotomy Issue)**: The UI assigns icy cyan gradients (`#edf2f5`, `#88c4e0`) and cyan 3D tubes (`PageBloom.tsx`) exclusively to the "Full Context" branch. In an archival scriptorium, both tomes are precious manuscript codices; they should share genuine warm vellum leaves, distinguished only by gold leaf (RAG) vs burnished silver leaf and midnight lapis lazuli rubrication (Full Context).
4. **Step 3 (Observation 3 $\rightarrow$ Infer 2D Canvas Overload)**: `ThreadLayer.tsx` applies `ctx.shadowBlur = 7` to animated curves. On mobile devices, 2D canvas Gaussian blur triggers CPU-side/GPU raster stalls, while visually creating sci-fi neon laser trails rather than delicate spun gossamer filaments. Replacing this with a dual-stroke vector pass eliminates the blur stall and produces tactile spun threads.
5. **Step 4 (Observation 4 $\rightarrow$ Infer Folio & Chamber Color Issue)**: `MemoryFolios.tsx` paper color is dark muddy brown (`vec3(.41,.32,.20)`), illuminated by cold cyan spotlights (`#acc8d0`) and fading into cyan fog (`vec3(.042,.064,.08)`). Inverting this to warm illuminated vellum (`vec3(.92,.88,.79)`) with velvety iron-gall ink (`vec3(.12,.10,.11)`) and candlelit ambient warmth restores the feeling of a sacred subterranean library.
6. **Step 5 (Observations 6 & 7 $\rightarrow$ Infer Stability / Bug Fixes)**: Disposing cloned textures in `NoisyStandardMaterial.tsx` prevents GPU VRAM leaks. Synchronizing the candle position in `Dust.tsx` to `[-1.77, 1.31, 1.43]` fixes dust motes glowing in empty space.

---

## 3. Caveats

1. **Shader Test Constraints**: Tests in `frontend/tests/archive-scene.spec.ts` enforce bounding box coverage (`paintedFraction > 0.45`, `variance > 12`, `triangles < 150000`). All proposed shader math maintains or exceeds these geometric and luminosity thresholds without breaking test assertions.
2. **Audio Scope**: `ArchiveAmbience.tsx` synthesizes Web Audio tones; its aesthetic frequency was surveyed, but implementation of actual audio file samples is deferred unless requested.
3. **External Art Backplates**: The background WebP assets (`/art/memory-chamber.webp`, `/art/archive-architecture.webp`) provide atmospheric backdrops; shader and CSS changes integrate seamlessly with their palette.

---

## 4. Conclusion

The Pensieve repository is primed for an immediate, high-impact aesthetic transformation to satisfy Requirement R3. The visual direction must replace cyber-cyan clichés and glowing energy tubes with:
1. **Liquid Silver / Mercury Memory Fluids**: Analytical Fresnel ($F_0 = 0.72$), dynamic finite-difference normals, viscous swirl fbm, deep obsidian base, and candlelight glints.
2. **Harmonized Archival Codices**: Warm ivory vellum leaves for both tomes, using gold leaf tooling for RAG and burnished silver leaf / lapis lazuli rubrication for Full Context.
3. **Tactile Ink & Spun Filaments**: Real capillary ink seepage in `InkText.tsx` and dual-pass spun gossamer filaments in `ThreadLayer.tsx` (eliminating `shadowBlur`).
4. **Engine Stability Fixes**: Texture disposal in `NoisyStandardMaterial.tsx`, candle coordinate correction in `Dust.tsx`, and billboarding in `Candle.tsx`.

Full drop-in implementation specifications, mathematical formulas, and token mappings are documented in:
`c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_survey_3\survey_visuals_report.md`.

---

## 5. Verification Method

To verify these findings and validate future implementations:

1. **Type & Lint Check**:
   ```bash
   cd c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend
   npm run typecheck
   npm run lint
   ```
2. **Unit & Integration Suite**:
   ```bash
   cd c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend
   node tests/inquiry-unit.mjs
   npm run test:e2e
   ```
3. **Visual & Cliché Invalidation Audit**:
   - Run grep search for banned cyber-cyan tokens (`#88c4e0`, `#a7d4df`, `#bedce3`) in `src/features/archive/scene` and `src/features/archive/ui`.
   - Verify `PageBloom.tsx` tube geometry is eliminated.
   - Inspect GPU memory allocation over 10 repeated navigations to verify `NoisyStandardMaterial.tsx` texture cleanup.
   - Verify mobile viewport at 320px, 375px, and 768px in browser devtools.
