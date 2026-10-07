"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneUniforms } from "../uniforms";

function setPassUniforms(
  material: THREE.ShaderMaterial,
  values: Record<string, number>,
) {
  for (const [name, value] of Object.entries(values))
    material.uniforms[name].value = value;
}

/** A single transient refraction pass. The normal room renders directly when it is inactive. */
export function MemoryPass() {
  const { size, gl } = useThree();
  const elapsed = useRef(0);
  const pass = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: target.texture },
        uVeil: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `
        uniform sampler2D tInput; uniform float uVeil; uniform float uTime; uniform float uAspect;
        varying vec2 vUv;
        void main(){
          vec2 p = (vUv - .5) * vec2(uAspect, 1.);
          float r = length(p);
          float wave = sin(r * 21. - uTime * 2.5) * .012;
          vec2 bend = (vUv - .5) * (sin(r * 5.) * .15 + wave) * uVeil;
          vec3 col = texture2D(tInput, clamp(vUv + bend, vec2(.001), vec2(.999))).rgb;
          float silk = sin(atan(p.y, p.x) * 3. + r * 15. - uTime * .8) * .5 + .5;
          vec3 pearl = mix(vec3(.10,.16,.19), vec3(.32,.42,.44), silk * .45 + (1. - smoothstep(.1, 1.3, r)) * .3);
          col = mix(col, pearl, smoothstep(.1, .97, uVeil));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));
    return { target, scene, camera, material, geometry };
  }, []);
  useEffect(() => {
    // The silver veil permits a smaller transient target without visible crispness changes in reading.
    const ratio = Math.min(1, gl.getPixelRatio());
    pass.target.setSize(
      Math.max(1, Math.round(size.width * ratio)),
      Math.max(1, Math.round(size.height * ratio)),
    );
    setPassUniforms(pass.material, {
      uAspect: size.width / Math.max(1, size.height),
    });
  }, [size.width, size.height, gl, pass]);
  useEffect(
    () => () => {
      pass.target.dispose();
      pass.material.dispose();
      pass.geometry.dispose();
    },
    [pass],
  );
  useFrame(({ scene, camera }, delta) => {
    elapsed.current += Math.min(delta, 0.05);
    const veil = sceneUniforms.dive.veil;
    if (veil < 0.002) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }
    setPassUniforms(pass.material, { uVeil: veil, uTime: elapsed.current });
    gl.setRenderTarget(pass.target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(pass.scene, pass.camera);
  }, 1);
  return null;
}
