import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { AnimatedFigure } from "../shared3d/Figure.jsx";
import { resolvePoseSpec } from "../shared3d/poses.js";

/**
 * Standalone entry point for the avatar scene, built as a separate bundle
 * (see avatar.html + vite.config.js multi-entry build) and loaded inside a
 * react-native-webview on mobile. Reads initial state from URL query params
 * (?exerciseId=...&gender=...) and accepts live updates via postMessage, so
 * the native side can switch exercises/gender without reloading the WebView.
 */
function AvatarStandalone() {
  const params = new URLSearchParams(window.location.search);
  const [exerciseId, setExerciseId] = useState(params.get("exerciseId") || "mon-hindu-squats");
  const [gender, setGender] = useState(params.get("gender") || "male");

  useEffect(() => {
    const onMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.exerciseId) setExerciseId(data.exerciseId);
        if (data.gender) setGender(data.gender);
      } catch (err) { /* ignore malformed messages */ }
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("message", onMessage); // Android react-native-webview quirk
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("message", onMessage);
    };
  }, []);

  const poseSpec = resolvePoseSpec(exerciseId);

  return (
    <Canvas
      camera={{ position: [1.15, 0.95, 2.5], fov: 42 }}
      dpr={[1, 1.5]}
      onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={0.9} />
      <directionalLight position={[-2, 1, -1]} intensity={0.25} />
      <AnimatedFigure gender={gender} poseSpec={poseSpec} />
    </Canvas>
  );
}

ReactDOM.createRoot(document.getElementById("avatar-root")).render(
  <React.StrictMode>
    <AvatarStandalone />
  </React.StrictMode>
);
