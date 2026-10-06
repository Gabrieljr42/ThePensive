"use client";

import { NoisyStandardMaterial } from "./NoisyStandardMaterial";
import { inhabitedObjects, materialRoles } from "./sceneLayout";

const pulled = inhabitedObjects.find((object) => object.id === "pulled-volume");
const stool = inhabitedObjects.find((object) => object.id === "reading-stool");
const wax = inhabitedObjects.find((object) => object.id === "wax-spill");

export function InhabitedAisle() {
  if (!pulled || !stool) return null;
  const cloth = materialRoles.cloth;
  const wood = materialRoles.wood;

  return (
    <group>
      <mesh position={pulled.position} rotation={pulled.rotation} castShadow>
        <boxGeometry args={[0.28, 0.08, 0.2]} />
        <NoisyStandardMaterial
          color="#6a3d32"
          roughness={cloth.roughness}
          metalness={cloth.metalness}
          repeat={cloth.repeat}
          offset={cloth.offset}
          strength={cloth.strength}
          bump={false}
        />
      </mesh>
      <group position={stool.position} rotation={stool.rotation}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[0.42, 0.05, 0.42]} />
          <NoisyStandardMaterial
            color={wood.color}
            roughness={wood.roughness}
            metalness={wood.metalness}
            repeat={[3, 3]}
            offset={wood.offset}
            strength={0.4}
            bump={false}
          />
        </mesh>
        <mesh position={[0, -0.08, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 0.36, 8]} />
          <NoisyStandardMaterial
            color="#4a3426"
            roughness={0.8}
            metalness={0.02}
            repeat={[1, 3]}
            offset={[0.2, 0.4]}
            strength={0.28}
            bump={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function WaxSpill() {
  if (!wax) return null;
  return (
    <mesh position={wax.position} rotation={wax.rotation} scale={[0.2, 0.11, 1]}>
      <circleGeometry args={[1, 18]} />
      <meshStandardMaterial color="#cbb48a" roughness={0.72} metalness={0.02} />
    </mesh>
  );
}
