import React from "react";
import {
  Sun, Moon, Flame, Dumbbell, Activity, Wind,
  Check, ChevronLeft, ChevronRight, RotateCcw, Target, Circle,
} from "lucide-react";
import { T, elcolor, esoft } from "../shared/theme.js";
import { PHASES, DAYS, REF, YOGA, BEEJ, phaseFromWeek, isDeload } from "../shared/program.js";
import { useYoddhaState } from "../shared/useYoddhaState.js";
import { webStorage } from "./storage.js";

const DISPLAY = { fontFamily: "'Helvetica Neue', 'Arial Narrow', system-ui, sans-serif" };
const MONO = { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" };

const ICONS = { sun: Sun, moon: Moon, flame: Flame, dumbbell: Dumbbell, activity: Activity, wind: Wind };

/* -------------------------------------------------------------- app */
export default function YoddhaApp() {
  const {
    state: s, loaded, dayComplete, weekSessions, totalTrainDays,
    toggle, setTab, setDay, setWeek, newWeek, resetWeek, resetAll,
  } = useYoddhaState(webStorage);

  const phase = phaseFromWeek(s.week);
  const pIdx = phase - 1;
  const deload = isDeload(s.week);

  const dayObj = DAYS.find((d) => d.key === (s.day || "mon")) || DAYS[0];

  if (!loaded)
    return <div style={{ background: T.bg, color: T.faint, minHeight: "100vh", display: "grid", placeItems: "center", ...MONO }}>loading…</div>;

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
            <button key={k} onClick={() => setTab(k)} className="flex-1" style={{
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
                  <button key={d.key} onClick={() => setDay(d.key)} style={{
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
                <button key={d.key} onClick={() => { setTab("today"); setDay(d.key); }} style={{
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
            <button key={b.id || i} onClick={() => onToggle(day.key, i)} style={{
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
