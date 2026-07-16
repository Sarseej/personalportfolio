"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import SceneContent from "./SceneContent";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function AttentionSpace() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#050508",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050508" }}
      >
        <color attach="background" args={["#050508"]} />

        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <pointLight position={[10, 10, 10]} intensity={0.3} />

        {/* Stars for depth */}
        <Stars
          radius={50}
          depth={50}
          count={2000}
          factor={2}
          saturation={0}
          fade
          speed={0.3}
        />

        {/* Scene content: nodes, beams, particles */}
        <SceneContent />

        {/* Camera controls: orbit but no auto-rotate */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={6}
          maxDistance={25}
          autoRotate={false}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Post-processing: bloom for glow */}
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
