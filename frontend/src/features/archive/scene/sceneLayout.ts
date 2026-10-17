import { fbmNoise } from "./noise.ts";

export type MaterialRoleName = "stone" | "wood" | "cloth" | "metal";

export interface MaterialRole {
  name: MaterialRoleName;
  color: string;
  roughness: number;
  metalness: number;
  repeat: [number, number];
  strength: number;
  /** Shifts the shared noise tile so this substance is not the floor pattern. */
  offset: [number, number];
}

export const materialRoles: Record<MaterialRoleName, MaterialRole> = {
  stone: {
    name: "stone",
    color: "#6a7684",
    roughness: 0.9,
    metalness: 0.02,
    repeat: [36, 42],
    strength: 0.7,
    offset: [0.05, 0.13],
  },
  wood: {
    name: "wood",
    color: "#6d4a30",
    roughness: 0.74,
    metalness: 0.03,
    repeat: [13, 1.35],
    strength: 0.5,
    offset: [0.41, 0.08],
  },
  cloth: {
    name: "cloth",
    color: "#ffffff",
    roughness: 0.84,
    metalness: 0.0,
    repeat: [1.7, 2.8],
    strength: 0.36,
    offset: [0.22, 0.57],
  },
  metal: {
    name: "metal",
    color: "#5e5346",
    roughness: 0.64,
    metalness: 0.38,
    repeat: [2.4, 2.4],
    strength: 0.22,
    offset: [0.73, 0.19],
  },
};

/** Deterministic field the meshes sample. Same coordinates, different roles, different values. */
export function sampleMaterialField(
  role: MaterialRoleName,
  x: number,
  y: number,
): number {
  const spec = materialRoles[role];
  return fbmNoise(x + spec.offset[0] * 9, y + spec.offset[1] * 9, 3);
}

export interface ShelfSide {
  id: "left" | "right";
  originX: number;
  xDirection: 1 | -1;
  reach: number;
  zStart: number;
  zStep: number;
  rows: number;
  levels: number;
  booksPerRow: number;
  levelPitch: number;
  lean: number;
  /** Skip an entire bay so the run of shelves is not continuous. */
  missingRow: number | null;
}

export const shelfSides: readonly ShelfSide[] = [
  {
    id: "left",
    originX: -2.42,
    xDirection: -1,
    reach: 2.15,
    zStart: 0.28,
    zStep: 1.18,
    rows: 6,
    levels: 5,
    booksPerRow: 12,
    levelPitch: 0.84,
    lean: 0.07,
    missingRow: null,
  },
  {
    id: "right",
    originX: 3.05,
    xDirection: 1,
    reach: 1.35,
    zStart: 1.22,
    zStep: 1.66,
    rows: 4,
    levels: 4,
    booksPerRow: 8,
    levelPitch: 1.02,
    lean: -0.12,
    missingRow: 2,
  },
];

export interface BookPlacement {
  x: number;
  y: number;
  z: number;
  tilt: number;
  width: number;
  height: number;
  depth: number;
  color: string;
}

const clothColors = [
  "#6a3d32",
  "#3e4a5e",
  "#3f5646",
  "#6d4c34",
  "#53405f",
  "#343c48",
  "#7c5b39",
];

export function booksForSide(side: ShelfSide): BookPlacement[] {
  const books: BookPlacement[] = [];
  for (let row = 0; row < side.rows; row += 1) {
    if (side.missingRow === row) continue;
    const z = side.zStart + row * side.zStep;
    for (let level = 0; level < side.levels; level += 1) {
      const shelfY = 0.4 + level * side.levelPitch;
      for (let book = 0; book < side.booksPerRow; book += 1) {
        if (side.id === "right" && level === 0 && book > 2 && book < 5)
          continue;
        const height = 0.46 + ((book * 5 + level * 3 + row) % 7) * 0.028;
        const width = 0.068 + ((book * 3 + row) % 4) * 0.011;
        const along = (book / side.booksPerRow) * side.reach;
        const tilt =
          book % 8 === 0 ? side.lean : book % 5 === 0 ? side.lean * 0.35 : 0;
        books.push({
          x: side.originX + side.xDirection * along,
          y: shelfY + height / 2,
          z,
          tilt,
          width,
          height,
          depth: side.id === "left" ? 0.36 : 0.3,
          color:
            clothColors[
              (book * 3 + level + row * (side.id === "left" ? 1 : 2)) %
                clothColors.length
            ],
        });
      }
    }
  }
  return books;
}

export interface PlacedObject {
  id: string;
  role: MaterialRoleName | "wax";
  position: [number, number, number];
  rotation: [number, number, number];
  space: "world" | "desk";
}

/** Objects that are turned or slid off the shelf grid. */
export const inhabitedObjects: readonly PlacedObject[] = [
  {
    id: "pulled-volume",
    role: "cloth",
    position: [2.28, 0.16, 2.15],
    rotation: [0.22, 1.15, 0.48],
    space: "world",
  },
  {
    id: "reading-stool",
    role: "wood",
    position: [1.78, 0.28, 1.92],
    rotation: [0, 0.78, 0.05],
    space: "world",
  },
  {
    id: "wax-spill",
    role: "wax",
    position: [-0.86, 0.525, 0.5],
    rotation: [-Math.PI / 2, 0, 0.66],
    space: "desk",
  },
];

export const deskPose = { x: -0.36, z: 0.65, yaw: -0.09 };

export const deskSupports = [
  { x: -1.05, z: 0.02, rotY: 0.02, width: 0.11, height: 0.46 },
  { x: 1.32, z: -0.16, rotY: -0.2, width: 0.18, height: 0.4 },
] as const;

export const shelfCases = [
  {
    id: "left",
    position: [-3.75, 2.4, 3.4] as const,
    size: [1.75, 5.5, 8.8] as const,
  },
  {
    id: "right",
    position: [3.95, 1.95, 4.55] as const,
    size: [1.25, 4.15, 6.2] as const,
  },
];

/** Local to the observatory window. Kept off the desk's x so the moon is not parked above it. */
export const moonLocal = { x: -1.62, y: 1.72, z: -2.18 };

export function objectBreaksGrid(object: PlacedObject): boolean {
  const [rx, ry, rz] = object.rotation;
  const turned = Math.abs(ry) > 0.25 || Math.abs(rz) > 0.2;
  const axis =
    Math.abs(rx % (Math.PI / 2)) > 0.2 &&
    Math.abs(Math.abs(rx % (Math.PI / 2)) - Math.PI / 2) > 0.2;
  return turned || axis;
}
