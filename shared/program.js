export const PHASES = [
  { n: 1, name: "Foundation", weeks: "1–4" },
  { n: 2, name: "Build", weeks: "5–8" },
  { n: 3, name: "Advanced", weeks: "9–12" },
];

export const DAYS = [
  { key: "mon", label: "Mon", title: "Shaolin Strength + Sun", element: "solar", goals: ["Strength", "Cardio"], blocks: [
    { id: "mon-surya-warmup", icon: "sun", name: "Surya Namaskar — warm-up", vol: ["5 rounds slow", "8–10 rounds", "12–15 rounds"] },
    { id: "mon-stance-work", icon: "flame", name: "Stance work — Ma Bu + Gong Bu", note: "Horse stance + bow stance", vol: ["30s + 20s/side", "45s + 40s/side", "90s + 60s/side"] },
    { id: "mon-hindu-pushups", icon: "flame", name: "Hindu push-ups (Dand)", vol: ["3 × 6–8", "4 × 12–15", "5 × 20–25"] },
    { id: "mon-hindu-squats", icon: "activity", name: "Hindu squats (Baithak)", vol: ["3 × 20", "4 × 40", "5 × 60–100"] },
    { id: "mon-bear-crawl", icon: "activity", name: "Bear crawl", vol: ["3 × 10m", "4 × 15m", "5 × 20m ↔"] },
    { id: "mon-cooldown", icon: "wind", name: "Cooldown — pranayama + Shavasana", vol: ["5–8 min", "5–8 min", "8–10 min"] },
  ]},
  { key: "tue", label: "Tue", title: "Conditioning", element: "solar", goals: ["Cardio", "Stamina"], blocks: [
    { id: "tue-calisthenics-circuit", icon: "activity", name: "Calisthenics circuit", note: "15 squats · 10 push-ups · 10 burpees · 20 mtn climbers · 30s plank", vol: ["2 rounds", "3 rounds", "4 rounds"] },
    { id: "tue-fast-surya", icon: "sun", name: "Fast Surya Namaskar", vol: ["5 rounds brisk", "10 rounds fast", "15 rounds fast"] },
    { id: "tue-run-intervals", icon: "activity", name: "Run intervals", vol: ["6 × 200m", "8 × 200m", "sprint ladders"] },
    { id: "tue-cooldown-stretch", icon: "wind", name: "Cooldown stretch", vol: ["5 min", "5 min", "5–8 min"] },
  ]},
  { key: "wed", label: "Wed", title: "Flow & Flexibility", element: "lunar", goals: ["Flexibility", "Recovery"], blocks: [
    { id: "wed-tai-chi", icon: "moon", name: "Tai Chi", vol: ["8-form · 15 min", "24-form · 20 min", "24-form + silk-reeling · 30 min"] },
    { id: "wed-chandra-namaskar", icon: "moon", name: "Chandra Namaskar", vol: ["2–4 rounds", "4–6 rounds", "6–8 rounds + holds"] },
    { id: "wed-yoga-stretch", icon: "wind", name: "Yoga stretch — ladder", vol: ["Beginner · hold 20–30s", "Intermediate · 30–45s", "Advanced · 45–60s"] },
    { id: "wed-pranayama", icon: "wind", name: "Pranayama", vol: ["Nadi Shodhana 5 min", "+ Bhramari", "+ extended"] },
  ]},
  { key: "thu", label: "Thu", title: "Shaolin Power + Pull", element: "solar", goals: ["Strength", "Endurance"], blocks: [
    { id: "thu-surya-warmup", icon: "sun", name: "Surya Namaskar — warm-up", vol: ["3–5 rounds", "8–10 rounds", "12–15 rounds"] },
    { id: "thu-shaolin-kicks", icon: "flame", name: "Shaolin kicks — front + crescent", note: "Straight, inside & outside crescent", vol: ["2 × 10 / side", "3 × 10", "3 × 12 + height"] },
    { id: "thu-pullups", icon: "dumbbell", name: "Pull-ups", vol: ["Dead hang 5×20–30s + neg 4×3", "Band / strict 4×3–5 + hangs", "Strict 5×6–10 + weighted"] },
    { id: "thu-iron-body-holds", icon: "flame", name: "Iron Body holds — Ma Bu + Fingertip plank", note: "Horse stance + fingertip plank", vol: ["MaBu 30s · FP 10s", "MaBu 45s · FP 25s", "MaBu 90s · FP 40s"] },
    { id: "thu-hollow-hold", icon: "activity", name: "Core — hollow hold", vol: ["3 × 20s", "4 × 30s", "5 × 40s"] },
    { id: "thu-cooldown", icon: "wind", name: "Cooldown", vol: ["5 min", "5–8 min", "8 min"] },
  ]},
  { key: "fri", label: "Fri", title: "Full-Body + Yoga Strength", element: "solar", goals: ["Strength", "Flexibility"], blocks: [
    { id: "fri-calisthenics-circuit", icon: "activity", name: "Calisthenics circuit", note: "push-ups · squats · lunges · burpees · core", vol: ["3 rounds", "4 rounds", "5 rounds"] },
    { id: "fri-yoga-holds", icon: "flame", name: "Yoga holds / arm balances", vol: ["Beginner holds 20–30s", "Intermediate + inversion prep", "Advanced arm balances 45–60s"] },
    { id: "fri-cooldown", icon: "wind", name: "Cooldown", vol: ["5 min", "5–8 min", "8 min"] },
  ]},
  { key: "sat", label: "Sat", title: "Shaolin Endurance", element: "solar", goals: ["Endurance", "Stamina"], blocks: [
    { id: "sat-surya-warmup", icon: "sun", name: "Surya Namaskar — warm-up", vol: ["5 rounds", "8 rounds", "10 rounds"] },
    { id: "sat-shaolin-flow", icon: "flame", name: "Shaolin 25–30 min flow (circuit)", note: "Hindu squats · Dand · bear crawl · bear hug walk · horse stance", vol: ["2 rounds", "3 rounds", "4 rounds"] },
    { id: "sat-bear-hug-walk", icon: "flame", name: "Bear hug walk (loaded carry)", note: "Hug a sandbag / stone / heavy pack", vol: ["3 × 20m light", "4 × 30m mod", "5 × 40m heavy"] },
    { id: "sat-run-ruck", icon: "activity", name: "Run / ruck", vol: ["2 km", "3–4 km", "5 km / ruck"] },
    { id: "sat-taichi-cooldown", icon: "moon", name: "Tai Chi cooldown", vol: ["10 min", "10–15 min", "15 min"] },
  ]},
  { key: "sun", label: "Sun", title: "Rest", element: "rest", goals: ["Recovery"], rest: true, blocks: [] },
];

export const REF = [
  { title: "Surya Namaskar", head: ["", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Warm-up pace", "3–5 slow", "8–10", "12–15"],
    ["Fast rounds (Tue)", "5 brisk", "10 fast", "15 fast"],
    ["Long set (Sat)", "8", "12–15", "20–24"],
  ]},
  { title: "Chandra Namaskar", head: ["", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Rounds", "2–4 slow", "4–6", "6–8 + holds"],
  ]},
  { title: "Hanuman Dand", head: ["", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Volume", "3 × 6–8", "4 × 12–15", "5 × 20–25"],
    ["Progression", "control tempo", "full flow", "feet up / flowing 40"],
  ]},
  { title: "Pull-up ladder", head: ["Level", "Movement", "Target"], rows: [
    ["0", "Dead hang", "30–60s"],
    ["1", "Scapular pulls + negatives", "4 × 3–5"],
    ["2", "Band-assisted", "4 × 5"],
    ["3", "Strict full", "3×5 → 3×8–10"],
    ["4", "Weighted · archer · L-sit → muscle-up", "skill"],
  ]},
  { title: "Military calisthenics", head: ["", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Push-ups", "4 × 10", "5 × 15", "6 × 20+"],
    ["Squats", "4 × 15", "4 × 25", "5 × 30 + jumps"],
    ["Plank", "3 × 30s", "4 × 45s", "5 × 60s"],
    ["Burpees", "3 × 8", "4 × 12", "5 × 15–20"],
    ["Run", "2 km / 6×200m", "3–4 km / 8×200m", "5 km / sprints / ruck"],
  ]},
  { title: "Tai Chi", head: ["", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Practice", "8-form basics", "Yang 24-form", "24-form + silk-reeling"],
    ["Duration", "15 min", "20 min", "30 min"],
  ]},
  { title: "Shaolin Kung Fu — dynamic methods", note: "The core discipline — trained 3×/week (Mon · Thu · Sat). No-weight methods for strength that holds up under fatigue. The full 25–30 min routine runs Saturday.", head: ["Method", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Hindu push-up / Dand", "3 × 6–8", "4 × 12–15", "5 × 20–25"],
    ["Hindu squat (Baithak)", "3 × 20", "4 × 40", "5 × 60–100"],
    ["Bear crawl", "3 × 10m", "4 × 15m", "5 × 20m ↔"],
    ["Bear hug walk", "3 × 20m", "4 × 30m", "5 × 40m heavy"],
    ["Stance work (Ma Bu · Gong Bu)", "30s", "45–60s", "90s + moves"],
    ["Shaolin kicks (front · crescent)", "2×10/side", "3×10", "3×12 + height"],
  ]},
  { title: "Shaolin Iron Body — isometric holds", note: "Static complement — finishers after Mon & Thu, or a standalone circuit. Breathe slow; trembling is normal.", head: ["Hold", "Phase 1", "Phase 2", "Phase 3"], rows: [
    ["Horse Stance (Ma Bu)", "3 × 30s", "3 × 45–60s", "3 × 90s + arms out"],
    ["Wall Sit", "3 × 30s", "3 × 45s", "3 × 60–90s"],
    ["Iron Plank — low push-up hold", "3 × 20s", "3 × 40s", "3 × 60s"],
    ["Fingertip / knuckle plank", "3 × 10–15s", "3 × 25s", "3 × 40s"],
    ["Isometric pull hold", "Dead hang 20–30s", "Chin-over 15–20s", "Chin-over 30s+"],
    ["Hollow body hold", "3 × 20s", "3 × 30–40s", "3 × 60s"],
    ["One-leg stance (Jin Ji Du Li)", "30s / leg", "60s / leg", "2–3 min / leg"],
  ]},
];

export const YOGA = {
  Beginner: "Tadasana · Vrikshasana · Trikonasana · Virabhadrasana I–II · Baddha Konasana · Paschimottanasana · Bhujangasana · Marjariasana · Setu Bandhasana · Balasana",
  Intermediate: "Utkatasana · Parsvakonasana · Ardha Chandrasana · Navasana · Dhanurasana · Ustrasana · Sarvangasana · Halasana · Ardha Matsyendrasana",
  Advanced: "Sirsasana · Bakasana · Pincha Mayurasana · Adho Mukha Vrikshasana · Hanumanasana · Eka Pada Rajakapotasana · Chakrasana · Vrischikasana",
};

export const BEEJ = [
  { bija: "LAM", chakra: "Muladhara · Root", loc: "Base of spine", el: "Earth", color: "#C0553B" },
  { bija: "VAM", chakra: "Svadhisthana · Sacral", loc: "Below navel", el: "Water", color: "#D07B3A" },
  { bija: "RAM", chakra: "Manipura · Solar plexus", loc: "Navel", el: "Fire", color: "#D9A93C" },
  { bija: "YAM", chakra: "Anahata · Heart", loc: "Centre of chest", el: "Air", color: "#6FA36A" },
  { bija: "HUM", chakra: "Vishuddha · Throat", loc: "Throat", el: "Ether", color: "#4E86A8" },
  { bija: "OM", chakra: "Ajna · Third eye", loc: "Between brows", el: "Light", color: "#6B6AA8" },
  { bija: "AUM", chakra: "Sahasrara · Crown", loc: "Crown of head", el: "Consciousness", color: "#8E6FB0" },
];

export const phaseFromWeek = (w) => Math.min(3, Math.ceil(w / 4));
export const isDeload = (w) => w % 4 === 0;
