import React, { useState } from "react";
import { X, Play, Pause, RotateCcw, Trash2 } from "lucide-react";
import { T } from "../shared/theme.js";
import { useRestTimer } from "../shared/useRestTimer.js";
import { requestNotifyPermission, notifyRestOver, playBeep } from "./notify.js";

const REST_PRESETS = [60, 90, 120];
const MONO = { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" };

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const stepBtn = { width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.line}`, background: T.bg2, color: T.ink, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center" };

function Stepper({ label, value, onChange, step = 1, min = 0, suffix = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 12.5, color: T.sub }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={stepBtn}>–</button>
        <span style={{ ...MONO, fontSize: 15, color: T.ink, minWidth: 44, textAlign: "center" }}>{value}{suffix}</span>
        <button onClick={() => onChange(value + step)} style={stepBtn}>+</button>
      </div>
    </div>
  );
}

export default function DetailSheet({ block, logs, onLogSet, onDeleteLog, onClose }) {
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [durationVal, setDurationVal] = useState(30);
  const [rounds, setRounds] = useState(1);
  const [note, setNote] = useState("");

  const timer = useRestTimer(60, () => { playBeep(); notifyRestOver(); });

  const logType = block.logType || "reps";

  const submitLog = () => {
    const entry = { note: note || undefined };
    if (logType === "reps") entry.reps = reps;
    if (logType === "reps+weight") { entry.reps = reps; entry.weight = weight; }
    if (logType === "duration") entry.duration = durationVal;
    if (logType === "rounds") entry.rounds = rounds;
    onLogSet(entry);
    setNote("");
  };

  const startTimer = async (seconds) => {
    await requestNotifyPermission();
    timer.start(seconds);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,6,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div
        style={{ background: T.card, border: `1px solid ${T.line}`, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, flex: 1, paddingRight: 12 }}>{block.name}</div>
          <button onClick={onClose} style={{ ...stepBtn, width: 32, height: 32 }}><X size={16} color={T.sub} /></button>
        </div>
        {block.note && <div style={{ fontSize: 12, color: T.faint, marginBottom: 16 }}>{block.note}</div>}

        {/* quick log */}
        <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, display: "grid", gap: 12, marginBottom: 16 }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint }}>Log a set</div>
          {logType === "reps" && <Stepper label="Reps" value={reps} onChange={setReps} />}
          {logType === "reps+weight" && (
            <>
              <Stepper label="Reps" value={reps} onChange={setReps} />
              <Stepper label="Weight" value={weight} onChange={setWeight} suffix=" kg" />
            </>
          )}
          {logType === "duration" && <Stepper label="Duration" value={durationVal} onChange={setDurationVal} step={5} suffix="s" />}
          {logType === "rounds" && <Stepper label="Rounds" value={rounds} onChange={setRounds} />}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.ink, fontSize: 12.5, outline: "none" }}
          />
          <button onClick={submitLog} style={{ background: T.solarSoft, border: `1px solid ${T.solar}44`, borderRadius: 10, padding: "10px 0", color: T.solar, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Log set
          </button>
        </div>

        {/* rest timer */}
        <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint, marginBottom: 10 }}>Rest timer</div>
          <div style={{ textAlign: "center", fontSize: 34, fontWeight: 800, color: timer.remaining === 0 && !timer.isRunning ? T.done : T.ink, ...MONO, marginBottom: 10 }}>
            {fmtTime(timer.remaining)}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
            {REST_PRESETS.map((sec) => (
              <button key={sec} onClick={() => startTimer(sec)} style={{ ...stepBtn, width: "auto", padding: "0 12px", fontSize: 12 }}>{sec}s</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {!timer.isRunning ? (
              <button onClick={() => startTimer()} style={{ ...stepBtn, width: 40 }}><Play size={15} color={T.ink} /></button>
            ) : (
              <button onClick={timer.pause} style={{ ...stepBtn, width: 40 }}><Pause size={15} color={T.ink} /></button>
            )}
            <button onClick={timer.reset} style={{ ...stepBtn, width: 40 }}><RotateCcw size={15} color={T.ink} /></button>
          </div>
        </div>

        {/* history */}
        {logs.length > 0 && (
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint, marginBottom: 8 }}>History</div>
            <div style={{ display: "grid", gap: 6 }}>
              {[...logs].reverse().map((l) => (
                <div key={l.ts} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, color: T.sub }}>
                    <span style={{ color: T.ink, fontWeight: 600 }}>W{l.week}</span>{" "}
                    {l.reps != null && `${l.reps} reps `}
                    {l.weight != null && l.weight > 0 && `@ ${l.weight}kg `}
                    {l.duration != null && `${l.duration}s `}
                    {l.rounds != null && `${l.rounds} rounds `}
                    {l.note && <span style={{ color: T.faint }}>— {l.note}</span>}
                  </div>
                  <button onClick={() => onDeleteLog(l.ts)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={13} color={T.faint} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
