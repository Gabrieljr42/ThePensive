import * as THREE from "three";
import {
  basin,
  books,
  candle,
  clearColor,
  desk,
  materials,
  observatoryWindow,
  room,
  shelf,
  still,
} from "./manifest.mjs";

const tau = Math.PI * 2;

function hash(ix, iy) {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function noise(u, v) {
  const x = Math.floor(u);
  const y = Math.floor(v);
  const fx = fade(u - x);
  const fy = fade(v - y);
  const a = hash(x, y);
  const b = hash(x + 1, y);
  const c = hash(x, y + 1);
  const d = hash(x + 1, y + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fbm(u, v) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < 5; octave += 1) {
    value += noise(u * frequency, v * frequency) * amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

function makeTexture(size, painter, srgb) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const painted = painter(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      data[i] = painted[0];
      data[i + 1] = painted[1];
      data[i + 2] = painted[2];
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function gray(value) {
  const channel = Math.max(0, Math.min(255, Math.round(value)));
  return [channel, channel, channel];
}

const maps = {
  stone: {
    albedo: makeTexture(256, (u, v) => {
      const cloud = fbm(u * 3.2, v * 3.2);
      const fine = fbm(u * 11, v * 11);
      const pore = noise(u * 46, v * 46);
      let shade = 214 + (cloud - 0.5) * 28 + (fine - 0.5) * 16;
      if (pore > 0.78) shade -= (pore - 0.78) * 220;
      return gray(shade);
    }, true),
    bump: makeTexture(256, (u, v) => {
      const cloud = fbm(u * 3.4, v * 3.4);
      const pore = noise(u * 40, v * 40);
      let relief = 132 + cloud * 28;
      if (pore > 0.8) relief -= 55;
      return gray(relief);
    }, false),
  },
  wood: {
    albedo: makeTexture(256, (u, v) => {
      const warp = fbm(u * 1.6, v * 4);
      const grain = Math.sin((u * 16 + warp * 1.4) * Math.PI);
      const pore = noise(u * 70, v * 18);
      const shade = 196 + grain * 14 + warp * 12 + (pore - 0.5) * 10;
      return gray(shade);
    }, true),
    bump: makeTexture(256, (u, v) => {
      const warp = fbm(u * 1.6, v * 4);
      const grain = Math.sin((u * 16 + warp * 1.4) * Math.PI);
      return gray(128 + grain * 18 + warp * 10);
    }, false),
  },
  leather: {
    albedo: makeTexture(256, (u, v) => {
      const n = fbm(u * 10, v * 10);
      const pebble = noise(u * 36, v * 36);
      const crease = Math.pow(Math.abs(Math.sin(u * 8 + n * 3)), 8);
      const shade = 142 + n * 28 + (pebble - 0.5) * 24 - crease * 22;
      return gray(shade);
    }, true),
    bump: makeTexture(256, (u, v) => {
      const pebble = noise(u * 40, v * 40);
      const n = fbm(u * 8, v * 8);
      return gray(110 + pebble * 90 + n * 30);
    }, false),
  },
  paper: {
    albedo: makeTexture(256, (u, v, x) => {
      const fiber = noise(u * 20, v * 80);
      const line = Math.abs((v * 48) % 1 - 0.5) < 0.08 ? -18 : 0;
      const deckle = x < 3 || x > 252 ? -22 : 0;
      return gray(214 + fiber * 22 + line + deckle);
    }, true),
    bump: makeTexture(256, (u, v) => {
      const line = Math.sin(v * 96 * Math.PI);
      return gray(128 + line * 28 + noise(u * 24, v * 70) * 16);
    }, false),
  },
  brass: {
    albedo: makeTexture(256, (u, v) => {
      const tarnish = fbm(u * 4, v * 8);
      const streak = Math.sin((u * 3 + tarnish) * Math.PI * 2);
      return gray(186 + streak * 18 - tarnish * 28);
    }, true),
    bump: makeTexture(256, (u, v) => gray(140 + fbm(u * 7, v * 7) * 40), false),
  },
  ripple: makeTexture(128, (u, v) => {
    const x = u * 2 - 1;
    const y = v * 2 - 1;
    const radius = Math.hypot(x, y);
    const rings = Math.sin(radius * 34 + Math.sin(x * 7) * 1.6);
    const swirl = Math.sin(x * 16 + y * 13);
    const wake = Math.sin((x * 2.5 + y) * 11);
    return gray(128 + rings * 78 + swirl * 28 + wake * 18);
  }, false),
};

function tile(texture, repeatX, repeatY) {
  const copy = texture.clone();
  copy.repeat.set(repeatX, repeatY);
  copy.wrapS = THREE.RepeatWrapping;
  copy.wrapT = THREE.RepeatWrapping;
  copy.needsUpdate = true;
  return copy;
}

function standard(spec, mapSet, repeat, overrides = {}) {
  return new THREE.MeshStandardMaterial({
    color: overrides.color ?? spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    map: tile(mapSet.albedo, repeat[0], repeat[1]),
    bumpMap: tile(mapSet.bump, repeat[0], repeat[1]),
    bumpScale: spec.bumpScale,
    envMapIntensity: overrides.envMapIntensity ?? 0.6,
  });
}

const stoneMat = standard(materials.stone, maps.stone, [2.2, 2.2]);
const wallMat = standard(materials.stone, maps.stone, [3.5, 2.2], {
  color: "#847c74",
  envMapIntensity: 0.35,
});
const woodMat = standard(materials.wood, maps.wood, [2.4, 1.1], { envMapIntensity: 0.45 });
const floorMat = standard(materials.wood, maps.wood, [5, 7], {
  color: "#3d2b1e",
  envMapIntensity: 0.3,
});
const brassMat = standard(materials.brass, maps.brass, [1.5, 1.5], { envMapIntensity: 1.15 });
const paperMat = standard(materials.paper, maps.paper, [1, 10], { envMapIntensity: 0.25 });

const leatherCache = new Map();
function leatherFor(color) {
  const cached = leatherCache.get(color);
  if (cached) return cached;
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: materials.leather.roughness,
    metalness: materials.leather.metalness,
    map: tile(maps.leather.albedo, 2.4, 2.4),
    bumpMap: tile(maps.leather.bump, 2.4, 2.4),
    bumpScale: materials.leather.bumpScale,
    sheen: 0.45,
    sheenColor: new THREE.Color(color),
    sheenRoughness: 0.62,
    envMapIntensity: 0.55,
  });
  leatherCache.set(color, material);
  return material;
}

function liquidMaterial() {
  const spec = materials.liquid;
  const material = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    bumpMap: maps.ripple,
    bumpScale: spec.bumpScale * 5,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.22,
    iridescenceIOR: 1.35,
    emissive: "#8ea8ae",
    emissiveIntensity: 0.045,
    envMapIntensity: 1.65,
  });
  if (spec.viewDependentHighlight) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
        gl_FragColor.rgb += vec3(0.72, 0.84, 0.88) * pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0) * 0.26;`,
      );
    };
  }
  return material;
}

function lathe(points, segments = 72) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

function shade(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function buildBook(book) {
  const { height: h, width: w, depth: d } = book;
  const leather = leatherFor(book.color);
  const body = new THREE.Group();
  const radius = w / 2;
  const boardT = Math.min(0.011, w * 0.16);

  const pageD = d - radius - 0.01;
  const pages = shade(
    new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, h * 0.9, pageD), paperMat),
  );
  pages.name = "pages";
  pages.position.z = -d / 2 + 0.006 + pageD / 2;
  body.add(pages);

  const boardGeo = new THREE.BoxGeometry(boardT, h, d);
  const left = shade(new THREE.Mesh(boardGeo, leather));
  left.name = "boards";
  left.position.x = -(w / 2 - boardT / 2);
  const right = shade(new THREE.Mesh(boardGeo, leather));
  right.name = "boards";
  right.position.x = w / 2 - boardT / 2;
  body.add(left, right);

  const spine = shade(
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, h, 24, 1, false, -Math.PI / 2, Math.PI),
      leather,
    ),
  );
  spine.name = "spine";
  spine.position.z = d / 2 - radius;
  body.add(spine);

  const headband = shade(
    new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.007, 0.012), paperMat),
    false,
    false,
  );
  headband.position.set(0, h / 2 - 0.012, d / 2 - 0.008);
  body.add(headband);

  if (book.gilt) {
    for (const fraction of [-0.3, 0.3]) {
      const band = shade(
        new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.028, 0.008), brassMat),
        true,
        false,
      );
      band.position.set(0, h * fraction, d / 2 - 0.004);
      body.add(band);
    }
  }

  const placement = book.placement;
  const surfaceY = placement.surface === "desk" ? desk.topY : placement.surfaceY;
  const pivot = new THREE.Group();
  pivot.name = book.id;
  pivot.userData.role = "book";
  pivot.userData.height = h;
  pivot.userData.color = book.color;
  pivot.position.set(
    placement.x,
    surfaceY + (placement.pose === "flat" ? w / 2 : h / 2) + 0.001,
    placement.z,
  );
  pivot.rotation.y = placement.yaw || 0;
  const tilt = new THREE.Group();
  tilt.rotation.z = placement.pose === "flat" ? Math.PI / 2 : placement.lean || 0;
  tilt.add(body);
  pivot.add(tilt);
  return pivot;
}

function buildBasin() {
  const group = new THREE.Group();
  group.name = basin.id;
  group.userData.role = "basin";
  group.position.set(basin.x, desk.topY, basin.z);

  const foot = basin.pedestal;
  const pedestal = shade(
    new THREE.Mesh(
      lathe([
        [0.02, 0],
        [foot.footRadius, 0],
        [foot.footRadius * 0.96, 0.022],
        [foot.stemRadius * 1.7, foot.height * 0.12],
        [foot.stemRadius, foot.height * 0.34],
        [foot.stemRadius * 0.94, foot.height * 0.68],
        [foot.capitalRadius * 0.72, foot.height * 0.88],
        [foot.capitalRadius, foot.height],
        [0.02, foot.height],
      ]),
      stoneMat,
    ),
  );
  pedestal.name = "pedestal";
  group.add(pedestal);

  const rim = basin.rim;
  const bowl = shade(
    new THREE.Mesh(
      lathe([
        [0.02, 0],
        [rim.outerRadius * 0.42, 0],
        [rim.outerRadius * 0.72, rim.thickness * 0.16],
        [rim.outerRadius, rim.thickness * 0.55],
        [rim.outerRadius * 1.015, rim.thickness * 0.86],
        [rim.outerRadius * 0.97, rim.thickness],
        [(rim.outerRadius + rim.innerRadius) * 0.5, rim.thickness * 1.03],
        [rim.innerRadius, rim.thickness * 0.9],
        [rim.innerRadius * 0.985, rim.thickness * 0.42],
        [rim.innerRadius * 0.94, rim.thickness * 0.2],
        [0.02, rim.thickness * 0.18],
      ]),
      stoneMat,
    ),
  );
  bowl.name = "rim";
  bowl.position.y = foot.height;
  bowl.material = stoneMat.clone();
  bowl.material.map = tile(maps.stone.albedo, 1.1, 0.55);
  bowl.material.bumpMap = tile(maps.stone.bump, 1.1, 0.55);
  bowl.material.bumpScale = materials.stone.bumpScale * 0.55;
  bowl.material.side = THREE.DoubleSide;
  pedestal.material = stoneMat.clone();
  pedestal.material.map = tile(maps.stone.albedo, 1.4, 0.8);
  pedestal.material.bumpMap = tile(maps.stone.bump, 1.4, 0.8);
  pedestal.material.bumpScale = materials.stone.bumpScale * 0.45;
  group.add(bowl);

  const inlay = shade(
    new THREE.Mesh(new THREE.TorusGeometry(rim.outerRadius * 0.93, 0.011, 8, 48), brassMat),
    true,
    false,
  );
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = foot.height + rim.thickness * 0.78;
  group.add(inlay);

  const liquid = shade(
    new THREE.Mesh(new THREE.CircleGeometry(basin.liquid.radius, 72), liquidMaterial()),
    false,
    true,
  );
  liquid.name = "liquid";
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = foot.height + rim.thickness * 0.26;
  group.add(liquid);
  return group;
}

function buildDesk() {
  const group = new THREE.Group();
  group.name = "desk";
  const [width, thickness, depth] = desk.top;
  const top = shade(new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), woodMat));
  top.name = "desk-top";
  top.position.set(desk.x, desk.topY - thickness / 2, desk.z);
  group.add(top);

  const lip = shade(
    new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, 0.014, depth + 0.03), floorMat),
    true,
    true,
  );
  lip.position.set(desk.x, desk.topY - thickness - 0.006, desk.z);
  group.add(lip);

  const legH = desk.topY - thickness - 0.02;
  const legGeo = new THREE.BoxGeometry(0.072, legH, 0.072);
  const insetX = width / 2 - 0.12;
  const insetZ = depth / 2 - 0.11;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = shade(new THREE.Mesh(legGeo, woodMat));
      leg.position.set(desk.x + sx * insetX, legH / 2, desk.z + sz * insetZ);
      group.add(leg);
    }
  }

  const apronY = desk.topY - thickness - 0.07;
  const front = shade(new THREE.Mesh(new THREE.BoxGeometry(width - 0.28, 0.09, 0.035), woodMat));
  front.position.set(desk.x, apronY, desk.z + insetZ);
  const back = front.clone();
  back.position.z = desk.z - insetZ;
  const sideGeo = new THREE.BoxGeometry(0.035, 0.09, depth - 0.28);
  const left = shade(new THREE.Mesh(sideGeo, woodMat));
  left.position.set(desk.x - insetX, apronY, desk.z);
  const right = left.clone();
  right.position.x = desk.x + insetX;
  group.add(front, back, left, right);
  return group;
}

function buildShelf() {
  const group = new THREE.Group();
  group.name = "shelf";
  const width = shelf.x1 - shelf.x0;
  const centerX = (shelf.x0 + shelf.x1) / 2;
  const uprightGeo = new THREE.BoxGeometry(shelf.upright, shelf.top, shelf.depth);
  for (const x of [shelf.x0, shelf.x1]) {
    const upright = shade(new THREE.Mesh(uprightGeo, woodMat));
    upright.position.set(x, shelf.top / 2, shelf.z);
    group.add(upright);
  }
  const back = shade(
    new THREE.Mesh(new THREE.BoxGeometry(width, shelf.top - 0.4, 0.02), floorMat),
    false,
    true,
  );
  back.position.set(centerX, shelf.top * 0.55, shelf.z - shelf.depth / 2 + 0.02);
  group.add(back);
  const plankGeo = new THREE.BoxGeometry(width + shelf.upright, shelf.thickness, shelf.depth);
  for (const level of shelf.levels) {
    const plank = shade(new THREE.Mesh(plankGeo, woodMat));
    plank.position.set(centerX, level - shelf.thickness / 2, shelf.z);
    group.add(plank);
  }
  const cornice = shade(new THREE.Mesh(plankGeo, woodMat));
  cornice.position.set(centerX, shelf.top - shelf.thickness / 2, shelf.z);
  group.add(cornice);
  return group;
}

function archHole(cx, sill, width, height) {
  const path = new THREE.Path();
  const half = width / 2;
  const radius = half;
  const spring = sill + (height - radius);
  path.moveTo(cx - half, sill);
  path.lineTo(cx - half, spring);
  const steps = 20;
  for (let i = 1; i <= steps; i += 1) {
    const angle = Math.PI - (i / steps) * Math.PI;
    path.lineTo(cx + Math.cos(angle) * radius, spring + Math.sin(angle) * radius);
  }
  path.lineTo(cx + half, sill);
  path.closePath();
  return path;
}

function buildWindow() {
  const group = new THREE.Group();
  group.name = "observatory-window";
  group.userData.role = "window";
  const spec = observatoryWindow;
  const radius = spec.width / 2;
  const spring = spec.sillY + (spec.height - radius);
  const faceZ = room.wallZ + room.wallThickness / 2;

  const arch = shade(
    new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 12, 36, Math.PI), stoneMat),
  );
  arch.position.set(spec.centerX, spring, faceZ + 0.02);
  group.add(arch);

  const jambGeo = new THREE.BoxGeometry(0.09, spring - spec.sillY + 0.04, 0.1);
  for (const side of [-1, 1]) {
    const jamb = shade(new THREE.Mesh(jambGeo, stoneMat));
    jamb.position.set(spec.centerX + side * radius, (spec.sillY + spring) / 2, faceZ + 0.02);
    group.add(jamb);
  }

  const sill = shade(
    new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.28, 0.07, 0.24), stoneMat),
  );
  sill.position.set(spec.centerX, spec.sillY - 0.02, faceZ + 0.04);
  group.add(sill);

  const vertical = shade(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.035, spec.height - radius * 0.35, 0.04),
      woodMat,
    ),
  );
  vertical.position.set(spec.centerX, spec.sillY + (spec.height - radius * 0.35) / 2, faceZ + 0.03);
  const horizontal = shade(
    new THREE.Mesh(new THREE.BoxGeometry(spec.width - 0.08, 0.035, 0.04), woodMat),
  );
  horizontal.position.set(spec.centerX, spring - 0.02, faceZ + 0.03);
  group.add(vertical, horizontal);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width - 0.04, spec.height - 0.04),
    new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: false }),
  );
  sky.position.set(spec.centerX, spec.sillY + spec.height / 2, room.wallZ - 0.08);
  group.add(sky);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width - 0.08, spec.height - 0.08),
    new THREE.MeshStandardMaterial({
      color: "#b7c9d6",
      transparent: true,
      opacity: 0.1,
      roughness: 0.04,
      metalness: 0.08,
      envMapIntensity: 0.8,
    }),
  );
  glass.position.set(spec.centerX, spec.sillY + spec.height / 2, faceZ + 0.01);
  group.add(glass);
  return group;
}

function skyTexture() {
  return makeTexture(256, (u, v) => {
    const moonX = 0.58;
    const moonY = 0.74;
    const distance = Math.hypot((u - moonX) * 1.15, v - moonY);
    const disc = Math.exp(-Math.pow(distance * 22, 2)) * 0.72;
    const glow = Math.exp(-distance * 4.4) * 0.38;
    const base = 0.025 + v * 0.07;
    const star = hash(Math.floor(u * 256), Math.floor(v * 256)) > 0.996 ? 0.7 : 0;
    return [
      Math.min(255, (base * 0.35 + glow * 0.55 + disc + star) * 255),
      Math.min(255, (base * 0.48 + glow * 0.62 + disc + star) * 255),
      Math.min(255, (base * 0.7 + glow * 0.75 + disc + star) * 255),
    ];
  }, true);
}

function buildWalls() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const half = room.width / 2;
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, room.height);
  shape.lineTo(-half, room.height);
  shape.closePath();
  shape.holes.push(
    archHole(
      observatoryWindow.centerX,
      observatoryWindow.sillY,
      observatoryWindow.width,
      observatoryWindow.height,
    ),
  );
  const wall = shade(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: room.wallThickness, bevelEnabled: false, curveSegments: 20 }),
      wallMat,
    ),
    false,
    true,
  );
  wall.position.z = room.wallZ - room.wallThickness / 2;
  group.add(wall);

  const sideDepth = room.floorZ1 - room.floorZ0;
  const sideGeo = new THREE.BoxGeometry(room.wallThickness, room.height, sideDepth);
  const sideZ = (room.floorZ0 + room.floorZ1) / 2;
  for (const x of [-half, half]) {
    const side = shade(new THREE.Mesh(sideGeo, wallMat), false, true);
    side.position.set(x, room.height / 2, sideZ);
    group.add(side);
  }
  const ceiling = shade(
    new THREE.Mesh(new THREE.BoxGeometry(room.width, 0.08, sideDepth), wallMat),
    false,
    false,
  );
  ceiling.position.set(0, room.height, sideZ);
  ceiling.material = wallMat.clone();
  ceiling.material.color.set("#2a2826");
  group.add(ceiling);

  const floor = shade(
    new THREE.Mesh(new THREE.BoxGeometry(room.width, 0.08, sideDepth), floorMat),
    false,
    true,
  );
  floor.name = "floor";
  floor.position.set(0, -0.04, sideZ);
  group.add(floor);

  const board = shade(
    new THREE.Mesh(new THREE.BoxGeometry(room.width - 0.2, 0.1, 0.04), floorMat),
    false,
    true,
  );
  board.position.set(0, 0.05, room.wallZ + room.wallThickness / 2 + 0.02);
  group.add(board);
  return group;
}

function buildCandle() {
  const group = new THREE.Group();
  group.name = "candle";
  group.userData.role = "candle";
  group.position.set(candle.x, desk.topY, candle.z);
  const holder = shade(
    new THREE.Mesh(
      lathe(
        [
          [0.01, 0],
          [0.046, 0],
          [0.05, 0.01],
          [0.018, 0.016],
          [0.014, 0.034],
          [0.03, 0.05],
          [0.032, 0.062],
          [0.012, 0.062],
        ],
        24,
      ),
      brassMat,
    ),
  );
  group.add(holder);

  const waxMat = new THREE.MeshStandardMaterial({
    color: "#f0ddb0",
    roughness: 0.68,
    metalness: 0,
    bumpMap: tile(maps.paper.bump, 1, 3),
    bumpScale: 0.004,
    emissive: "#c48a45",
    emissiveIntensity: 0.18,
  });
  const wax = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, candle.height, 20), waxMat));
  wax.position.y = 0.045 + candle.height / 2;
  group.add(wax);
  const drip = shade(new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), waxMat), true, false);
  drip.scale.set(0.7, 1.5, 0.7);
  drip.position.set(0.015, 0.05 + candle.height * 0.48, 0.004);
  group.add(drip);

  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0014, 0.0014, 0.012, 6),
    new THREE.MeshStandardMaterial({ color: "#1a120c", roughness: 0.85 }),
  );
  wick.position.y = 0.045 + candle.height + 0.004;
  group.add(wick);

  const flame = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 10, 10),
    new THREE.MeshBasicMaterial({
      color: "#ffb15a",
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  outer.scale.set(0.62, 1.7, 0.62);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 8, 8),
    new THREE.MeshBasicMaterial({ color: "#fff6d4", transparent: true, opacity: 1, depthWrite: false }),
  );
  core.position.y = 0.004;
  core.scale.set(0.7, 1.35, 0.7);
  flame.add(outer, core);
  flame.position.y = 0.05 + candle.height + 0.02;
  flame.name = "flame";
  group.add(flame);

  const light = new THREE.PointLight("#ff9a3c", 4.2, 2.6, 2);
  light.position.y = flame.position.y;
  group.add(light);
  return { group, light, flame };
}

function environmentTexture() {
  const width = 256;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  const windowDir = new THREE.Vector3(-0.45, 0.42, -0.79).normalize();
  const candleDir = new THREE.Vector3(0.55, 0.12, 0.55).normalize();
  const direction = new THREE.Vector3();
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const phi = (v - 0.5) * Math.PI;
    const yDir = Math.sin(phi);
    const ring = Math.cos(phi);
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const theta = (u - 0.5) * tau;
      direction.set(Math.cos(theta) * ring, yDir, Math.sin(theta) * ring).normalize();
      let red = 3 + Math.max(0, yDir) * 14;
      let green = 5 + Math.max(0, yDir) * 18;
      let blue = 10 + Math.max(0, yDir) * 26;
      const windowDot = direction.dot(windowDir);
      if (windowDot > 0.9) {
        const strength = Math.pow((windowDot - 0.9) / 0.1, 0.85);
        red += (168 - red) * strength;
        green += (188 - green) * strength;
        blue += (214 - blue) * strength;
      }
      if (windowDot > 0.985) {
        red = 228;
        green = 236;
        blue = 244;
      }
      const candleDot = direction.dot(candleDir);
      if (candleDot > 0.94) {
        const strength = Math.pow((candleDot - 0.94) / 0.06, 1.2);
        red = Math.min(255, red + 150 * strength);
        green = Math.min(255, green + 72 * strength);
        blue = Math.min(255, blue + 18 * strength);
      }
      const i = (y * width + x) * 4;
      data[i] = red;
      data[i + 1] = green;
      data[i + 2] = blue;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function tuneTextures(root, renderer) {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  root.traverse((object) => {
    const material = object.material;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const entry of list) {
      for (const key of ["map", "bumpMap", "normalMap"]) {
        if (entry[key]) entry[key].anisotropy = anisotropy;
      }
    }
  });
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(clearColor);
scene.environmentIntensity = 0.92;

const camera = new THREE.PerspectiveCamera(still.fov, 1, 0.08, 40);
camera.position.set(...still.position);
camera.lookAt(...still.target);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const equirect = environmentTexture();
scene.environment = pmrem.fromEquirectangular(equirect).texture;
equirect.dispose();
pmrem.dispose();

scene.add(buildWalls());
scene.add(buildDesk());
scene.add(buildShelf());
scene.add(buildWindow());
scene.add(buildBasin());
for (const book of books) scene.add(buildBook(book));
const candleBuilt = buildCandle();
scene.add(candleBuilt.group);

const keyLight = new THREE.DirectionalLight("#c5d6e4", 2.05);
keyLight.position.set(observatoryWindow.centerX - 0.2, 2.7, room.wallZ - 1.4);
keyLight.target.position.set(basin.x, desk.topY, basin.z);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.00035;
keyLight.shadow.normalBias = 0.03;
keyLight.shadow.camera.near = 0.4;
keyLight.shadow.camera.far = 9;
keyLight.shadow.camera.left = -2.4;
keyLight.shadow.camera.right = 2.4;
keyLight.shadow.camera.top = 2.4;
keyLight.shadow.camera.bottom = -2.4;
scene.add(keyLight);
scene.add(keyLight.target);

const fill = new THREE.DirectionalLight("#d8c2a2", 0.18);
fill.position.set(2.2, 1.6, 1.4);
scene.add(fill);
scene.add(new THREE.AmbientLight("#1c2836", 0.26));
scene.add(new THREE.HemisphereLight("#7f96a8", "#2a2118", 0.5));

tuneTextures(scene, renderer);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, true);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
const candleBase = candleBuilt.light.intensity;

function frame() {
  const time = clock.getElapsedTime();
  const flicker = 0.9 + Math.sin(time * 8.2) * 0.06 + Math.sin(time * 14.1) * 0.035;
  candleBuilt.light.intensity = candleBase * flicker;
  candleBuilt.flame.scale.set(1, 0.92 + flicker * 0.12, 1);
  renderer.render(scene, camera);
  if (!window.__STUDY_READY) {
    window.__STUDY = { scene, renderer, keyLight, camera };
    window.__STUDY_READY = true;
  }
  requestAnimationFrame(frame);
}

frame();
