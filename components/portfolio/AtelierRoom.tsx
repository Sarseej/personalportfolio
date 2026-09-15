"use client";

import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei/core/ContactShadows";
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
  Spherical,
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

import { studioMaterials as palette, latent } from "@/lib/visual/latent-studio";
import { projects } from "@/lib/content/portfolio";
import BlueMeadow from "./BlueMeadow";
import MeadowFireflies from "./MeadowFireflies";

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
      const base = kind === "wood" ? palette.woodGrain : palette.stoneGrain;
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
  return <group>
    <Box position={[0,-.13,4]} scale={[30,.2,18]} material="stone" />
    <Box position={[0,.005,1]} scale={[7,.03,5]} material="rug" />
    <Box position={[-9,3,-1]} scale={[.3,7,15]} material="plaster" />
    <Box position={[0,6.4,-3]} scale={[20,.3,5]} material="plaster" />
    <Box position={[0,.45,-5]} scale={[25,.9,.22]} material="plaster" />
    <Box position={[0,6,-5]} scale={[25,.3,.22]} material="metal" />
    {[-8,-3,2,7,12].map(x=><Box key={x} position={[x,3.4,-5]} scale={[.055,5.1,.15]} material="metal" />)}
    {!mobile && <Box position={[0,3.4,-5.04]} scale={[25,5,.012]} material="windowGlass" cast={false} />}
    <Box position={[0,.96,-4.9]} scale={[25,.035,.4]} material="bronze" />
    <Box position={[-8.8,2,-2]} scale={[.1,.02,9]} material="shelfLight" cast={false} />
  </group>;
}

function Workbench({
  active,
  hovered,
  mobile,
  reduced,
}: {
  active: View;
  hovered: Station | null;
  mobile: boolean;
  reduced: boolean;
}) {
  const { materials } = useContext(RoomResources);
  const folio = useRef<Group>(null);
  const liftStarted = useRef(0);
  const { invalidate } = useThree();
  useEffect(() => {
    liftStarted.current = performance.now();
    invalidate();
  }, [active, reduced, invalidate]);
  useFrame(() => {
    if (!folio.current) return;
    const progress = Math.min(
      1,
      (performance.now() - liftStarted.current) / 700,
    );
    const lifting = active === "cv" && !reduced && progress < 1;
    folio.current.position.y = lifting
      ? Math.sin(progress * Math.PI) * 0.045
      : 0;
    if (lifting) invalidate();
  });
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
              hovered === (side === -1 ? "career" : "projects") ||
              active === (side === -1 ? "career" : "projects")
                ? side === -1
                  ? "screenFrameActive"
                  : "frameTrace"
                : "metal"
            }
          />
          <Box
            position={[0, 2.14, 0.041]}
            scale={[1.91, 1.16, 0.015]}
            material={
              active === (side === -1 ? "career" : "projects")
                ? side === -1
                  ? "screenOn"
                  : "screenTrace"
                : "screenOff"
            }
            cast={false}
          />
          <Box
            position={[0.65, 1.53, 0.065]}
            scale={[0.23, 0.009, 0.012]}
            material={
              hovered === (side === -1 ? "career" : "projects")
                ? "accent"
                : "screenLine"
            }
            cast={false}
          />
          <Box
            position={[-0.72, 2.52, 0.055]}
            scale={[0.25, 0.025, 0.008]}
            material={
              active === (side === -1 ? "career" : "projects")
                ? "coldLight"
                : "screenLine"
            }
            cast={false}
          />
          {side === 1 ? (
            <mesh position={[0,2.14,.057]}>
              <planeGeometry args={[1.88,1.13]} />
              <primitive object={materials.projectPreview} attach="material" />
            </mesh>
          ) : (
            <>
              <mesh position={[0,2.14,.072]}>
                <planeGeometry args={[1.88,1.13]}/>
                <primitive object={materials.careerPreview} attach="material"/>
              </mesh>
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
      <group ref={folio}>
        <Box
          position={[-2, 1.37, 0.7]}
          scale={[0.82, 0.07, 1.05]}
          material={
            hovered === "cv" || active === "cv" ? "folioActive" : "folio"
          }
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
            pointerEvents="none"
            zIndexRange={[1, 0]}
          >
            <span className="physical-cv" aria-hidden="true">
              CV
            </span>
          </Html>
        )}
      </group>
      <Box
        position={[-2.6, 1.38, -.3]}
        scale={[0.35, 0.1, 0.35]}
        material="metal"
      />
      <Box
        position={[-2.6, 1.95, -.3]}
        scale={[0.045, 1.08, 0.045]}
        material="bronze"
      />
      <Box
        position={[-2.32, 2.48, -.3]}
        scale={[0.62, 0.08, 0.25]}
        material="metal"
      />
      <Box
        position={[-2.32, 2.434, -.3]}
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
        <meshStandardMaterial color={palette.cream} roughness={0.9} />
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
            <meshStandardMaterial color="#34463F" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
const positions: Record<Station, V3> = {
  projects: [1.06, 2.97, -0.25],
  career: [-1.06, 2.97, -0.25],
  cv: [-2, 1.48, 1.36],
};
function InteractionTargets({
  station,
  hovered,
  onSelect,
  onHover,
}: Pick<RoomProps, "station" | "hovered" | "onSelect" | "onHover">) {
  const hitboxes: Record<Station, Block> = {
    projects: { position: [1.06, 2.14, -0.24], scale: [2, 1.3, 0.14] },
    career: { position: [-1.06, 2.14, -0.24], scale: [2, 1.3, 0.14] },
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
  field: { position: [0, 4, -6.3], target: [0, 3.7, -14] },
  home: { position: [-4.3, 3.3, 6.6], target: [-0.2, 2.2, -0.8] },
  projects: { position: [1.06, 2.14, 0.48], target: [1.06, 2.14, -0.27] },
  career: { position: [-1.06, 2.14, 1.4], target: [-1.06, 2.14, -0.27] },
  cv: { position: [-2, 2.86, 0.7], target: [-2, 1.42, 0.7] },
};
const mobileViews: typeof desktopViews = {
  ...desktopViews,
  home: { position: [3.8, 3.4, 8.7], target: [-0.55, 2.4, -0.7] },
};
function CameraDirector({
  station,
  navigationVersion,
  mobile,
  reduced,
  pointer,
  interacting,
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
  const orbit = useRef(new Spherical());
  const ambientTime = useRef(0);
  useEffect(() => {
    const view = (mobile ? mobileViews : desktopViews)[station],
      t = track.current;
    t.start.copy(camera.position);
    offset.current = { x: 0, y: 0 };
    t.end.set(...view.position);
    if (!mobile && station === "career") {
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
      t.progress === 1 ? 1 : (performance.now() - t.startedAt) / (station === "field" ? 1000 : latent.flightMs),
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
    else if (station === "home" && !reduced) {
      if(!interacting.current) ambientTime.current += Math.min(dt,.05);
      const drift = mobile && !interacting.current ? Math.sin(ambientTime.current/19)*.08 : 0;
      const yaw = mobile ? drift : pointer.current[0] * 2;
      const pitch = mobile ? drift*.4 : -pointer.current[1] * 2;
      offset.current.x = MathUtils.damp(offset.current.x, yaw, 9, Math.min(dt,.05));
      offset.current.y = MathUtils.damp(offset.current.y, pitch, 9, Math.min(dt,.05));
      orbit.current.setFromVector3(camera.position.sub(look.current));
      orbit.current.theta += MathUtils.degToRad(latent.yawDegrees)*offset.current.x;
      orbit.current.phi -= MathUtils.degToRad(latent.pitchDegrees)*offset.current.y;
      camera.position.setFromSpherical(orbit.current).add(look.current);
    }
    camera.lookAt(look.current);
    camera.updateMatrixWorld();
    gl.domElement.dataset.camera = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.target = look.current.toArray().join(",");
    gl.domElement.dataset.transition = t.progress === 1 ? "settled" : "moving";
    if (station !== "home" && station !== "field") {
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
              x + (station === "projects" ? 1.06 : -1.06),
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
      station === "cv" ? 8 : station === "field" ? 3.5 : 6,
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
        position={[1.06, 2.03, 0.26]}
        color={latent.cyan}
        intensity={reduced ? 1.6 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={secondary}
        position={[-1.06, 2.03, 0.26]}
        color={latent.lunar}
        intensity={reduced ? 1.4 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={paper}
        position={[-1.7, 2.6, 1.05]}
        color={latent.lamp}
        intensity={reduced ? 2.8 : 0}
        distance={3.4}
        decay={2}
      />
      <pointLight
        ref={lamp}
        position={[-2.25, 2.38, 0.45]}
        color={latent.lamp}
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
      !reduced && station === "career" && time < 1;
    mesh.current.visible = active;
    if (active) {
      mesh.current.position.set(
        -1.06,
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
        color={palette.parchment}
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
    const preview = document.createElement("canvas");
    preview.width=1024;preview.height=620;
    const ctx=preview.getContext("2d")!;
    ctx.fillStyle=latent.night;ctx.fillRect(0,0,1024,620);
    const face=getComputedStyle(document.documentElement).getPropertyValue("--font-body");
    ctx.fillStyle=latent.bright;ctx.font=`112px ${face}`;ctx.fillText('Projects',64,265);
    ctx.fillStyle=latent.silver;ctx.font=`32px ${face}`;ctx.fillText(projects[0].title,68,338);
    const screenTexture=new CanvasTexture(preview);screenTexture.colorSpace=SRGBColorSpace;
    const careerCanvas=document.createElement('canvas');careerCanvas.width=1024;careerCanvas.height=620;
    const careerContext=careerCanvas.getContext('2d')!;
    careerContext.fillStyle=latent.night;careerContext.fillRect(0,0,1024,620);
    careerContext.fillStyle=latent.bright;careerContext.font=`112px ${face}`;careerContext.fillText('Career',64,265);
    careerContext.fillStyle=latent.silver;careerContext.font=`30px ${face}`;careerContext.fillText('Research · Software · Teaching',68,338);
    const careerTexture=new CanvasTexture(careerCanvas);careerTexture.colorSpace=SRGBColorSpace;
    const materials: Materials = {
      careerPreview: new MeshStandardMaterial({map:careerTexture,emissiveMap:careerTexture,emissive:latent.bright,emissiveIntensity:.8,roughness:.7}),
      projectPreview: new MeshStandardMaterial({map:screenTexture,emissiveMap:screenTexture,emissive:latent.bright,emissiveIntensity:.8,roughness:.7}),
      wood: new MeshStandardMaterial({ map: wood, roughness: 0.5 }),
      stone: new MeshStandardMaterial({
        map: stone,
        roughness: 0.85,
        metalness: 0,
      }),
      plaster: standard(palette.eggshell, 0.83),
      limestone: standard(palette.cream),
      seam: standard(palette.taupe),
      bronze: standard(palette.taupe, 0.35, 0.65),
      metal: standard(palette.espresso, 0.3, 0.65),
      cabinet: standard(palette.sand, 0.5, 0.3),
      vent: standard(palette.ink),
      mat: standard(palette.sage),
      screenOff: new MeshStandardMaterial({
        color: latent.glass,
        emissive: latent.navy,
        emissiveIntensity: 0.7,
        roughness: 0.78,
        metalness: 0,
      }),
      screenOn: new MeshStandardMaterial({
        color: latent.glass,
        emissive: latent.cyan,
        emissiveIntensity: 0.3,
        roughness: 0.28,
      }),
      screenTrace: new MeshStandardMaterial({
        color: palette.cream,
        emissive: palette.parchment,
        emissiveIntensity: 0.45,
        roughness: 0.28,
      }),
      frameTrace: standard(palette.olive, 0.4, 0.4),
      screenLine: new MeshStandardMaterial({
        color: palette.olive,
        emissive: palette.sage,
        emissiveIntensity: 0.7,
      }),
      screenLineActive: new MeshStandardMaterial({
        color: palette.cream,
        emissive: palette.sage,
        emissiveIntensity: 0.2,
      }),
      screenFrameActive: new MeshStandardMaterial({
        color: latent.glass,
        metalness: 0.4,
        roughness: 0.4,
      }),
      key: standard(palette.eggshell),
      paper: standard(latent.paper),
      folio: standard(palette.espresso),
      folioActive: standard(palette.olive, 0.5, 0.35),
      book: standard("#34463F"),
      chair: standard(palette.sage, 0.78),
      warmLight: new MeshStandardMaterial({
        color: latent.lamp,
        emissive: latent.lamp,
        emissiveIntensity: 2,
      }),
      coldLight: new MeshStandardMaterial({
        color: palette.parchment,
        emissive: palette.cream,
        emissiveIntensity: 0.8,
      }),
      glass: new MeshPhysicalMaterial({
        color: palette.glass,
        metalness: 0.15,
        roughness: 0.13,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        side: DoubleSide,
        clearcoat: 1,
      }),
      glassEdge: standard(palette.sage, 0.2, 0.35),
      exterior: new MeshStandardMaterial({
        color: palette.cream,
        emissive: palette.parchment,
        emissiveIntensity: 0.65,
      }),
      exteriorColumn: standard(palette.taupe),
      timeline: standard(palette.olive),
      windowGlass: new MeshPhysicalMaterial({
        color: palette.glass,
        roughness: 0.23,
        metalness: 0.2,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
      }),
      recess: standard(palette.sand),
      art: standard(palette.cream, 0.45, 0.15),
      accent: new MeshStandardMaterial({
        color: palette.cream,
        emissive: palette.parchment,
        emissiveIntensity: 0.35,
      }),
      shelfLight: new MeshStandardMaterial({
        color: palette.parchment,
        emissive: palette.cream,
        emissiveIntensity: 1.2,
      }),
      rug: standard(palette.sand, 0.98),
    };
    return {
      box: new RoundedBoxGeometry(1, 1, 1, 2, 0.012),
      cushion: new RoundedBoxGeometry(1, 1, 1, 4, 0.17),
      materials,
      wood,
      stone,
      screenTexture,
      careerTexture,
    };
  }, []);
  useEffect(
    () => () => {
      resources.box.dispose();
      resources.cushion.dispose();
      resources.wood.dispose();
      resources.stone.dispose();
      resources.screenTexture.dispose();
      resources.careerTexture.dispose();
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
      <color attach="background" args={[palette.eggshell]} />
      <fog attach="fog" args={[latent.navy, 16, 48]} />
      <hemisphereLight
        args={[
          latent.lunar,
          latent.navy,
          props.station === "cv" ? 1.1 : 0.75,
        ]}
      />
      <directionalLight
        position={[5, 8, -3]}
        intensity={props.station === "cv" ? 2.1 : 2.2}
        color={latent.lunar}
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
        intensity={0.75}
        color={latent.silver}
      />
      <DestinationLighting {...props} />
      <pointLight
        position={[-3.6, 3.65, -3.4]}
        intensity={6}
        distance={5}
        decay={2}
        color={palette.parchment}
      />
      <pointLight
        position={[3.6, 4.3, -3.9]}
        intensity={8}
        distance={7}
        decay={2}
        color={palette.parchment}
      />
      <Environment resolution={64} frames={1} environmentIntensity={0.4}>
        <Lightformer
          position={[0, 6, 3]}
          scale={[9, 4, 1]}
          intensity={2}
          color={palette.parchment}
          target={[0, 0, 0]}
        />
        <Lightformer
          position={[5, 4, -6]}
          scale={[5, 5, 1]}
          intensity={3}
          color={palette.parchment}
          target={[0, 1, 0]}
        />
      </Environment>
      <group dispose={null}>
        <Architecture mobile={props.economy} />
        <Workbench
          active={props.station}
          hovered={props.hovered}
          mobile={props.economy}
          reduced={props.reduced}
        />
        <SupportingObjects mobile={props.economy} />
        <BlueMeadow {...props} />
        <MeadowFireflies {...props} />
        {!props.economy && (
          <ContactShadows
            position={[0, 0.039, 1]}
            scale={[7.6, 5.9]}
            opacity={0.4}
            blur={2.5}
            far={3}
            resolution={256}
            frames={1}
            color={palette.espresso}
          />
        )}
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
          fov: props.mobile ? 48 : 46,
          near: 0.1,
          far: 180,
        }}
        frameloop={!props.visible ? "never" : props.reduced || (props.station !== "home" && props.station !== "field") ? "demand" : "always"}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
          gl.setClearColor(new Color(palette.eggshell));
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
