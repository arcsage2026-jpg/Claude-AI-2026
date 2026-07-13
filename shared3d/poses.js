const D = (deg) => (deg * Math.PI) / 180;

/**
 * Joint rotations, in radians, for a procedural humanoid built from nested
 * groups (see Figure.jsx). Each pose is a full snapshot of every joint;
 * missing joints default to [0,0,0] (neutral) when resolved.
 *
 * Axis convention for a limb hanging along -Y from its pivot:
 *   rotate X -> swings forward/back, rotate Z -> swings side to side.
 */
const Z = [0, 0, 0];
const arm = (shoulder, elbow) => ({ shoulder, elbow });
const leg = (hip, knee) => ({ hip, knee });

export const POSES = {
  idle: {
    root: Z, spine: Z, head: Z,
    leftArm: arm([D(6), 0, D(-6)], [D(6), 0, 0]),
    rightArm: arm([D(6), 0, D(6)], [D(6), 0, 0]),
    leftLeg: leg(Z, Z),
    rightLeg: leg(Z, Z),
  },

  armsRaisedA: {
    root: Z, spine: [D(-6), 0, 0], head: [D(-4), 0, 0],
    leftArm: arm([D(20), 0, D(-10)], [D(4), 0, 0]),
    rightArm: arm([D(20), 0, D(10)], [D(4), 0, 0]),
    leftLeg: leg(Z, Z),
    rightLeg: leg(Z, Z),
  },
  armsRaisedB: {
    root: Z, spine: [D(-14), 0, 0], head: [D(-10), 0, 0],
    leftArm: arm([D(150), 0, D(-14)], [0, 0, 0]),
    rightArm: arm([D(150), 0, D(14)], [0, 0, 0]),
    leftLeg: leg(Z, Z),
    rightLeg: leg(Z, Z),
  },

  squatTop: {
    root: Z, spine: [D(6), 0, 0], head: Z,
    leftArm: arm([D(30), 0, D(-8)], [D(60), 0, 0]),
    rightArm: arm([D(30), 0, D(8)], [D(60), 0, 0]),
    leftLeg: leg([D(6), 0, D(-4)], [D(-8), 0, 0]),
    rightLeg: leg([D(6), 0, D(4)], [D(-8), 0, 0]),
  },
  squatBottom: {
    root: [0, 0, 0], spine: [D(32), 0, 0], head: [D(-10), 0, 0],
    leftArm: arm([D(50), 0, D(-10)], [D(70), 0, 0]),
    rightArm: arm([D(50), 0, D(10)], [D(70), 0, 0]),
    leftLeg: leg([D(60), 0, D(-6)], [D(-110), 0, 0]),
    rightLeg: leg([D(60), 0, D(6)], [D(-110), 0, 0]),
  },

  pushupUp: {
    root: [0, D(90), 0], spine: [D(74), 0, 0], head: [D(-8), 0, 0],
    leftArm: arm([D(2), 0, D(-16)], [D(2), 0, 0]),
    rightArm: arm([D(2), 0, D(16)], [D(2), 0, 0]),
    leftLeg: leg([D(6), 0, D(-3)], [D(4), 0, 0]),
    rightLeg: leg([D(6), 0, D(3)], [D(4), 0, 0]),
  },
  pushupDown: {
    root: [0, D(90), 0], spine: [D(66), 0, 0], head: [D(-4), 0, 0],
    leftArm: arm([D(-6), 0, D(-18)], [D(78), 0, 0]),
    rightArm: arm([D(-6), 0, D(18)], [D(78), 0, 0]),
    leftLeg: leg([D(6), 0, D(-3)], [D(4), 0, 0]),
    rightLeg: leg([D(6), 0, D(3)], [D(4), 0, 0]),
  },

  plank: {
    root: [0, D(90), 0], spine: [D(78), 0, 0], head: [D(-10), 0, 0],
    leftArm: arm([D(-4), 0, D(-14)], [D(88), 0, 0]),
    rightArm: arm([D(-4), 0, D(14)], [D(88), 0, 0]),
    leftLeg: leg([D(4), 0, D(-3)], [D(2), 0, 0]),
    rightLeg: leg([D(4), 0, D(3)], [D(2), 0, 0]),
  },

  lunge: {
    root: Z, spine: [D(8), 0, 0], head: Z,
    leftArm: arm([D(24), 0, D(-30)], [D(20), 0, 0]),
    rightArm: arm([D(24), 0, D(30)], [D(20), 0, 0]),
    leftLeg: leg([D(-40), 0, D(-4)], [D(-8), 0, 0]),
    rightLeg: leg([D(50), 0, D(4)], [D(-100), 0, 0]),
  },

  horseStance: {
    root: Z, spine: [D(4), 0, 0], head: Z,
    leftArm: arm([D(70), 0, D(-40)], [D(90), 0, 0]),
    rightArm: arm([D(70), 0, D(40)], [D(90), 0, 0]),
    leftLeg: leg([D(8), 0, D(-40)], [D(-50), 0, 0]),
    rightLeg: leg([D(8), 0, D(40)], [D(-50), 0, 0]),
  },

  kick: {
    root: [0, D(10), D(-4)], spine: [D(-6), 0, D(-6)], head: Z,
    leftArm: arm([D(30), 0, D(-40)], [D(30), 0, 0]),
    rightArm: arm([D(20), 0, D(20)], [D(10), 0, 0]),
    leftLeg: leg([D(-8), 0, D(-4)], [D(4), 0, 0]),
    rightLeg: leg([D(-95), 0, D(6)], [D(20), 0, 0]),
  },

  pullupHang: {
    root: Z, spine: Z, head: [D(6), 0, 0],
    leftArm: arm([D(168), 0, D(-8)], [D(4), 0, 0]),
    rightArm: arm([D(168), 0, D(8)], [D(4), 0, 0]),
    leftLeg: leg([D(4), 0, D(-3)], [D(6), 0, 0]),
    rightLeg: leg([D(4), 0, D(3)], [D(6), 0, 0]),
  },
  pullupTop: {
    root: Z, spine: Z, head: [D(-8), 0, 0],
    leftArm: arm([D(150), 0, D(-10)], [D(110), 0, 0]),
    rightArm: arm([D(150), 0, D(10)], [D(110), 0, 0]),
    leftLeg: leg([D(4), 0, D(-3)], [D(10), 0, 0]),
    rightLeg: leg([D(4), 0, D(3)], [D(10), 0, 0]),
  },

  runA: {
    root: [0, D(6), 0], spine: [D(10), 0, 0], head: Z,
    leftArm: arm([D(50), 0, D(-6)], [D(80), 0, 0]),
    rightArm: arm([D(-30), 0, D(6)], [D(60), 0, 0]),
    leftLeg: leg([D(-40), 0, D(-3)], [D(-90), 0, 0]),
    rightLeg: leg([D(45), 0, D(3)], [D(-10), 0, 0]),
  },
  runB: {
    root: [0, D(-6), 0], spine: [D(10), 0, 0], head: Z,
    leftArm: arm([D(-30), 0, D(-6)], [D(60), 0, 0]),
    rightArm: arm([D(50), 0, D(6)], [D(80), 0, 0]),
    leftLeg: leg([D(45), 0, D(-3)], [D(-10), 0, 0]),
    rightLeg: leg([D(-40), 0, D(3)], [D(-90), 0, 0]),
  },

  seatedBreath: {
    root: Z, spine: [D(-4), 0, 0], head: [D(-6), 0, 0],
    leftArm: arm([D(10), 0, D(-16)], [D(80), 0, 0]),
    rightArm: arm([D(10), 0, D(16)], [D(80), 0, 0]),
    leftLeg: leg([D(-90), 0, D(-30)], [D(-100), 0, 0]),
    rightLeg: leg([D(-90), 0, D(30)], [D(-100), 0, 0]),
  },

  taiChiFlow: {
    root: [0, D(8), 0], spine: [D(4), 0, D(4)], head: Z,
    leftArm: arm([D(40), 0, D(-50)], [D(30), 0, 0]),
    rightArm: arm([D(70), 0, D(20)], [D(50), 0, 0]),
    leftLeg: leg([D(10), 0, D(-10)], [D(-20), 0, 0]),
    rightLeg: leg([D(-10), 0, D(10)], [D(-10), 0, 0]),
  },
};

/** exercise id -> pose key, or [poseKeyA, poseKeyB] to oscillate between. */
export const EXERCISE_POSES = {
  "mon-surya-warmup": ["armsRaisedA", "armsRaisedB"],
  "mon-stance-work": "horseStance",
  "mon-hindu-pushups": ["pushupUp", "pushupDown"],
  "mon-hindu-squats": ["squatTop", "squatBottom"],
  "mon-bear-crawl": "plank",
  "mon-cooldown": "seatedBreath",

  "tue-calisthenics-circuit": ["squatTop", "squatBottom"],
  "tue-fast-surya": ["armsRaisedA", "armsRaisedB"],
  "tue-run-intervals": ["runA", "runB"],
  "tue-cooldown-stretch": "taiChiFlow",

  "wed-tai-chi": "taiChiFlow",
  "wed-chandra-namaskar": ["armsRaisedA", "armsRaisedB"],
  "wed-yoga-stretch": "taiChiFlow",
  "wed-pranayama": "seatedBreath",

  "thu-surya-warmup": ["armsRaisedA", "armsRaisedB"],
  "thu-shaolin-kicks": "kick",
  "thu-pullups": ["pullupHang", "pullupTop"],
  "thu-iron-body-holds": "plank",
  "thu-hollow-hold": "plank",
  "thu-cooldown": "seatedBreath",

  "fri-calisthenics-circuit": ["squatTop", "squatBottom"],
  "fri-yoga-holds": "taiChiFlow",
  "fri-cooldown": "seatedBreath",

  "sat-surya-warmup": ["armsRaisedA", "armsRaisedB"],
  "sat-shaolin-flow": ["squatTop", "squatBottom"],
  "sat-bear-hug-walk": "lunge",
  "sat-run-ruck": ["runA", "runB"],
  "sat-taichi-cooldown": "taiChiFlow",
};

export function resolvePoseSpec(exerciseId) {
  const spec = EXERCISE_POSES[exerciseId] || "idle";
  if (Array.isArray(spec)) return [POSES[spec[0]], POSES[spec[1]]];
  return POSES[spec];
}
