"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { useModelStore } from "@/lib/store/useModelStore";
import {
  NODE_TOKENS,
  CATEGORY_COLORS,
  TOKEN_NODE_MAP,
} from "@/lib/model/nodeTokens";
import { nodes } from "@/lib/content/resume";

// ── Particle field ──────────────────────────────────────────────────────────

function Particles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
        ] as [number, number, number],
        speed: 0.002 + Math.random() * 0.008,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      dummy.position.set(
        p.position[0] + Math.sin(t * p.speed + p.offset) * 0.5,
        p.position[1] + Math.cos(t * p.speed * 0.7 + p.offset) * 0.5,
        p.position[2] + Math.sin(t * p.speed * 0.5 + p.offset) * 0.3,
      );
      dummy.scale.setScalar(0.02 + Math.sin(t * p.speed * 2 + p.offset) * 0.01);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}

// ── Single node sphere ──────────────────────────────────────────────────────

function NodeSphere({
  nodeId,
  token,
  position,
  color,
}: {
  nodeId: string;
  token: number;
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const clickNode = useModelStore((s) => s.clickNode);
  const clickedTokens = useModelStore((s) => s.clickedTokens);
  const selectedNodeId = useModelStore((s) => s.selectedNodeId);

  const isClicked = clickedTokens.includes(token);
  const isSelected = selectedNodeId === nodeId;
  const resumeNode = nodes.find((n) => n.id === nodeId);
  const label = resumeNode?.label ?? nodeId;

  // Glow animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const baseScale = isClicked ? 1.2 : 1.0;
    const pulse = Math.sin(t * 2 + token) * 0.05;
    meshRef.current.scale.setScalar(baseScale + pulse);
  });

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          clickNode(nodeId);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isClicked ? 2.0 : 0.8}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow halo */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isClicked ? 0.25 : 0.08}
          toneMapped={false}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -0.65, 0]}
        fontSize={0.18}
        color={isSelected ? "#ffffff" : "#888888"}
        anchorX="center"
        anchorY="top"
        maxWidth={2.5}
        font={undefined}
      >
        {label}
      </Text>
    </group>
  );
}

// ── Attention beam ──────────────────────────────────────────────────────────

function AttentionBeam() {
  const beam = useModelStore((s) => s.currentBeam);

  if (!beam) return null;

  // Map weight (0–1 range, summed across 3 heads so max ~3) to visual properties
  const normalizedWeight = Math.min(beam.weight / 1.5, 1.0);
  const opacity = 0.15 + normalizedWeight * 0.85;
  const lineWidth = 1 + normalizedWeight * 3;

  // Color: bright = high attention, dim = low
  const color = new THREE.Color();
  color.setHSL(0.55, 0.8, 0.4 + normalizedWeight * 0.4); // blue-ish, brightening

  return (
    <Line
      points={[beam.fromPos, beam.toPos]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      toneMapped={false}
    />
  );
}

// ── Scene content (everything inside the Canvas) ────────────────────────────

export default function SceneContent() {
  return (
    <>
      <Particles count={150} />

      {NODE_TOKENS.map((nt) => {
        const resumeNode = nodes.find((n) => n.id === nt.nodeId);
        const category = resumeNode?.category ?? "skill";
        const color = CATEGORY_COLORS[category];

        return (
          <NodeSphere
            key={nt.nodeId}
            nodeId={nt.nodeId}
            token={nt.token}
            position={nt.position}
            color={color}
          />
        );
      })}

      <AttentionBeam />
    </>
  );
}
