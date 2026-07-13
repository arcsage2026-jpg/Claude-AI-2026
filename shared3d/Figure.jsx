import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

export const BODY = {
  male: {
    shoulderW: 0.36, hipW: 0.24, torsoLen: 0.50, headR: 0.115,
    armR: 0.05, legR: 0.075, upperArmLen: 0.27, forearmLen: 0.25,
    thighLen: 0.42, shinLen: 0.40,
    skin: "#C89B76", shirt: "#3a2a18",
  },
  female: {
    shoulderW: 0.30, hipW: 0.26, torsoLen: 0.46, headR: 0.10,
    armR: 0.042, legR: 0.062, upperArmLen: 0.25, forearmLen: 0.23,
    thighLen: 0.40, shinLen: 0.38,
    skin: "#D9AE87", shirt: "#20302e",
  },
};

function lerpVec3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function lerpJoint(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = lerpVec3(a[k], b[k], t);
  return out;
}
export function lerpPose(a, b, t) {
  return {
    root: lerpVec3(a.root, b.root, t),
    spine: lerpVec3(a.spine, b.spine, t),
    head: lerpVec3(a.head, b.head, t),
    leftArm: lerpJoint(a.leftArm, b.leftArm, t),
    rightArm: lerpJoint(a.rightArm, b.rightArm, t),
    leftLeg: lerpJoint(a.leftLeg, b.leftLeg, t),
    rightLeg: lerpJoint(a.rightLeg, b.rightLeg, t),
  };
}

function Limb({ length, radius, color }) {
  const cylLen = Math.max(0.02, length - radius * 2);
  return (
    <mesh position={[0, -length / 2, 0]}>
      <capsuleGeometry args={[radius, cylLen, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.04} />
    </mesh>
  );
}

function Arm({ side, body, rot }) {
  const sign = side === "left" ? -1 : 1;
  return (
    <group position={[(sign * body.shoulderW) / 2, -0.02, 0]} rotation={rot.shoulder}>
      <Limb length={body.upperArmLen} radius={body.armR} color={body.skin} />
      <group position={[0, -body.upperArmLen, 0]} rotation={rot.elbow}>
        <Limb length={body.forearmLen} radius={body.armR * 0.85} color={body.skin} />
      </group>
    </group>
  );
}

function Leg({ side, body, rot }) {
  const sign = side === "left" ? -1 : 1;
  return (
    <group position={[(sign * body.hipW) / 2, 0, 0]} rotation={rot.hip}>
      <Limb length={body.thighLen} radius={body.legR} color={body.shirt} />
      <group position={[0, -body.thighLen, 0]} rotation={rot.knee}>
        <Limb length={body.shinLen} radius={body.legR * 0.82} color={body.skin} />
      </group>
    </group>
  );
}

export function Figure({ gender = "male", pose }) {
  const body = BODY[gender] || BODY.male;
  const standHeight = body.thighLen + body.shinLen;

  return (
    <group position={[0, standHeight, 0]} rotation={pose.root}>
      <mesh>
        <boxGeometry args={[body.hipW + 0.06, 0.14, 0.14]} />
        <meshStandardMaterial color={body.shirt} roughness={0.6} />
      </mesh>

      <Leg side="left" body={body} rot={pose.leftLeg} />
      <Leg side="right" body={body} rot={pose.rightLeg} />

      <group position={[0, 0.07, 0]} rotation={pose.spine}>
        <mesh position={[0, body.torsoLen / 2, 0]}>
          <capsuleGeometry args={[body.hipW / 2 + 0.02, Math.max(0.02, body.torsoLen - (body.hipW / 2 + 0.02) * 2), 4, 8]} />
          <meshStandardMaterial color={body.shirt} roughness={0.6} />
        </mesh>

        <group position={[0, body.torsoLen + body.headR * 0.6, 0]} rotation={pose.head}>
          <mesh position={[0, body.headR, 0]}>
            <sphereGeometry args={[body.headR, 16, 16]} />
            <meshStandardMaterial color={body.skin} roughness={0.5} />
          </mesh>
        </group>

        <group position={[0, body.torsoLen - 0.05, 0]}>
          <Arm side="left" body={body} rot={pose.leftArm} />
          <Arm side="right" body={body} rot={pose.rightArm} />
        </group>
      </group>
    </group>
  );
}

/** Renders a single static pose, or lerp-animates back and forth between a [poseA, poseB] pair. */
export function AnimatedFigure({ gender, poseSpec }) {
  const [t, setT] = useState(0);
  const dirRef = useRef(1);

  useFrame((_, delta) => {
    if (!Array.isArray(poseSpec)) return;
    setT((prev) => {
      let next = prev + dirRef.current * delta * 0.7;
      if (next >= 1) { next = 1; dirRef.current = -1; }
      if (next <= 0) { next = 0; dirRef.current = 1; }
      return next;
    });
  });

  const pose = Array.isArray(poseSpec) ? lerpPose(poseSpec[0], poseSpec[1], t) : poseSpec;
  return <Figure gender={gender} pose={pose} />;
}
