"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { memoryFragments, type MemoryFragment } from "../memoryWalk";
import { useArchiveStore } from "../store";
import { sceneUniforms } from "../uniforms";

function lines(context: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (line && context.measureText(next).width > width) {
      result.push(line);
      line = word;
    } else line = next;
  }
  if (line) result.push(line);
  return result;
}
/** Text comes from the current inquiry/context. Canvas renders typography, never fabricated passages. */
function inkTexture(
  fragment: Pick<MemoryFragment, "title" | "text" | "label">,
  fontVersion: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;
  const context = canvas.getContext("2d")!;
  const style = getComputedStyle(document.documentElement);
  const reading = fontVersion
    ? style.getPropertyValue("--font-reading").trim() || "Georgia, serif"
    : "Georgia, serif";
  const display = fontVersion
    ? style.getPropertyValue("--font-display").trim() || "Georgia, serif"
    : "Georgia, serif";
  context.strokeStyle = "#806e47";
  context.lineWidth = 1;
  context.strokeRect(25, 25, 462, 654);
  context.strokeRect(31, 31, 450, 642);
  context.beginPath();
  context.moveTo(61, 105);
  context.lineTo(451, 105);
  context.stroke();
  context.fillStyle = "#59472f";
  context.font = "11px Georgia, serif";
  context.textAlign = "center";
  context.fillText(fragment.label, 256, 82, 396);
  context.font = `35px ${display}`;
  context.fillStyle = "#30291f";
  const title = lines(context, fragment.title, 398).slice(0, 3);
  title.forEach((line, i) => context.fillText(line, 256, 154 + i * 40));
  const y = 154 + title.length * 40 + 24;
  context.textAlign = "left";
  context.fillStyle = "#362a1d";
  context.font = `italic 32px ${reading}`;
  const body = lines(context, fragment.text, 398);
  body
    .slice(0, Math.max(1, Math.floor((626 - y) / 43)))
    .forEach((line, i) => context.fillText(line, 57, y + i * 43));
  context.textAlign = "center";
  context.font = `italic 18px ${reading}`;
  context.fillStyle = "#7b6543";
  context.fillText("A fragment held in memory", 256, 650);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
const vertex = `
  uniform float uTime; varying vec2 vUv;
  void main(){ vUv = uv; vec3 pos = position;
    pos.z += sin(uv.y * 3.14159) * .11 + sin(uv.x * 6.28 + uTime * .3) * .013;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
  }`;
const fragmentShader = `
  uniform sampler2D uInk; uniform float uTime; uniform float uReveal; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    float edge = min(min(vUv.x, 1.-vUv.x), min(vUv.y, 1.-vUv.y));
    float torn = sin(vUv.x * 123.) * sin(vUv.y * 147.) * .002;
    float alpha = smoothstep(.002,.018,edge+torn);
    if(alpha < .015) discard;
    vec3 paper = vec3(.41,.32,.20) * (.91 + hash(floor(vUv * 704.)) * .07);
    paper *= .8 + smoothstep(0.,.12,edge) * .2;
    vec4 ink = texture2D(uInk,vUv);
    float writing = smoothstep(-.035,.035,uReveal - (1.-vUv.y));
    vec3 col = mix(paper,ink.rgb,ink.a * writing);
    float tip = exp(-pow((uReveal - (1.-vUv.y)) * 38.,2.)) * step(uReveal,1.);
    col += vec3(.16,.18,.14) * ink.a * tip;
    gl_FragColor = vec4(col,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function tickInk(
  material: THREE.ShaderMaterial,
  elapsed: number,
  index: number,
) {
  material.uniforms.uTime.value = elapsed;
  material.uniforms.uReveal.value = Math.min(
    1.07,
    elapsed * 0.58 - (index % 3) * 0.05,
  );
}
function Folio({
  content,
  index,
  mobile,
}: {
  content: MemoryFragment;
  index: number;
  mobile: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    ink = useRef<THREE.ShaderMaterial>(null);
  const elapsed = useRef(0);
  const [fontVersion, setFontVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setFontVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, []);
  const texture = useMemo(
    () =>
      inkTexture(
        {
          title: content.title,
          text: content.text,
          label: content.label,
        },
        fontVersion,
      ),
    [content.title, content.text, content.label, fontVersion],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const uniforms = useMemo(
    () => ({
      uInk: { value: texture },
      uTime: { value: 0 },
      uReveal: { value: useArchiveStore.getState().journeyPaused ? 1.07 : 0 },
    }),
    [texture],
  );
  const side = index % 2 ? 1 : -1;
  const baseY = 1.9 + Math.sin(index * 2.1) * 0.3;
  useFrame((_, delta) => {
    const state = useArchiveStore.getState();
    if (
      !sceneUniforms.dive.interior ||
      state.journeyPaused ||
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode
    )
      return;
    elapsed.current += Math.min(delta, 0.04);
    if (ink.current) tickInk(ink.current, elapsed.current, index);
    if (root.current) {
      root.current.position.y =
        baseY + Math.sin(elapsed.current * 0.3 + index) * 0.065;
      root.current.rotation.z =
        Math.sin(elapsed.current * 0.13 + index) * 0.025;
    }
  });
  return (
    <group
      ref={root}
      position={[side * (mobile ? 1.05 : 1.55), baseY, -4.8 - index * 5.8]}
      rotation={[0, -side * 0.28, 0]}
      userData={{ memoryFragment: content }}
    >
      <mesh name="WrittenMemoryFolio" scale={mobile ? 0.8 : 1}>
        <planeGeometry args={[1.7, 2.35, 8, 12]} />
        <shaderMaterial
          ref={ink}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragmentShader}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}
export function MemoryFolios() {
  const run = useArchiveStore((s) => s.run),
    question = useArchiveStore((s) => s.question);
  const requestId = useArchiveStore((s) => s.requestId);
  const { size } = useThree();
  const fragments = useMemo(
    () => memoryFragments(run, question),
    [run, question],
  );
  const ordered =
    fragments.length > 1 ? [...fragments.slice(1), fragments[0]] : fragments;
  return (
    <group name="MemoryFolios">
      {Array.from({ length: 6 }, (_, i) => {
        const content = ordered[i % ordered.length];
        return (
          <Folio
            key={`${requestId}-${i}-${content.id}`}
            content={content}
            index={i}
            mobile={size.width < 700}
          />
        );
      })}
    </group>
  );
}
