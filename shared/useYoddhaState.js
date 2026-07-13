import { useEffect, useState } from "react";
import { DAYS } from "./program.js";

export const STORAGE_KEY = "yoddha:v1";

export const DEFAULT_STATE = { week: 1, done: {}, counted: {}, total: 0, tab: "today", day: null, logs: {} };

/**
 * Storage-agnostic state machine for the Yoddha app.
 * `storage` must implement `{ get(key): Promise<string|null>, set(key, value): Promise<void> }`.
 */
export function useYoddhaState(storage) {
  const [s, setS] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const raw = await storage.get(STORAGE_KEY);
        if (live && raw) setS((p) => ({ ...p, ...JSON.parse(raw) }));
      } catch (e) { /* start fresh */ }
      const wd = (new Date().getDay() + 6) % 7; // Mon = 0
      if (live) setS((p) => ({ ...p, day: p.day ?? DAYS[wd].key }));
      if (live) setLoaded(true);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.set(STORAGE_KEY, JSON.stringify(s)).catch(() => { /* ignore */ });
  }, [s, loaded]);

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
      const d = DAYS.find((x) => x.key === dk);
      const nowComplete = d.blocks.every((_, k) => arr[k]);
      const counted = { ...p.counted };
      let total = p.total;
      if (nowComplete && !counted[dk]) { counted[dk] = true; total += 1; }
      if (!nowComplete && counted[dk]) { delete counted[dk]; total -= 1; }
      return { ...p, done, counted, total };
    });
  };

  const setTab = (tab) => setS((p) => ({ ...p, tab }));
  const setDay = (day) => setS((p) => ({ ...p, day }));
  const setWeek = (w) => setS((p) => ({ ...p, week: Math.max(1, Math.min(12, w)) }));
  const newWeek = () => setS((p) => ({ ...p, week: Math.min(12, p.week + 1), done: {}, counted: {} }));
  const resetWeek = () => setS((p) => ({ ...p, done: {}, counted: {} }));
  const resetAll = () => setS((p) => ({ ...DEFAULT_STATE, day: p.day }));

  const getLogs = (dayKey, blockId) => (s.logs[dayKey] && s.logs[dayKey][blockId]) || [];

  const logSet = (dayKey, blockId, entry) => {
    setS((p) => {
      const dayLogs = p.logs[dayKey] || {};
      const blockLogs = dayLogs[blockId] || [];
      const newEntry = { week: p.week, ts: Date.now(), ...entry };
      return {
        ...p,
        logs: { ...p.logs, [dayKey]: { ...dayLogs, [blockId]: [...blockLogs, newEntry] } },
      };
    });
  };

  const deleteLog = (dayKey, blockId, ts) => {
    setS((p) => {
      const dayLogs = p.logs[dayKey] || {};
      const blockLogs = dayLogs[blockId] || [];
      return {
        ...p,
        logs: { ...p.logs, [dayKey]: { ...dayLogs, [blockId]: blockLogs.filter((e) => e.ts !== ts) } },
      };
    });
  };

  return {
    state: s, loaded, dayComplete, weekSessions, totalTrainDays,
    toggle, setTab, setDay, setWeek, newWeek, resetWeek, resetAll,
    getLogs, logSet, deleteLog,
  };
}
