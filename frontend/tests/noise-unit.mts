import assert from "node:assert/strict";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  createArchiveQualityState,
  dustBudget,
  archiveFrameLoop,
  noteDetectedTier,
  noteReducedMotion,
  noteSceneMounted,
  pixelRatioCap,
} from "../src/features/archive/archiveBudget.ts";
import { candleLightIntensity } from "../src/features/archive/scene/candleLight.ts";
import {
  fbmNoise,
  noiseOctavesForTier,
  valueNoise2,
} from "../src/features/archive/scene/noise.ts";
import {
  booksForSide,
  deskPose,
  inhabitedObjects,
  materialRoles,
  moonLocal,
  objectBreaksGrid,
  sampleMaterialField,
  shelfSides,
} from "../src/features/archive/scene/sceneLayout.ts";

const lines: string[] = [];
function log(line: string) {
  lines.push(line);
  console.log(line);
}

const repeated = fbmNoise(2.25, 3.4, 5);
assert.strictEqual(repeated, fbmNoise(2.25, 3.4, 5));
assert.strictEqual(valueNoise2(-1.2, 4.8), valueNoise2(-1.2, 4.8));
log(`deterministic fbm(2.25, 3.4, 5)=${repeated}`);

const grid: number[] = [];
let octaveDelta = 0;
for (let y = 0; y < 12; y += 1) {
  for (let x = 0; x < 12; x += 1) {
    const px = x * 0.31 + 0.17;
    const py = y * 0.27 + 0.05;
    const full = fbmNoise(px, py, 4);
    const coarse = fbmNoise(px, py, 1);
    const single = valueNoise2(px, py);
    assert.ok(full >= 0 && full <= 1, `fbm out of range ${full}`);
    assert.ok(coarse >= 0 && coarse <= 1, `coarse out of range ${coarse}`);
    assert.ok(single >= 0 && single <= 1, `value noise out of range ${single}`);
    octaveDelta = Math.max(octaveDelta, Math.abs(full - coarse));
    grid.push(full);
  }
}

const distinct = new Set(grid.map((sample) => sample.toFixed(4)));
assert.ok(distinct.size > 8, `grid collapsed to ${distinct.size} values`);
assert.ok(octaveDelta > 0.01, `extra octaves were a no-op (${octaveDelta})`);
log(
  `grid distinct=${distinct.size} octaveDelta=${octaveDelta.toFixed(4)} min=${Math.min(...grid).toFixed(4)} max=${Math.max(...grid).toFixed(4)}`,
);

assert.strictEqual(noiseOctavesForTier("low"), 1);
assert.ok(noiseOctavesForTier("mid") > noiseOctavesForTier("low"));
assert.ok(noiseOctavesForTier("high") > noiseOctavesForTier("mid"));
assert.strictEqual(pixelRatioCap(), 1.25);
assert.strictEqual(dustBudget("low"), 0);
assert.ok(dustBudget("mid") < dustBudget("high"));
assert.strictEqual(
  archiveFrameLoop({ hidden: true, reducedMotion: false, tier: "high" }),
  "never",
);
assert.strictEqual(
  archiveFrameLoop({ hidden: false, reducedMotion: true, tier: "high" }),
  "demand",
);
assert.strictEqual(
  archiveFrameLoop({ hidden: false, reducedMotion: false, tier: "low" }),
  "demand",
);
assert.strictEqual(
  archiveFrameLoop({ hidden: false, reducedMotion: false, tier: "mid" }),
  "always",
);

let gate = createArchiveQualityState();
assert.strictEqual(gate.tier, "mid");
gate = noteDetectedTier(gate, "high");
assert.strictEqual(gate.tier, "mid");
assert.strictEqual(gate.pendingHigh, true);
gate = noteSceneMounted(gate);
assert.strictEqual(gate.tier, "high");
gate = noteReducedMotion(gate, true);
assert.strictEqual(gate.tier, "high");
gate = noteDetectedTier(gate, "high");
assert.strictEqual(gate.tier, "high");
log(
  "tier gate starts conservatively; motion preferences preserve material quality",
);

const dark = candleLightIntensity({ darkness: 1, hush: 0, flicker: 1 });
const hushed = candleLightIntensity({ darkness: 0, hush: 1, flicker: 1 });
const open = candleLightIntensity({ darkness: 0, hush: 0, flicker: 1 });
assert.ok(
  dark < open * 0.5,
  `darkness should dim the candle, got ${dark} vs ${open}`,
);
assert.ok(
  hushed < open,
  `hush should dim the candle, got ${hushed} vs ${open}`,
);
assert.strictEqual(candleLightIntensity({ darkness: 1, hush: 0 }), dark);
log(
  `candle still-light dark=${dark.toFixed(3)} hush=${hushed.toFixed(3)} open=${open.toFixed(3)}`,
);

let fieldDelta = 0;
for (let i = 0; i < 16; i += 1) {
  fieldDelta += Math.abs(
    sampleMaterialField("stone", i * 0.23, i * 0.19) -
      sampleMaterialField("wood", i * 0.23, i * 0.19),
  );
}
assert.ok(fieldDelta > 0.4, `stone and wood fields matched (${fieldDelta})`);
assert.notEqual(materialRoles.stone.color, materialRoles.wood.color);
assert.ok(materialRoles.metal.metalness > materialRoles.wood.metalness);
assert.ok(materialRoles.stone.roughness > materialRoles.cloth.roughness);
const leftBooks = booksForSide(shelfSides[0]);
const rightBooks = booksForSide(shelfSides[1]);
assert.notEqual(leftBooks.length, rightBooks.length);
assert.notEqual(shelfSides[0].zStep, shelfSides[1].zStep);
assert.notEqual(shelfSides[0].levels, shelfSides[1].levels);
const leftSpan =
  Math.max(...leftBooks.map((book) => book.z)) -
  Math.min(...leftBooks.map((book) => book.z));
const rightSpan =
  Math.max(...rightBooks.map((book) => book.z)) -
  Math.min(...rightBooks.map((book) => book.z));
assert.notEqual(Number(leftSpan.toFixed(2)), Number(rightSpan.toFixed(2)));
assert.ok(inhabitedObjects.some(objectBreaksGrid));
assert.notEqual(deskPose.yaw, 0);
assert.ok(Math.abs(moonLocal.x - deskPose.x) > 0.8);
log(
  `aisle leftBooks=${leftBooks.length} rightBooks=${rightBooks.length} fieldDelta=${fieldDelta.toFixed(3)} deskYaw=${deskPose.yaw}`,
);

const scratch = process.env.PENSIEVE_SCRATCH;
if (scratch) {
  mkdirSync(scratch, { recursive: true });
  appendFileSync(path.join(scratch, "noise-unit.log"), `${lines.join("\n")}\n`);
}
