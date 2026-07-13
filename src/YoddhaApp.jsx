import React, { useState, useEffect } from "react";
import {
  Sun, Moon, Flame, Dumbbell, Activity, Wind,
  Check, ChevronLeft, ChevronRight, RotateCcw, Target, Circle,
} from "lucide-react";

/* ---------------------------------------------------------------- theme */
const T = {
  bg: "#191410", bg2: "#211a14", card: "#271f18", cardHi: "#2f261d",
  line: "#3a2f24", ink: "#F3EBDD", sub: "#B6A896", faint: "#8a7c6a",
  solar: "#E68A34", solarSoft: "#3a2a18",
  lunar: "#9DB8B0", lunarSoft: "#20302e",
  done: "#8FB98A",
};
const DISPLAY = { fontFamily: "'Helvetica Neue', 'Arial Narrow', system-ui, sans-serif" };
const MONO = { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" };

const ICONS = { sun: Sun, moon: Moon, flame: Flame, dumbbell: Dumbbell, activity: Activity, wind: Wind };

/* ------------------------------------------------------------- program */
const PHASES = [
  { n: 1, name: "Foundation", weeks: "1–4" },
  { n: 2, name: "Build", weeks: "5–8" },
  { n: 3, name: "Advanced", weeks: "9–12" },
];

const DAYS = [
  { key: "mon", label: "Mon", title: "Shaolin Strength + Sun", element: "solar", goals: ["Strength", "Cardio"], blocks: [
    { icon: "sun", name: "Surya Namaskar — warm-up", vol: ["5 rounds slow", "8–10 rounds", "12–15 rounds"] },
    { icon: "flame", name: "Stance work — Ma Bu + Gong Bu", note: "Horse stance + bow stance", vol: ["30s + 20s/side", "45s + 40s/side", "90s + 60s/side"] },
    { icon: "flame", name: "Hindu push-ups (Dand)", vol: ["3 × 6–8", "4 × 12–15", "5 × 20–25"] },
    { icon: "activity", name: "Hindu squats (Baithak)", vol: ["3 × 20", "4 × 40", "5 × 60–100"] },
    { icon: "activity", name: "Bear crawl", vol: ["3 × 10m", "4 × 15m", "5 × 20m ↔"] },
    { icon: "wind", name: "Cooldown — pranayama + Shavasana", vol: ["5–8 min", "5–8 min", "8–10 min"] },
  ]},
  { key: "tue", label: "Tue", title: "Conditioning", element: "solar", goals: ["Cardio", "Stamina"], blocks: [
    { icon: "activity", name: "Calisthenics circuit", note: "15 squats · 10 push-ups · 10 burpees · 20 mtn climbers · 30s plank", vol: ["2 rounds", "3 rounds", "4 rounds"] },
    { icon: "sun", name: "Fast Surya Namaskar", vol: ["5 rounds brisk", "10 rounds fast", "15 rounds fast"] },
    { icon: "activity", name: "Run intervals", vol: ["6 × 200m", "8 × 200m", "sprint ladders"] },
    { icon: "wind", name: "Cooldown stretch", vol: ["5 min", "5 min", "5–8 min"] },
  ]},
  { key: "wed", label: "Wed", title: "Flow & Flexibility", element: "lunar", goals: ["Flexibility", "Recovery"], blocks: [
    { icon: "moon", name: "Tai Chi", vol: ["8-form · 15 min", "24-form · 20 min", "24-form + silk-reeling · 30 min"] },
    { icon: "moon", name: "Chandra Namaskar", vol: ["2–4 rounds", "4–6 rounds", "6–8 rounds + holds"] },
    { icon: "wind", name: "Yoga stretch — ladder", vol: ["Beginner · hold 20–30s", "Intermediate · 30–45s", "Advanced · 45–60s"] },
    { icon: "wind", name: "Pranayama", vol: ["Nadi Shodhana 5 min", "+ Bhramari", "+ extended"] },
  ]},
  { key: "thu", label: "Thu", title: "Shaolin Power + Pull", element: "solar", goals: ["Strength", "Endurance"], blocks: [
    { icon: "sun", name: "Surya Namaskar — warm-up", vol: ["3–5 rounds", "8–10 rounds", "12–15 rounds"] },
    { icon: "flame", name: "Shaolin kicks — front + crescent", note: "Straight, inside & outside crescent", vol: ["2 × 10 / side", "3 × 10", "3 × 12 + height"] },
    { icon: "dumbbell", name: "Pull-ups", vol: ["Dead hang 5×20–30s + neg 4×3", "Band / strict 4×3–5 + hangs", "Strict 5×6–10 + weighted"] },
    { icon: "flame", name: "Iron Body holds — Ma Bu + Fingertip plank", note: "Horse stance + fingertip plank", vol: ["MaBu 30s · FP 10s", "MaBu 45s · FP 25s", "MaBu 90s · FP 40s"] },
    { icon: "activity", name: "Core — hollow hold", vol: ["3 × 20s", "4 × 30s", "5 × 40s"] },
    { icon: "wind", name: "Cooldown", vol: ["5 min", "5–8 min", "8 min"] },
  ]},
  { key: "fri", label: "Fri", title: "Full-Body + Yoga Strength", element: "solar", goals: ["Strength", "Flexibility"], blocks: [
    { icon: "activity", name: "Calisthenics circuit", note: "push-ups · squats · lunges · burpees · core", vol: ["3 rounds", "4 rounds", "5 rounds"] },
    { icon: "flame", name: "Yoga holds / arm balances", vol: ["Beginner holds 20–30s", "Intermediate + inversion prep", "Advanced arm balances 45–60s"] },
    { icon: "wind", name: "Cooldown", vol: ["5 min", "5–8 min", "8 min"] },
  ]},
  { key: "sat", label: "Sat", title: "Shaolin Endurance", element: "solar", goals: ["Endurance", "Stamina"], blocks: [
    { icon: "sun", name: "Surya Namaskar — warm-up", vol: ["5 rounds", "8 rounds", "10 rounds"] },
    { icon: "flame", name: "Shaolin 25–30 min flow (circuit)", note: "Hindu squats · Dand · bear crawl · bear hug walk · horse stance", vol: ["2 rounds", "3 rounds", "4 rounds"] },
    { icon: "flame", name: "Bear hug walk (loaded carry)", note: "Hug a sandbag / stone / heavy pack", vol: ["3 × 20m light", "4 × 30m mod", "5 × 40m heavy"] },
    { icon: "activity", name: "Run / ruck", vol: ["2 km", "3–4 km", "5 km / ruck"] },
    { icon: "moon", name: "Tai Chi cooldown", vol: ["10 min", "10–15 min", "15 min"] },
  ]},
  { key: "sun", label: "Sun", title: "Rest", element: "rest", goals: ["Recovery"], rest: true, blocks: [] },
];

const REF = [
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

const YOGA = {
  Beginner: "Tadasana · Vrikshasana · Trikonasana · Virabhadrasana I–II · Baddha Konasana · Paschimottanasana · Bhujangasana · Marjariasana · Setu Bandhasana · Balasana",
  Intermediate: "Utkatasana · Parsvakonasana · Ardha Chandrasana · Navasana · Dhanurasana · Ustrasana · Sarvangasana · Halasana · Ardha Matsyendrasana",
  Advanced: "Sirsasana · Bakasana · Pincha Mayurasana · Adho Mukha Vrikshasana · Hanumanasana · Eka Pada Rajakapotasana · Chakrasana · Vrischikasana",
};

const BEEJ = [
  { bija: "LAM", chakra: "Muladhara · Root", loc: "Base of spine", el: "Earth", color: "#C0553B" },
  { bija: "VAM", chakra: "Svadhisthana · Sacral", loc: "Below navel", el: "Water", color: "#D07B3A" },
  { bija: "RAM", chakra: "Manipura · Solar plexus", loc: "Navel", el: "Fire", color: "#D9A93C" },
  { bija: "YAM", chakra: "Anahata · Heart", loc: "Centre of chest", el: "Air", color: "#6FA36A" },
  { bija: "HUM", chakra: "Vishuddha · Throat", loc: "Throat", el: "Ether", color: "#4E86A8" },
  { bija: "OM", chakra: "Ajna · Third eye", loc: "Between brows", el: "Light", color: "#6B6AA8" },
  { bija: "AUM", chakra: "Sahasrara · Crown", loc: "Crown of head", el: "Consciousness", color: "#8E6FB0" },
];

/* ------------------------------------------------------------ helpers */
const KEY = "yoddha:v1";
const phaseFromWeek = (w) => Math.min(3, Math.ceil(w / 4));
const isDeload = (w) => w % 4 === 0;
const elcolor = (e) => (e === "lunar" || e === "rest" ? T.lunar : T.solar);
const esoft = (e) => (e === "lunar" || e === "rest" ? T.lunarSoft : T.solarSoft);

const DEFAULT = { week: 1, done: {}, counted: {}, total: 0, tab: "today", day: null };

// --- persistence: localStorage (in Expo/React Native, swap for AsyncStorage) ---
function loadState() {
  const wd = (new Date().getDay() + 6) % 7; // Mon = 0
  const base = { ...DEFAULT, day: DAYS[wd].key };
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch (e) { /* storage unavailable — fall back to defaults */ }
  return base;
}

/* -------------------------------------------------------------- app */
export default function YoddhaApp() {
  const [s, setS] = useState(loadState);

  // save on every change
  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* ignore */ }
  }, [s]);

  const phase = phaseFromWeek(s.week);
  const pIdx = phase - 1;
  const deload = isDeload(s.week);

  const dayObj = DAYS.find((d) => d.key === (s.day || "mon")) || DAYS[0];

  const dayComplete = (dk) => {
    const d = DAYS.find((x) => x.key === dk);
    if (!d || d.rest || !d.blocks.length) return false;
    const arr = s.done[dk] || [];
    return d.blocks.every((_, i) => arr[i]);
  };

  const weekSessions = DAYS.filter((d) => !d.rest && dayComplete(d.key)).length;
  const totalTrainDays = DAYS.filter((d) => !d.rest).length;

  const toggle = (dk, i) => {
    setS((p) => {
      const arr = [...(p.done[dk] || [])];
      arr[i] = !arr[i];
      const done = { ...p.done, [dk]: arr };
      // recompute completion + cumulative total
      const d = DAYS.find((x) => x.key === dk);
      const nowComplete = d.blocks.every((_, k) => arr[k]);
      const counted = { ...p.counted };
      let total = p.total;
      if (nowComplete && !counted[dk]) { counted[dk] = true; total += 1; }
      if (!nowComplete && counted[dk]) { delete counted[dk]; total -= 1; }
      return { ...p, done, counted, total };
    });
  };

  const setWeek = (w) => setS((p) => ({ ...p, week: Math.max(1, Math.min(12, w)) }));
  const newWeek = () => setS((p) => ({ ...p, week: Math.min(12, p.week + 1), done: {}, counted: {} }));
  const resetWeek = () => setS((p) => ({ ...p, done: {}, counted: {} }));
  const resetAll = () => setS({ ...DEFAULT, day: s.day });

  return (
    <div style={{ background: T.bg, color: T.ink, minHeight: "100vh" }}>
      <style>{`* { -webkit-tap-highlight-color: transparent; } button:focus-visible{outline:2px solid ${T.solar};outline-offset:2px;border-radius:8px} @media (prefers-reduced-motion: reduce){*{transition:none!important}}`}</style>

      <div className="mx-auto" style={{ maxWidth: 560, padding: "0 16px 96px" }}>
        {/* header */}
        <header className="flex items-center justify-between" style={{ paddingTop: 22, paddingBottom: 14 }}>
          <div>
            <div style={{ ...DISPLAY, fontSize: 26, fontWeight: 800, letterSpacing: 2, lineHeight: 1 }}>YODDHA</div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: 4, color: T.faint, marginTop: 3 }}>PROTOCOL · 12-WEEK ARC</div>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <div className="flex items-center" style={{ gap: 6, background: T.card, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px" }}>
              <Target size={13} color={T.solar} />
              <span style={{ ...MONO, fontSize: 11, color: T.sub }}>P{phase} · {PHASES[pIdx].name}</span>
            </div>
          </div>
        </header>

        {/* 12-week dots */}
        <div className="flex items-center" style={{ gap: 5, marginBottom: 18 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const w = i + 1, on = w <= s.week, dl = isDeload(w);
            return <div key={i} title={`Week ${w}${dl ? " · deload" : ""}`} style={{
              flex: 1, height: 5, borderRadius: 3,
              background: on ? (dl ? T.lunar : T.solar) : T.line, opacity: on ? 1 : 0.5,
            }} />;
          })}
        </div>

        {/* tabs */}
        <nav className="flex" style={{ gap: 6, marginBottom: 18 }}>
          {[["today", "Today"], ["week", "Week"], ["program", "Program"], ["progress", "Progress"]].map(([k, l]) => (
            <button key={k} onClick={() => setS((p) => ({ ...p, tab: k }))} className="flex-1" style={{
              ...MONO, fontSize: 11, letterSpacing: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${s.tab === k ? T.solar : T.line}`,
              background: s.tab === k ? T.solarSoft : "transparent",
              color: s.tab === k ? T.solar : T.sub, textTransform: "uppercase",
            }}>{l}</button>
          ))}
        </nav>

        {/* ---- TODAY ---- */}
        {s.tab === "today" && (
          <>
            {deload && (
              <div style={{ background: T.lunarSoft, border: `1px solid ${T.lunar}44`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                <Moon size={15} color={T.lunar} />
                <span style={{ fontSize: 12.5, color: T.lunar }}>Deload week — cut all volume ~40%. This is where adaptation locks in.</span>
              </div>
            )}

            {/* day selector */}
            <div className="flex" style={{ gap: 6, marginBottom: 16, overflowX: "auto" }}>
              {DAYS.map((d) => {
                const on = d.key === dayObj.key, c = elcolor(d.element), done = dayComplete(d.key);
                const El = d.element === "lunar" || d.element === "rest" ? Moon : Sun;
                return (
                  <button key={d.key} onClick={() => setS((p) => ({ ...p, day: d.key }))} style={{
                    flex: "1 0 auto", minWidth: 60, padding: "10px 0", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${on ? c : T.line}`, background: on ? esoft(d.element) : T.card,
                    display: "grid", placeItems: "center", gap: 4, position: "relative",
                  }}>
                    <El size={14} color={on ? c : T.faint} />
                    <span style={{ ...MONO, fontSize: 11, color: on ? T.ink : T.sub, letterSpacing: 1 }}>{d.label}</span>
                    {done && <div style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: 999, background: T.done }} />}
                  </button>
                );
              })}
            </div>

            {/* session card */}
            <SessionCard day={dayObj} pIdx={pIdx} done={s.done[dayObj.key] || []} onToggle={toggle} complete={dayComplete(dayObj.key)} />
          </>
        )}

        {/* ---- WEEK ---- */}
        {s.tab === "week" && (
          <div style={{ display: "grid", gap: 10 }}>
            {deload && (
              <div style={{ background: T.lunarSoft, border: `1px solid ${T.lunar}44`, borderRadius: 12, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
                <Moon size={15} color={T.lunar} /><span style={{ fontSize: 12.5, color: T.lunar }}>Week {s.week} · Deload — ~40% less volume.</span>
              </div>
            )}
            {DAYS.map((d) => {
              const c = elcolor(d.element), done = dayComplete(d.key);
              const El = d.element === "lunar" || d.element === "rest" ? Moon : Sun;
              return (
                <button key={d.key} onClick={() => setS((p) => ({ ...p, tab: "today", day: d.key }))} style={{
                  textAlign: "left", background: T.card, border: `1px solid ${done ? T.done + "66" : T.line}`,
                  borderRadius: 14, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: esoft(d.element), display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <El size={17} color={c} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ ...MONO, fontSize: 11, color: T.faint, letterSpacing: 1 }}>{d.label.toUpperCase()}</span>
                      <span style={{ ...DISPLAY, fontSize: 15, fontWeight: 700 }}>{d.title}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{d.goals.join(" · ")}</div>
                  </div>
                  {done ? <Check size={18} color={T.done} /> : <Circle size={16} color={T.line} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ---- PROGRAM ---- */}
        {s.tab === "program" && (
          <div style={{ display: "grid", gap: 18 }}>
            {REF.map((t) => (
              <div key={t.title}>
                <div style={{ ...DISPLAY, fontSize: 15, fontWeight: 700, marginBottom: t.note ? 4 : 8, color: T.solar }}>{t.title}</div>
                {t.note && <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8, lineHeight: 1.5 }}>{t.note}</div>}
                <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
                  <div className="flex" style={{ background: T.cardHi }}>
                    {t.head.map((h, i) => <div key={i} style={{ flex: i === 0 ? 1.4 : 1, padding: "8px 10px", ...MONO, fontSize: 10, letterSpacing: 1, color: T.sub, textTransform: "uppercase" }}>{h}</div>)}
                  </div>
                  {t.rows.map((r, ri) => (
                    <div key={ri} className="flex" style={{ background: ri % 2 ? T.card : T.bg2, borderTop: `1px solid ${T.line}` }}>
                      {r.map((cell, ci) => <div key={ci} style={{ flex: ci === 0 ? 1.4 : 1, padding: "8px 10px", fontSize: 12, color: ci === 0 ? T.ink : T.sub, fontWeight: ci === 0 ? 600 : 400 }}>{cell}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div style={{ ...DISPLAY, fontSize: 15, fontWeight: 700, marginBottom: 8, color: T.solar }}>Yoga asana ladder</div>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(YOGA).map(([lvl, list]) => (
                  <div key={lvl} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.solar, textTransform: "uppercase", marginBottom: 5 }}>{lvl}</div>
                    <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>{list}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...DISPLAY, fontSize: 15, fontWeight: 700, marginBottom: 4, color: T.solar }}>Beej Mantra — chakra seed sounds</div>
              <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8, lineHeight: 1.5 }}>Chant root → crown on a long exhale, feeling the vibration at each centre. 3, 7, or 11 rounds — a cooldown after breathwork. Ease off if you feel light-headed.</div>
              <div style={{ display: "grid", gap: 6 }}>
                {BEEJ.map((b) => (
                  <div key={b.bija} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 11, height: 11, borderRadius: 999, background: b.color, flexShrink: 0 }} />
                    <div style={{ ...MONO, fontSize: 15, fontWeight: 700, color: T.ink, minWidth: 52 }}>{b.bija}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: T.ink }}>{b.chakra}</div>
                      <div style={{ fontSize: 11, color: T.faint }}>{b.loc} · {b.el}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- PROGRESS ---- */}
        {s.tab === "progress" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div className="flex" style={{ gap: 10 }}>
              <Stat label="Sessions logged" value={s.total} />
              <Stat label="This week" value={`${weekSessions}/${totalTrainDays}`} />
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
              <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.faint, textTransform: "uppercase", marginBottom: 10 }}>Current week</div>
              <div className="flex items-center justify-between">
                <button onClick={() => setWeek(s.week - 1)} style={btn()}><ChevronLeft size={18} color={T.ink} /></button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ ...DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>Week {s.week}</div>
                  <div style={{ ...MONO, fontSize: 11, color: deload ? T.lunar : T.solar, marginTop: 4, letterSpacing: 1 }}>
                    PHASE {phase} · {PHASES[pIdx].name.toUpperCase()}{deload ? " · DELOAD" : ""}
                  </div>
                </div>
                <button onClick={() => setWeek(s.week + 1)} style={btn()}><ChevronRight size={18} color={T.ink} /></button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <button onClick={newWeek} style={bigBtn(T.solar, T.solarSoft)}>
                <ChevronRight size={16} color={T.solar} /> Start next week (clears checkmarks)
              </button>
              <button onClick={resetWeek} style={bigBtn(T.sub, "transparent")}>
                <RotateCcw size={15} color={T.sub} /> Reset this week's checkmarks
              </button>
              <button onClick={resetAll} style={bigBtn(T.faint, "transparent")}>
                <RotateCcw size={15} color={T.faint} /> Reset everything
              </button>
            </div>

            <p style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.6, textAlign: "center", marginTop: 4 }}>
              Progress saves on this device. Phase advances automatically with the week — deloads fall on weeks 4, 8, and 12. Warm up first; ease off any hold, inversion, or breath practice if you feel pain or dizziness. Not medical advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- subviews */
function SessionCard({ day, pIdx, done, onToggle, complete }) {
  const c = elcolor(day.element);
  const El = day.element === "lunar" || day.element === "rest" ? Moon : Sun;

  if (day.rest)
    return (
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 999, background: T.lunarSoft, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
          <Moon size={22} color={T.lunar} />
        </div>
        <div style={{ ...DISPLAY, fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Rest</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
          Recover fully, or move gently — a short Tai Chi form, a walk, or restorative yoga. Rest is training too.
        </div>
      </div>
    );

  return (
    <div style={{ background: T.card, border: `1px solid ${complete ? T.done + "66" : T.line}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: esoft(day.element), display: "grid", placeItems: "center" }}>
              <El size={16} color={c} />
            </div>
            <div style={{ ...DISPLAY, fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{day.title}</div>
          </div>
          {complete && <div className="flex items-center" style={{ gap: 5, color: T.done }}><Check size={15} /><span style={{ ...MONO, fontSize: 11 }}>DONE</span></div>}
        </div>
        <div className="flex" style={{ gap: 6, marginTop: 10 }}>
          {day.goals.map((g) => (
            <span key={g} style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: c, background: esoft(day.element), padding: "3px 8px", borderRadius: 999 }}>{g}</span>
          ))}
        </div>
      </div>

      <div>
        {day.blocks.map((b, i) => {
          const Icon = ICONS[b.icon] || Activity;
          const on = !!done[i];
          return (
            <button key={i} onClick={() => onToggle(day.key, i)} style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12,
              padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none",
              background: on ? T.cardHi : "transparent", cursor: "pointer",
            }}>
              <div style={{ marginTop: 1, width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `1.5px solid ${on ? T.done : T.line}`, background: on ? T.done : "transparent", display: "grid", placeItems: "center" }}>
                {on && <Check size={14} color={T.bg} strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 7 }}>
                  <Icon size={13} color={on ? T.faint : c} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? T.faint : T.ink, textDecoration: on ? "line-through" : "none" }}>{b.name}</span>
                </div>
                {b.note && <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{b.note}</div>}
              </div>
              <div style={{ ...MONO, fontSize: 12, color: on ? T.faint : c, flexShrink: 0, textAlign: "right", maxWidth: 130 }}>{b.vol[pIdx]}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ ...DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.faint, textTransform: "uppercase", marginTop: 6 }}>{label}</div>
    </div>
  );
}

const btn = () => ({ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.line}`, background: T.bg2, cursor: "pointer", display: "grid", placeItems: "center" });
const bigBtn = (fg, bg) => ({ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 12, border: `1px solid ${fg}44`, background: bg, color: fg, cursor: "pointer", fontSize: 13, fontWeight: 600 });
