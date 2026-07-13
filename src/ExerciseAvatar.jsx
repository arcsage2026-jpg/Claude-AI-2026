import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AnimatedFigure } from "../shared3d/Figure.jsx";
import { resolvePoseSpec } from "../shared3d/poses.js";
import { T } from "../shared/theme.js";

export default function ExerciseAvatar({ exerciseId }) {
  const [gender, setGender] = useState("male");
  const poseSpec = resolvePoseSpec(exerciseId);

  return (
    <div>
      <div style={{ height: 220, borderRadius: 14, overflow: "hidden", background: `linear-gradient(180deg, ${T.bg2}, ${T.bg})`, border: `1px solid ${T.line}` }}>
        <Canvas
          camera={{ position: [1.15, 0.95, 2.5], fov: 42 }}
          dpr={[1, 1.5]}
          onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 2]} intensity={0.9} />
          <directionalLight position={[-2, 1, -1]} intensity={0.25} />
          <AnimatedFigure gender={gender} poseSpec={poseSpec} />
        </Canvas>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
        {["male", "female"].map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            style={{
              fontSize: 11, textTransform: "uppercase", letterSpacing: 1, padding: "5px 12px", borderRadius: 999,
              border: `1px solid ${gender === g ? T.solar : T.line}`,
              background: gender === g ? T.solarSoft : "transparent",
              color: gender === g ? T.solar : T.sub, cursor: "pointer",
            }}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
