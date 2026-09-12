"use client";

import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { Environment } from "@react-three/drei/core/Environment";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Html } from "@react-three/drei/web/Html";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Material,
  type PointLight,
  type Mesh,
} from "three";
import {
  stations,
  type RoomProps,
  type Station,
  type View,
} from "./atelier-types";

type V3 = [number, number, number];
type Block = { position: V3; scale: V3; rotation?: V3 };
type Materials = Record<string, Material>;
const RoomResources = createContext<{
  box: BoxGeometry;
  cushion: BoxGeometry;
  materials: Materials;
}>(null!);

function surfaceTexture(kind: "wood" | "stone") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const index = (y * 256 + x) * 4;
      const grain =
        kind === "wood"
          ? Math.sin(y * 0.9 + Math.sin(x * 0.025) * 3) * 9 +
            Math.sin(y * 2.8) * 5
          : Math.sin(x * 73.17 + y * 32.43) * Math.cos(x * 13.9 - y * 11.6) * 7;
      const base = kind === "wood" ? [89, 58, 40] : [43, 47, 57];
      pixels.data[index] = base[0] + grain * 0.32;
      pixels.data[index + 1] = base[1] + grain * 0.32;
      pixels.data[index + 2] = base[2] + grain * 0.32;
      pixels.data[index + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(kind === "wood" ? 2 : 6, kind === "wood" ? 2 : 6);
  return texture;
}

function Box({
  position,
  scale,
  rotation,
  material = "wood",
  cast = true,
}: Block & { material?: string; cast?: boolean }) {
  const resources = useContext(RoomResources);
  return (
    <mesh
      geometry={material === "chair" ? resources.cushion : resources.box}
      material={resources.materials[material]}
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow={cast}
      receiveShadow
    />
  );
}

function Repeated({ blocks, material }: { blocks: Block[]; material: string }) {
  const mesh = useRef<InstancedMesh>(null);
  const { box, materials } = useContext(RoomResources);
  useLayoutEffect(() => {
    const object = new Object3D();
    blocks.forEach((block, i) => {
      object.position.set(...block.position);
      object.scale.set(...block.scale);
      object.rotation.set(...(block.rotation || [0, 0, 0]));
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [blocks]);
  return (
    <instancedMesh
      ref={mesh}
      args={[box, materials[material], blocks.length]}
      castShadow
      receiveShadow
    />
  );
}

function Architecture({ mobile }: { mobile: boolean }) {
  return (
    <group>
      <Box position={[0, -0.12, 0]} scale={[18, 0.2, 18]} material="stone" />
      <Box position={[0, 0.015, 1]} scale={[7.7, 0.035, 6]} material="rug" />
      <Box
        position={[-3.8, 3, -4.9]}
        scale={[7.4, 6, 0.22]}
        material="plaster"
      />
      <Box position={[-7.4, 3, 0]} scale={[0.22, 6, 10]} material="plaster" />
      <Box
        position={[3.6, 0.6, -4.9]}
        scale={[7.4, 1.2, 0.22]}
        material="plaster"
      />
      <Box
        position={[3.6, 5.6, -4.9]}
        scale={[7.4, 0.8, 0.22]}
        material="plaster"
      />
      <Box
        position={[7.3, 3, -4.9]}
        scale={[0.22, 6, 0.22]}
        material="plaster"
      />
      <Box
        position={[3.6, 4, -18]}
        scale={[30, 18, 0.15]}
        material="exterior"
        cast={false}
      />
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Box
            position={[i * 3.5 - 1, 1.1 + i * 0.25, -10 - i]}
            scale={[2.7, 2.5 + i * 0.5, 2]}
            material="exteriorColumn"
          />
          <Box
            position={[i * 3.5 - 1, 1.9 + i * 0.25, -8.95 - i]}
            scale={[2.2, 0.42, 0.02]}
            material="exterior"
          />
          {[0, 1, 2, 3].slice(0, mobile ? 2 : 4).map((j) => (
            <Box
              key={j}
              position={[
                i * 3.5 - 1.85 + j * 0.48,
                1.75 + (i % 2) * 0.3,
                -8.94 - i,
              ]}
              scale={[0.15, 0.18, 0.01]}
              material={j === i ? "shelfLight" : "screenLine"}
              cast={false}
            />
          ))}
        </group>
      ))}
      <Box
        position={[3.6, 5.39, -4.64]}
        scale={[7.4, 0.23, 0.7]}
        material="recess"
      />
      <Box
        position={[3.6, 5.25, -4.55]}
        scale={[7.1, 0.024, 0.035]}
        material="accent"
        cast={false}
      />
      <Box
        position={[-0.12, 3.2, -4.62]}
        scale={[0.22, 4.3, 0.65]}
        material="recess"
      />
      <Box
        position={[7.32, 3.2, -4.62]}
        scale={[0.22, 4.3, 0.65]}
        material="recess"
      />
      <Box
        position={[-2.1, 2.24, -4.13]}
        scale={[2.6, 0.018, 0.045]}
        material="shelfLight"
        cast={false}
      />
      <Box
        position={[-3.6, 5.7, -2.2]}
        scale={[7.5, 0.16, 4.8]}
        material="recess"
      />
      <Box
        position={[-3.6, 5.6, 0.12]}
        scale={[7.3, 0.018, 0.028]}
        material="shelfLight"
        cast={false}
      />
      {!mobile && (
        <Box
          position={[3.57, 3.15, -4.88]}
          scale={[7.0, 3.9, 0.012]}
          material="windowGlass"
          cast={false}
        />
      )}
      {[0, 3.6, 7.2].map((x) => (
        <Box
          key={x}
          position={[x, 3.2, -4.85]}
          scale={[0.075, 4.15, 0.16]}
          material="metal"
        />
      ))}
      <Box
        position={[3.6, 1.17, -4.7]}
        scale={[7.3, 0.12, 0.52]}
        material="limestone"
      />
      <Box
        position={[3.6, 5.22, -4.85]}
        scale={[7.3, 0.1, 0.16]}
        material="metal"
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          position={[-5.6 + i * 0.87, 3.15, -4.67]}
          scale={[0.7, 2.5, 0.13]}
          material={i === 1 ? "rug" : "chair"}
        />
      ))}
      <Box
        position={[-2.1, 2.3, -4.4]}
        scale={[2.8, 0.09, 0.7]}
        material="wood"
      />
      <Box
        position={[-2.1, 0.7, -4.5]}
        scale={[2.8, 1.4, 0.72]}
        material="wood"
      />
      {[-2.8, -1.4].map((x) => (
        <Box
          key={x}
          position={[x, 0.74, -4.11]}
          scale={[1.33, 1.22, 0.05]}
          material="limestone"
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          position={[-3 + i * 0.16, 2.62, -4.38]}
          scale={[0.12, 0.53 + (i % 2) * 0.11, 0.35]}
          rotation={[0, 0, i === 4 ? -0.15 : 0]}
          material={i % 2 ? "paper" : "book"}
        />
      ))}
      <group position={[-1.45, 2.7, -4.35]} rotation={[0, 0.35, 0.12]}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            position={[i * 0.16 - 0.16, 0, 0]}
            scale={[0.055, 0.6, 0.48]}
            rotation={[0, i * 0.45, 0]}
            material="glass"
          />
        ))}
      </group>
      {!mobile && (
        <>
          <Box
            position={[-7.23, 3.1, -0.8]}
            scale={[0.06, 2.1, 2.7]}
            material="wood"
          />
          <Box
            position={[-7.18, 3.1, -0.8]}
            scale={[0.045, 1.96, 2.56]}
            material="art"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              position={[-7.14, 2.5 + i * 0.3, -0.8]}
              scale={[0.04, 0.035, 1.9 - i * 0.23]}
              rotation={[0.2 + i * 0.08, 0, 0]}
              material={i === 2 ? "accent" : "bronze"}
            />
          ))}
        </>
      )}
    </group>
  );
}

function Workbench({
  active,
  hovered,
  mobile,
}: {
  active: View;
  hovered: Station | null;
  mobile: boolean;
}) {
  const keys = useMemo(
    () =>
      Array.from({ length: mobile ? 12 : 60 }, (_, i) => ({
        position: [
          -0.84 + (i % 12) * 0.1,
          1.37,
          0.52 + Math.floor(i / 12) * 0.085,
        ] as V3,
        scale: [0.083, 0.025, 0.065] as V3,
      })),
    [mobile],
  );
  return (
    <group>
      <Box
        position={[0, 1.18, 0.3]}
        scale={[5.5, 0.19, 2.45]}
        material="wood"
      />
      <Box
        position={[0, 1.3, 0.3]}
        scale={[5.52, 0.06, 2.47]}
        material="wood"
      />
      <Box
        position={[-2.35, 0.55, 0.3]}
        scale={[0.19, 1.1, 1.9]}
        material="wood"
      />
      <Box
        position={[2.35, 0.55, 0.3]}
        scale={[0.19, 1.1, 1.9]}
        material="wood"
      />
      <Box
        position={[0, 0.27, -0.2]}
        scale={[4.7, 0.16, 0.16]}
        material="bronze"
      />
      <Box
        position={[0, 1.355, -0.1]}
        scale={[3.25, 0.025, 1.5]}
        material="mat"
      />
      <Box
        position={[0, 1.09, 1.44]}
        scale={[5.12, 0.018, 0.024]}
        material="bronze"
        cast={false}
      />
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 1.06, 0, -0.32]}
          rotation={[0, 0, 0]}
        >
          <Box
            position={[0, 1.43, 0]}
            scale={[0.65, 0.08, 0.42]}
            material="metal"
          />
          <Box
            position={[0, 1.73, 0]}
            scale={[0.1, 0.57, 0.09]}
            material="metal"
          />
          <Box
            position={[0, 2.13, -0.03]}
            scale={[2.02, 1.28, 0.12]}
            material={
              hovered === (side === -1 ? "projects" : "career") ||
              active === (side === -1 ? "projects" : "career")
                ? "screenFrameActive"
                : "metal"
            }
          />
          <Box
            position={[0, 2.14, 0.041]}
            scale={[1.91, 1.16, 0.015]}
            material={
              active === (side === -1 ? "projects" : "career")
                ? "screenOn"
                : "screenOff"
            }
            cast={false}
          />
          <Box
            position={[0.65, 1.53, 0.065]}
            scale={[0.23, 0.009, 0.012]}
            material={
              hovered === (side === -1 ? "projects" : "career")
                ? "accent"
                : "screenLine"
            }
            cast={false}
          />
          <Box
            position={[-0.72, 2.52, 0.055]}
            scale={[0.25, 0.025, 0.008]}
            material={
              active === (side === -1 ? "projects" : "career")
                ? "coldLight"
                : "screenLine"
            }
            cast={false}
          />
          {side === -1 ? (
            <>
              {[-0.57, 0, 0.57].map((x, i) => (
                <group key={i}>
                  <Box
                    position={[x, 2.2, 0.057]}
                    scale={[0.28, 0.28, 0.008]}
                    material={i === 1 ? "glassEdge" : "screenLine"}
                    cast={false}
                  />
                  <Box
                    position={[x, 1.95, 0.057]}
                    scale={[0.24, 0.012, 0.008]}
                    material="screenLine"
                    cast={false}
                  />
                  {i < 2 && (
                    <Box
                      position={[x + 0.285, 2.2, 0.057]}
                      scale={[0.27, 0.01, 0.008]}
                      material="screenLine"
                      cast={false}
                    />
                  )}
                </group>
              ))}
              <Box
                position={[0, 2.39, 0.057]}
                scale={[0.025, 0.05, 0.008]}
                material="coldLight"
                cast={false}
              />
            </>
          ) : (
            <>
              <Box
                position={[-0.59, 2.16, 0.057]}
                scale={[0.012, 0.66, 0.008]}
                material="glassEdge"
                cast={false}
              />
              {[0, 1, 2].map((i) => (
                <group key={i}>
                  <Box
                    position={[-0.59, 2.44 - i * 0.27, 0.057]}
                    scale={[0.065, 0.065, 0.008]}
                    material={i === 1 ? "coldLight" : "screenLine"}
                    cast={false}
                  />
                  <Box
                    position={[-0.03, 2.44 - i * 0.27, 0.057]}
                    scale={[0.86 - i * 0.12, 0.018, 0.008]}
                    material="screenLine"
                    cast={false}
                  />
                </group>
              ))}
            </>
          )}
        </group>
      ))}
      <Box
        position={[-0.28, 1.35, 0.7]}
        scale={[1.4, 0.035, 0.55]}
        material="metal"
      />
      <Repeated blocks={keys} material="key" />
      <Box
        position={[0.75, 1.39, 0.7]}
        scale={[0.2, 0.07, 0.31]}
        material="key"
      />
      <Box
        position={[-2, 1.37, 0.7]}
        scale={[0.82, 0.07, 1.05]}
        material={hovered === "cv" || active === "cv" ? "folioActive" : "folio"}
        rotation={[0, 0, 0]}
      />
      <Box
        position={[-2, 1.412, 0.7]}
        scale={[0.78, 0.015, 1.01]}
        material="paper"
        rotation={[0, 0, 0]}
      />
      {active === "home" && (
        <Html
          position={[-2, 1.44, 0.7]}
          transform
          rotation={[-Math.PI / 2, 0, 0]}
          distanceFactor={1.5}
          zIndexRange={[1, 0]}
        >
          <span className="physical-cv" aria-hidden="true">
            CV
          </span>
        </Html>
      )}
      <Box
        position={[2.13, 1.38, -0.2]}
        scale={[0.35, 0.1, 0.35]}
        material="metal"
      />
      <Box
        position={[2.13, 1.95, -0.2]}
        scale={[0.045, 1.08, 0.045]}
        material="bronze"
      />
      <Box
        position={[1.85, 2.48, -0.2]}
        scale={[0.62, 0.08, 0.25]}
        material="metal"
      />
      <Box
        position={[1.85, 2.434, -0.2]}
        scale={[0.5, 0.014, 0.2]}
        material="warmLight"
        cast={false}
      />
      <Box
        position={[0.4, 0.67, 2.15]}
        scale={[1.0, 0.13, 0.87]}
        material="chair"
      />
      <Box
        position={[0.4, 1.1, 2.55]}
        scale={[1.0, 0.92, 0.13]}
        material="chair"
        rotation={[-0.12, 0, 0]}
      />
      <Box
        position={[0.4, 0.33, 2.15]}
        scale={[0.1, 0.65, 0.1]}
        material="metal"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <group
          key={i}
          position={[0.4, 0.09, 2.15]}
          rotation={[0, (i * Math.PI * 2) / 5, 0]}
        >
          <Box
            position={[0, 0, 0.25]}
            scale={[0.08, 0.065, 0.6]}
            material="metal"
          />
          <Box
            position={[0, -0.025, 0.52]}
            scale={[0.12, 0.12, 0.14]}
            material="metal"
          />
        </group>
      ))}
      {[-0.12, 0.92].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.9, 2.16]}
            scale={[0.07, 0.4, 0.08]}
            material="metal"
          />
          <Box
            position={[x, 1.09, 2.14]}
            scale={[0.12, 0.06, 0.6]}
            material="chair"
          />
        </group>
      ))}
      <Box
        position={[0, 1.04, -0.6]}
        scale={[3.6, 0.12, 0.25]}
        material="metal"
      />
    </group>
  );
}

function SupportingObjects({ mobile }: { mobile: boolean }) {
  return (
    <group position={[4.7, 0, -3.5]}>
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.68, 24]} />
        <meshStandardMaterial color="#cac4b5" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].slice(0, mobile ? 4 : 7).map((i) => (
        <group key={i} rotation={[0, i * 2.4, 0]}>
          <Box
            position={[0.08, 0.92 + (i % 3) * 0.12, 0]}
            scale={[0.025, 1.4, 0.025]}
            material="book"
            rotation={[0, 0, -0.16]}
          />
          <mesh
            position={[0.3, 1.45 + (i % 3) * 0.22, 0]}
            rotation={[0, 0, -0.6]}
            scale={[0.2, 0.52, 0.065]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#637e64" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
const positions: Record<Station, V3> = {
  projects: [-1.06, 2.97, -0.25],
  career: [1.06, 2.97, -0.25],
  cv: [-2, 1.48, 1.36],
};
function InteractionTargets({
  station,
  hovered,
  onSelect,
  onHover,
}: Pick<RoomProps, "station" | "hovered" | "onSelect" | "onHover">) {
  const hitboxes: Record<Station, Block> = {
    projects: { position: [-1.06, 2.14, -0.24], scale: [2, 1.3, 0.14] },
    career: { position: [1.06, 2.14, -0.24], scale: [2, 1.3, 0.14] },
    cv: { position: [-2, 1.45, 0.7], scale: [0.95, 0.16, 1.12] },
  };
  if (station !== "home") return null;
  return (
    <>
      {stations.map((item) => (
        <group key={item.id}>
          <mesh
            position={hitboxes[item.id].position}
            scale={hitboxes[item.id].scale}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              onSelect(item.id);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              onHover(item.id);
            }}
            onPointerOut={() => onHover(null)}
          >
            <boxGeometry />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {station === "home" && (
            <Html position={positions[item.id]} center zIndexRange={[15, 10]}>
              <button
                type="button"
                className={`station-marker ${hovered === item.id ? "is-hovered" : ""}`}
                onFocus={() => onHover(item.id)}
                onBlur={() => onHover(null)}
                onPointerEnter={() => onHover(item.id)}
                onPointerLeave={() => onHover(null)}
                onClick={() => onSelect(item.id)}
              >
                <span>{item.number}</span>
                <strong>{item.label}</strong>
                <i aria-hidden="true">↗</i>
              </button>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

const desktopViews: Record<View, { position: V3; target: V3 }> = {
  home: { position: [7.6, 4.4, 10.3], target: [-0.5, 1.9, -1.2] },
  projects: { position: [-1.06, 2.14, 1.4], target: [-1.06, 2.14, -0.27] },
  career: { position: [1.06, 2.14, 1.4], target: [1.06, 2.14, -0.27] },
  cv: { position: [-2, 2.86, 0.7], target: [-2, 1.42, 0.7] },
};
const mobileViews: typeof desktopViews = {
  ...desktopViews,
  home: { position: [7, 6.2, 11.5], target: [-0.2, 1.5, -0.5] },
};
function CameraDirector({
  station,
  navigationVersion,
  mobile,
  reduced,
  pointer,
  visible,
  onSettled,
  onScreenBounds,
}: RoomProps) {
  const { camera, invalidate, gl, size } = useThree();
  const look = useRef(new Vector3());
  const track = useRef({
    start: new Vector3(),
    end: new Vector3(),
    fromLook: new Vector3(),
    toLook: new Vector3(),
    fromUp: new Vector3(),
    toUp: new Vector3(),
    progress: 1,
    startedAt: 0,
    reported: false,
  });
  const initialized = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const view = (mobile ? mobileViews : desktopViews)[station],
      t = track.current;
    t.start.copy(camera.position);
    t.end.set(...view.position);
    if (!mobile && (station === "projects" || station === "career")) {
      const halfFov = Math.tan((23 * Math.PI) / 180);
      const distance = Math.max(
        1.67,
        1.91 / (2 * halfFov * (size.width / size.height) * 0.9),
      );
      t.end.z = view.target[2] + distance;
    }
    t.fromLook.copy(look.current);
    t.toLook.set(...view.target);
    t.fromUp.copy(camera.up);
    t.toUp.set(0, station === "cv" ? 0 : 1, station === "cv" ? -1 : 0);
    t.progress = reduced || !initialized.current ? 1 : 0;
    t.startedAt = performance.now();
    t.reported = false;
    initialized.current = true;
    invalidate();
  }, [
    station,
    navigationVersion,
    mobile,
    reduced,
    camera,
    invalidate,
    size.width,
    size.height,
  ]);
  useEffect(() => {
    if (visible) invalidate();
  }, [visible, pointer, size, invalidate]);
  useFrame((_, dt) => {
    const t = track.current;
    t.progress = Math.min(
      1,
      t.progress === 1 ? 1 : (performance.now() - t.startedAt) / 900,
    );
    const ease =
      t.progress *
      t.progress *
      t.progress *
      (t.progress * (t.progress * 6 - 15) + 10);
    camera.position.lerpVectors(t.start, t.end, ease);
    look.current.lerpVectors(t.fromLook, t.toLook, ease);
    camera.up.lerpVectors(t.fromUp, t.toUp, ease).normalize();
    if (t.progress < 1) invalidate();
    else if (station === "home" && !mobile && !reduced) {
      offset.current.x = MathUtils.damp(
        offset.current.x,
        pointer[0] * 0.2,
        7,
        Math.min(dt, 0.05),
      );
      offset.current.y = MathUtils.damp(
        offset.current.y,
        -pointer[1] * 0.1,
        7,
        Math.min(dt, 0.05),
      );
      camera.position.x += offset.current.x;
      camera.position.y += offset.current.y;
      if (
        Math.abs(offset.current.x - pointer[0] * 0.2) +
          Math.abs(offset.current.y + pointer[1] * 0.1) >
        0.001
      )
        invalidate();
    }
    camera.lookAt(look.current);
    camera.updateMatrixWorld();
    gl.domElement.dataset.camera = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.transition = t.progress === 1 ? "settled" : "moving";
    if (station !== "home") {
      const points =
        station === "cv"
          ? [
              [-2.39, 1.43, 0.195],
              [-1.61, 1.43, 0.195],
              [-2.39, 1.43, 1.205],
              [-1.61, 1.43, 1.205],
            ]
          : [
              [-0.955, -0.58],
              [0.955, -0.58],
              [-0.955, 0.58],
              [0.955, 0.58],
            ].map(([x, y]) => [
              x + (station === "projects" ? -1.06 : 1.06),
              y + 2.14,
              -0.265,
            ]);
      const projected = points.map((p) =>
        new Vector3(...(p as V3)).project(camera),
      );
      const xs = projected.map((p) => ((p.x + 1) * size.width) / 2),
        ys = projected.map((p) => ((1 - p.y) * size.height) / 2);
      onScreenBounds({
        left: Math.min(...xs) + 3,
        top: Math.min(...ys) + 3,
        width: Math.max(...xs) - Math.min(...xs) - 6,
        height: Math.max(...ys) - Math.min(...ys) - 6,
      });
    }
    if (t.progress === 1 && !t.reported) {
      t.reported = true;
      onSettled(station);
    }
  });
  return null;
}

function DestinationLighting({
  station,
  hovered,
  reduced,
  economy,
}: RoomProps) {
  const main = useRef<PointLight>(null),
    secondary = useRef<PointLight>(null),
    paper = useRef<PointLight>(null),
    lamp = useRef<PointLight>(null);
  const { invalidate } = useThree();
  const started = useRef(0);
  useEffect(() => {
    started.current = performance.now();
    invalidate();
  }, [station, hovered, reduced, invalidate]);
  useFrame((_, dt) => {
    const attention = hovered || (station !== "home" ? station : null);
    const targets = [
      attention === "projects" ? 5 : attention ? 0.7 : 1.6,
      attention === "career" ? 5 : attention ? 0.6 : 1.4,
      attention === "cv" ? 8 : attention ? 2.2 : 4,
      station === "cv" ? 8 : 6,
    ];
    let moving = false;
    [main, secondary, paper, lamp].forEach((ref, i) => {
      if (!ref.current) return;
      const target = targets[i] * (economy ? 0.85 : 1);
      ref.current.intensity = reduced
        ? target
        : MathUtils.damp(ref.current.intensity, target, 6, Math.min(dt, 0.06));
      if (Math.abs(ref.current.intensity - target) > 0.01) moving = true;
    });
    if (moving && performance.now() - started.current < 1600) invalidate();
  });
  return (
    <>
      <pointLight
        ref={main}
        position={[-1.06, 2.03, 0.26]}
        color="#70c9ff"
        intensity={reduced ? 1.6 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={secondary}
        position={[1.06, 2.03, 0.26]}
        color="#969cff"
        intensity={reduced ? 1.4 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={paper}
        position={[-1.7, 2.6, 1.05]}
        color="#ffe0ab"
        intensity={reduced ? 2.8 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={lamp}
        position={[1.8, 2.38, -0.05]}
        color="#ffd099"
        intensity={reduced ? 5 : 0}
        distance={4}
        decay={2}
      />
    </>
  );
}
function MonitorSweep({ station, reduced }: RoomProps) {
  const mesh = useRef<Mesh>(null);
  const { invalidate } = useThree();
  const started = useRef(0);
  useEffect(() => {
    started.current = performance.now();
    invalidate();
  }, [station, reduced, invalidate]);
  useFrame(() => {
    if (!mesh.current) return;
    const time = (performance.now() - started.current) / 780;
    const active =
      !reduced && (station === "projects" || station === "career") && time < 1;
    mesh.current.visible = active;
    if (active) {
      mesh.current.position.set(
        station === "projects" ? -1.06 : 1.06,
        1.62 + time * 1.03,
        -0.248,
      );
      (mesh.current.material as MeshStandardMaterial).opacity =
        Math.sin(time * Math.PI) * 0.65;
      invalidate();
    }
  });
  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[1.87, 0.055]} />
      <meshBasicMaterial
        color="#a2dfff"
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Studio(props: RoomProps) {
  const { onReady } = props;
  const resources = useMemo(() => {
    const wood = surfaceTexture("wood"),
      stone = surfaceTexture("stone");
    const standard = (color: string, roughness = 0.65, metalness = 0) =>
      new MeshStandardMaterial({ color, roughness, metalness });
    const materials: Materials = {
      wood: new MeshStandardMaterial({ map: wood, roughness: 0.5 }),
      stone: new MeshStandardMaterial({
        map: stone,
        roughness: 0.38,
        metalness: 0.15,
      }),
      plaster: standard("#424650", 0.83),
      limestone: standard("#4b4b50"),
      seam: standard("#737a77"),
      bronze: standard("#a68a5e", 0.35, 0.65),
      metal: standard("#111a25", 0.3, 0.65),
      cabinet: standard("#455051", 0.5, 0.3),
      vent: standard("#080f13"),
      mat: standard("#344245"),
      screenOff: new MeshStandardMaterial({
        color: "#091623",
        emissive: "#163d5a",
        emissiveIntensity: 0.5,
        roughness: 0.78,
        metalness: 0,
      }),
      screenOn: new MeshStandardMaterial({
        color: "#183747",
        emissive: "#417db9",
        emissiveIntensity: 0.45,
        roughness: 0.28,
      }),
      screenLine: new MeshStandardMaterial({
        color: "#73bdd4",
        emissive: "#447aac",
        emissiveIntensity: 0.7,
      }),
      screenLineActive: new MeshStandardMaterial({
        color: "#b7cfcd",
        emissive: "#85b9bc",
        emissiveIntensity: 0.2,
      }),
      screenFrameActive: new MeshStandardMaterial({
        color: "#36566b",
        metalness: 0.4,
        roughness: 0.4,
      }),
      key: standard("#6e7776"),
      paper: standard("#f1ebde"),
      folio: standard("#464030"),
      folioActive: standard("#88684b", 0.5, 0.35),
      book: standard("#3c5557"),
      chair: standard("#222a36", 0.78),
      warmLight: new MeshStandardMaterial({
        color: "#ead1a1",
        emissive: "#e1ba77",
        emissiveIntensity: 1.1,
      }),
      coldLight: new MeshStandardMaterial({
        color: "#aedbdc",
        emissive: "#73b5c3",
        emissiveIntensity: 0.8,
      }),
      glass: new MeshPhysicalMaterial({
        color: "#9bbbc0",
        metalness: 0.15,
        roughness: 0.13,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        side: DoubleSide,
        clearcoat: 1,
      }),
      glassEdge: standard("#91b9bc", 0.2, 0.35),
      exterior: new MeshStandardMaterial({
        color: "#17203e",
        emissive: "#242d5c",
        emissiveIntensity: 0.65,
      }),
      exteriorColumn: standard("#141d31"),
      timeline: standard("#778d8e"),
      windowGlass: new MeshPhysicalMaterial({
        color: "#7386bc",
        roughness: 0.23,
        metalness: 0.2,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
      recess: standard("#0b1420"),
      art: standard("#172131", 0.45, 0.15),
      accent: new MeshStandardMaterial({
        color: "#88d6fa",
        emissive: "#4b7cd6",
        emissiveIntensity: 1.8,
      }),
      shelfLight: new MeshStandardMaterial({
        color: "#e6c799",
        emissive: "#cb9a57",
        emissiveIntensity: 1.2,
      }),
      rug: standard("#777976", 0.98),
    };
    return {
      box: new RoundedBoxGeometry(1, 1, 1, 2, 0.012),
      cushion: new RoundedBoxGeometry(1, 1, 1, 4, 0.17),
      materials,
      wood,
      stone,
    };
  }, []);
  useEffect(
    () => () => {
      resources.box.dispose();
      resources.cushion.dispose();
      resources.wood.dispose();
      resources.stone.dispose();
      Object.values(resources.materials).forEach((material) =>
        material.dispose(),
      );
    },
    [resources],
  );
  useEffect(() => {
    onReady();
  }, [onReady]);
  return (
    <RoomResources.Provider value={resources}>
      <color attach="background" args={["#121a2b"]} />
      <fog attach="fog" args={["#141c30", 20, 55]} />
      <hemisphereLight args={["#9aa9d5", "#4a4042", 0.7]} />
      <directionalLight
        position={[5, 8, -3]}
        intensity={2.5}
        color="#8194ed"
        castShadow={!props.economy}
        shadow-mapSize={[1024, 1024]}
        shadow-radius={3}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.035}
        shadow-bias={-0.00015}
      />
      <directionalLight
        position={[-3, 5, 7]}
        intensity={1.35}
        color="#dac7ad"
      />
      <DestinationLighting {...props} />
      <pointLight
        position={[-3.6, 3.65, -3.4]}
        intensity={6}
        distance={5}
        decay={2}
        color="#dfb883"
      />
      <pointLight
        position={[3.6, 4.3, -3.9]}
        intensity={8}
        distance={7}
        decay={2}
        color="#8292db"
      />
      <Environment resolution={64} frames={1} environmentIntensity={0.4}>
        <Lightformer
          position={[0, 6, 3]}
          scale={[9, 4, 1]}
          intensity={2}
          color="#a5b8ef"
          target={[0, 0, 0]}
        />
        <Lightformer
          position={[5, 4, -6]}
          scale={[5, 5, 1]}
          intensity={3}
          color="#8991e7"
          target={[0, 1, 0]}
        />
      </Environment>
      <group dispose={null}>
        <Architecture mobile={props.economy} />
        <Workbench
          active={props.station}
          hovered={props.hovered}
          mobile={props.economy}
        />
        <SupportingObjects mobile={props.economy} />
        <MonitorSweep {...props} />
        <InteractionTargets {...props} />
      </group>
      <CameraDirector {...props} />
    </RoomResources.Provider>
  );
}

export default function AtelierRoom(props: RoomProps) {
  const cleanup = useRef<() => void>();
  useEffect(() => () => cleanup.current?.(), []);
  return (
    <div
      className="architectural-scene"
      data-quality={props.economy ? "economy" : "standard"}
      role="group"
      aria-label="Contemporary computing studio with Projects monitor, Career monitor and CV on the desk"
    >
      <Canvas
        shadows={!props.economy}
        dpr={[1, props.economy ? 1.15 : 1.5]}
        camera={{
          position: desktopViews.home.position,
          fov: props.mobile ? 53 : 46,
          near: 0.1,
          far: 80,
        }}
        frameloop={props.visible ? "demand" : "never"}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color("#121a2b"));
          const lost = (event: Event) => {
            event.preventDefault();
            props.onFailure();
          };
          gl.domElement.addEventListener("webglcontextlost", lost);
          cleanup.current = () =>
            gl.domElement.removeEventListener("webglcontextlost", lost);
        }}
      >
        <Studio {...props} />
      </Canvas>
    </div>
  );
}
