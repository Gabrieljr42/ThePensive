/** Substance specs and the object manifest the study scene builds from. */

export const clearColor = "#0b1018";

export const materials = {
  stone: {
    color: "#d4c4ae",
    roughness: 0.91,
    metalness: 0.02,
    bumpScale: 0.042,
    relief: true,
  },
  wood: {
    color: "#7a5234",
    roughness: 0.56,
    metalness: 0,
    bumpScale: 0.022,
    relief: true,
  },
  leather: {
    color: "#4a2f28",
    roughness: 0.74,
    metalness: 0,
    bumpScale: 0.02,
    relief: true,
  },
  paper: {
    color: "#e7d5b4",
    roughness: 0.95,
    metalness: 0,
    bumpScale: 0.006,
    relief: true,
  },
  brass: {
    color: "#8d7344",
    roughness: 0.34,
    metalness: 0.86,
    bumpScale: 0.01,
    relief: true,
  },
  liquid: {
    color: "#c9d8dc",
    roughness: 0.11,
    metalness: 0.8,
    bumpScale: 0.014,
    relief: false,
    viewDependentHighlight: true,
  },
};

export const room = {
  width: 5.4,
  height: 3.2,
  wallZ: -1.64,
  wallThickness: 0.18,
  floorZ0: -1.75,
  floorZ1: 2.55,
};

export const desk = {
  x: 0,
  z: 0.02,
  topY: 0.76,
  top: [1.9, 0.05, 1.06],
};

export const still = {
  position: [0.46, 2.12, 1.7],
  target: [0.06, 0.86, -0.42],
  fov: 52,
};

export const basin = {
  id: "penseira",
  x: -0.34,
  z: -0.1,
  pedestal: {
    height: 0.28,
    footRadius: 0.18,
    stemRadius: 0.066,
    capitalRadius: 0.16,
  },
  rim: {
    outerRadius: 0.36,
    innerRadius: 0.27,
    thickness: 0.082,
  },
  liquid: {
    radius: 0.248,
  },
};

export const shelf = {
  x0: 0.12,
  x1: 1.08,
  z: -1.34,
  depth: 0.3,
  thickness: 0.04,
  upright: 0.058,
  levels: [1.02, 1.5],
  top: 2.0,
};

export const observatoryWindow = {
  centerX: -0.98,
  sillY: 0.9,
  width: 0.8,
  height: 1.16,
};

export const candle = {
  x: 0.8,
  z: 0.4,
  height: 0.13,
};

const parts = ["boards", "spine", "pages"];

export const books = [
  {
    id: "codex-oxblood",
    height: 0.31,
    width: 0.058,
    depth: 0.22,
    color: "#6b2c2a",
    gilt: true,
    near: true,
    parts,
    placement: { x: 0.38, z: 0.02, yaw: -1.18, lean: 0.02, pose: "standing", surface: "desk" },
  },
  {
    id: "codex-forest",
    height: 0.25,
    width: 0.05,
    depth: 0.2,
    color: "#24352c",
    gilt: false,
    near: true,
    parts,
    placement: { x: 0.54, z: 0.14, yaw: -0.48, lean: 0.07, pose: "standing", surface: "desk" },
  },
  {
    id: "codex-navy",
    height: 0.28,
    width: 0.064,
    depth: 0.23,
    color: "#1c2740",
    gilt: true,
    near: true,
    parts,
    placement: { x: 0.7, z: -0.04, yaw: 0.28, lean: -0.05, pose: "standing", surface: "desk" },
  },
  {
    id: "quarto-chestnut",
    height: 0.23,
    width: 0.046,
    depth: 0.18,
    color: "#6a4a32",
    gilt: false,
    near: true,
    parts,
    placement: { x: 0.46, z: 0.4, yaw: 0.72, lean: 0, pose: "flat", surface: "desk" },
  },
  {
    id: "shelf-ink",
    height: 0.22,
    width: 0.042,
    depth: 0.17,
    color: "#3a241c",
    gilt: false,
    near: false,
    parts,
    placement: { x: 0.24, z: -1.32, yaw: 0.04, lean: 0, pose: "standing", surfaceY: 1.02 },
  },
  {
    id: "shelf-umber",
    height: 0.3,
    width: 0.07,
    depth: 0.21,
    color: "#4e3428",
    gilt: true,
    near: false,
    parts,
    placement: { x: 0.38, z: -1.32, yaw: -0.02, lean: 0, pose: "standing", surfaceY: 1.02 },
  },
  {
    id: "shelf-soot",
    height: 0.26,
    width: 0.05,
    depth: 0.19,
    color: "#2a2420",
    gilt: false,
    near: false,
    parts,
    placement: { x: 0.52, z: -1.31, yaw: 0.05, lean: 0.12, pose: "standing", surfaceY: 1.02 },
  },
  {
    id: "shelf-russet",
    height: 0.33,
    width: 0.06,
    depth: 0.22,
    color: "#5a3a28",
    gilt: true,
    near: false,
    parts,
    placement: { x: 0.68, z: -1.32, yaw: 0, lean: 0, pose: "standing", surfaceY: 1.02 },
  },
  {
    id: "shelf-midnight",
    height: 0.21,
    width: 0.04,
    depth: 0.16,
    color: "#1a2030",
    gilt: false,
    near: false,
    parts,
    placement: { x: 0.26, z: -1.32, yaw: 0.03, lean: 0, pose: "standing", surfaceY: 1.5 },
  },
  {
    id: "shelf-wine",
    height: 0.27,
    width: 0.055,
    depth: 0.2,
    color: "#3e2a24",
    gilt: true,
    near: false,
    parts,
    placement: { x: 0.42, z: -1.31, yaw: -0.04, lean: -0.08, pose: "standing", surfaceY: 1.5 },
  },
  {
    id: "shelf-garnet",
    height: 0.24,
    width: 0.048,
    depth: 0.18,
    color: "#4a3030",
    gilt: false,
    near: false,
    parts,
    placement: { x: 0.56, z: -1.32, yaw: 0.02, lean: 0, pose: "standing", surfaceY: 1.5 },
  },
  {
    id: "shelf-moss",
    height: 0.29,
    width: 0.062,
    depth: 0.21,
    color: "#2c382e",
    gilt: false,
    near: false,
    parts,
    placement: { x: 0.72, z: -1.32, yaw: 0.06, lean: 0, pose: "standing", surfaceY: 1.5 },
  },
];
