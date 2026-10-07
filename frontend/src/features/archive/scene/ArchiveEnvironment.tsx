"use client";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function installProbe(scene: THREE.Scene, texture: THREE.Texture | null) {
  // Three.js owns this mutable scene, outside React's rendering model.
  scene.environment = texture;
  scene.environmentIntensity = 0.45;
}

/** A tiny indoor light probe, generated locally, without a remote HDR download. */
export function ArchiveEnvironment() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const width = 128,
      height = 64;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const u = x / width,
          v = y / height;
        const window = Math.exp(
          -Math.pow((u - 0.64) * 18, 2) - Math.pow((v - 0.45) * 5, 2),
        );
        const warm = Math.exp(
          -Math.pow((u - 0.2) * 9, 2) - Math.pow((v - 0.63) * 10, 2),
        );
        const i = (y * width + x) * 4;
        pixels[i] = 30 + window * 132 + warm * 80;
        pixels[i + 1] = 35 + window * 160 + warm * 42;
        pixels[i + 2] = 42 + window * 185 + warm * 20;
        pixels[i + 3] = 255;
      }
    const texture = new THREE.DataTexture(pixels, width, height);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromEquirectangular(texture);
    installProbe(scene, environment.texture);
    texture.dispose();
    generator.dispose();
    return () => {
      installProbe(scene, null);
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
}
