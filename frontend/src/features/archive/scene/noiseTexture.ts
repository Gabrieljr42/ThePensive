import * as THREE from "three";
import { fbmNoise } from "./noise";

const textures = new Map<string, THREE.DataTexture>();

/** One tiled noise texture per octave count. Materials and shaders share it. */
export function sharedNoiseTexture(octaves: number): THREE.DataTexture {
  const count = Math.max(1, Math.floor(octaves));
  const size = count <= 1 ? 64 : 128;
  const key = `${count}:${size}`;
  const cached = textures.get(key);
  if (cached) return cached;

  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const coarse = fbmNoise(u * 5, v * 5, count);
      const fine = fbmNoise(u * 5 + 13.7, v * 5 + 4.2, count);
      const i = (y * size + x) * 4;
      data[i] = Math.round(coarse * 255);
      data[i + 1] = Math.round(fine * 255);
      data[i + 2] = Math.round((coarse * 0.65 + fine * 0.35) * 255);
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  // Mip blur erases the grain on the grazing stone floor. Keep the base level.
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textures.set(key, texture);
  return texture;
}

export function sharedNoiseMap(
  octaves: number,
  repeatX: number,
  repeatY: number,
): THREE.Texture {
  const map = sharedNoiseTexture(octaves).clone();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.colorSpace = THREE.NoColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.generateMipmaps = false;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}
