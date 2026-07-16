import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import {
  Sun, Moon, Flame, Dumbbell, Activity, Wind,
  Check, ChevronLeft, ChevronRight, RotateCcw, Target, Circle,
} from "lucide-react-native";
import { T, elcolor, esoft } from "../../shared/theme.js";
import { PHASES, DAYS, REF, YOGA, BEEJ, phaseFromWeek, isDeload } from "../../shared/program.js";
import { useYoddhaState } from "../../shared/useYoddhaState.js";
import { nativeStorage } from "./storage.js";
import DetailSheet from "./DetailSheet.js";

const DISPLAY = {}; // reserved for a future custom display font
const MONO = { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) };

const ICONS = { sun: Sun, moon: Moon, flame: Flame, dumbbell: Dumbbell, activity: Activity, wind: Wind };

const border = (color, width = 1) => ({ borderWidth: width, borderColor: color });

/* -------------------------------------------------------------- app */
export default function YoddhaApp() {
  const {
    state: s, loaded, dayComplete, weekSessions, totalTrainDays,
    toggle, setTab, setDay, setWeek, newWeek, resetWeek, resetAll,
    getLogs, logSet, deleteLog,
  } = useYoddhaState(nativeStorage);

  const [detail, setDetail] = useState(null); // { dayKey, blockIndex } | null

  const phase = phaseFromWeek(s.week);
  const pIdx = phase - 1;
  const deload = isDeload(s.week);
  const dayObj = DAYS.find((d) => d.key === (s.day || "mon")) || DAYS[0];

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: T.faint, ...MONO }}>loading…</Text>
      </View>
    );
  }

  const detailBlock = detail ? DAYS.find((d) => d.key === detail.dayKey).blocks[detail.blockIndex] : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 22, paddingBottom: 14 }}>
          <View>
            <Text style={{ ...DISPLAY, fontSize: 26, fontWeight: "800", letterSpacing: 2, color: T.ink }}>YODDHA</Text>
            <Text style={{ ...MONO, fontSize: 10, letterSpacing: 4, color: T.faint, marginTop: 3 }}>PROTOCOL · 12-WEEK ARC</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.card, ...border(T.line), borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Target size={13} color={T.solar} />
            <Text style={{ ...MONO, fontSize: 11, color: T.sub }}>P{phase} · {PHASES[pIdx].name}</Text>
          </View>
        </View>

        {/* 12-week dots */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 18 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const w = i + 1, on = w <= s.week, dl = isDeload(w);
            return (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: on ? (dl ? T.lunar : T.solar) : T.line, opacity: on ? 1 : 0.5 }} />
            );
          })}
        </View>

        {/* tabs */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 18 }}>
          {[["today", "Today"], ["week", "Week"], ["program", "Program"], ["progress", "Progress"]].map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{
              flex: 1, paddingVertical: 9, borderRadius: 10,
              ...border(s.tab === k ? T.solar : T.line),
              backgroundColor: s.tab === k ? T.solarSoft : "transparent",
            }}>
              <Text style={{ ...MONO, fontSize: 11, letterSpacing: 1, color: s.tab === k ? T.solar : T.sub, textAlign: "center", textTransform: "uppercase" }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {/* ---- TODAY ---- */}
        {s.tab === "today" && (
          <>
            {deload && (
              <View style={{ backgroundColor: T.lunarSoft, ...border(T.lunar + "44"), borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14, flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Moon size={15} color={T.lunar} />
                <Text style={{ fontSize: 12.5, color: T.lunar, flex: 1 }}>Deload week — cut all volume ~40%. This is where adaptation locks in.</Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6 }}>
              {DAYS.map((d) => {
                const on = d.key === dayObj.key, c = elcolor(d.element), done = dayComplete(d.key);
                const El = d.element === "lunar" || d.element === "rest" ? Moon : Sun;
                return (
                  <Pressable key={d.key} onPress={() => setDay(d.key)} style={{
                    minWidth: 60, paddingVertical: 10, borderRadius: 12,
                    ...border(on ? c : T.line),
                    backgroundColor: on ? esoft(d.element) : T.card,
                    alignItems: "center", gap: 4,
                  }}>
                    <El size={14} color={on ? c : T.faint} />
                    <Text style={{ ...MONO, fontSize: 11, color: on ? T.ink : T.sub, letterSpacing: 1 }}>{d.label}</Text>
                    {done && <View style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: 999, backgroundColor: T.done }} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <SessionCard
              day={dayObj} pIdx={pIdx} done={s.done[dayObj.key] || []} onToggle={toggle}
              complete={dayComplete(dayObj.key)}
              onOpenDetail={(i) => setDetail({ dayKey: dayObj.key, blockIndex: i })}
            />
          </>
        )}

        {/* ---- WEEK ---- */}
        {s.tab === "week" && (
          <View style={{ gap: 10 }}>
            {deload && (
              <View style={{ backgroundColor: T.lunarSoft, ...border(T.lunar + "44"), borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Moon size={15} color={T.lunar} />
                <Text style={{ fontSize: 12.5, color: T.lunar, flex: 1 }}>Week {s.week} · Deload — ~40% less volume.</Text>
              </View>
            )}
            {DAYS.map((d) => {
              const c = elcolor(d.element), done = dayComplete(d.key);
              const El = d.element === "lunar" || d.element === "rest" ? Moon : Sun;
              return (
                <Pressable key={d.key} onPress={() => { setTab("today"); setDay(d.key); }} style={{
                  backgroundColor: T.card, ...border(done ? T.done + "66" : T.line), borderRadius: 14, padding: 14,
                  flexDirection: "row", alignItems: "center", gap: 12,
                }}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: esoft(d.element), alignItems: "center", justifyContent: "center" }}>
                    <El size={17} color={c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ ...MONO, fontSize: 11, color: T.faint, letterSpacing: 1 }}>{d.label.toUpperCase()}</Text>
                      <Text style={{ ...DISPLAY, fontSize: 15, fontWeight: "700", color: T.ink }}>{d.title}</Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{d.goals.join(" · ")}</Text>
                  </View>
                  {done ? <Check size={18} color={T.done} /> : <Circle size={16} color={T.line} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ---- PROGRAM ---- */}
        {s.tab === "program" && (
          <View style={{ gap: 18 }}>
            {REF.map((t) => (
              <View key={t.title}>
                <Text style={{ ...DISPLAY, fontSize: 15, fontWeight: "700", marginBottom: t.note ? 4 : 8, color: T.solar }}>{t.title}</Text>
                {t.note && <Text style={{ fontSize: 11.5, color: T.sub, marginBottom: 8, lineHeight: 16 }}>{t.note}</Text>}
                <View style={{ ...border(T.line), borderRadius: 12, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", backgroundColor: T.cardHi }}>
                    {t.head.map((h, i) => (
                      <Text key={i} style={{ flex: i === 0 ? 1.4 : 1, padding: 8, ...MONO, fontSize: 10, letterSpacing: 1, color: T.sub, textTransform: "uppercase" }}>{h}</Text>
                    ))}
                  </View>
                  {t.rows.map((r, ri) => (
                    <View key={ri} style={{ flexDirection: "row", backgroundColor: ri % 2 ? T.card : T.bg2, borderTopWidth: 1, borderTopColor: T.line }}>
                      {r.map((cell, ci) => (
                        <Text key={ci} style={{ flex: ci === 0 ? 1.4 : 1, padding: 8, fontSize: 12, color: ci === 0 ? T.ink : T.sub, fontWeight: ci === 0 ? "600" : "400" }}>{cell}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View>
              <Text style={{ ...DISPLAY, fontSize: 15, fontWeight: "700", marginBottom: 8, color: T.solar }}>Yoga asana ladder</Text>
              <View style={{ gap: 8 }}>
                {Object.entries(YOGA).map(([lvl, list]) => (
                  <View key={lvl} style={{ backgroundColor: T.card, ...border(T.line), borderRadius: 12, padding: 12 }}>
                    <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.solar, textTransform: "uppercase", marginBottom: 5 }}>{lvl}</Text>
                    <Text style={{ fontSize: 12.5, color: T.sub, lineHeight: 19 }}>{list}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View>
              <Text style={{ ...DISPLAY, fontSize: 15, fontWeight: "700", marginBottom: 4, color: T.solar }}>Beej Mantra — chakra seed sounds</Text>
              <Text style={{ fontSize: 11.5, color: T.sub, marginBottom: 8, lineHeight: 16 }}>Chant root → crown on a long exhale, feeling the vibration at each centre. 3, 7, or 11 rounds — a cooldown after breathwork. Ease off if you feel light-headed.</Text>
              <View style={{ gap: 6 }}>
                {BEEJ.map((b) => (
                  <View key={b.bija} style={{ backgroundColor: T.card, ...border(T.line), borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: b.color }} />
                    <Text style={{ ...MONO, fontSize: 15, fontWeight: "700", color: T.ink, minWidth: 52 }}>{b.bija}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, color: T.ink }}>{b.chakra}</Text>
                      <Text style={{ fontSize: 11, color: T.faint }}>{b.loc} · {b.el}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ---- PROGRESS ---- */}
        {s.tab === "progress" && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat label="Sessions logged" value={s.total} />
              <Stat label="This week" value={`${weekSessions}/${totalTrainDays}`} />
            </View>

            <View style={{ backgroundColor: T.card, ...border(T.line), borderRadius: 14, padding: 16 }}>
              <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.faint, textTransform: "uppercase", marginBottom: 10 }}>Current week</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable onPress={() => setWeek(s.week - 1)} style={navBtnStyle}>
                  <ChevronLeft size={18} color={T.ink} />
                </Pressable>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ ...DISPLAY, fontSize: 34, fontWeight: "800", color: T.ink }}>Week {s.week}</Text>
                  <Text style={{ ...MONO, fontSize: 11, color: deload ? T.lunar : T.solar, marginTop: 4, letterSpacing: 1 }}>
                    PHASE {phase} · {PHASES[pIdx].name.toUpperCase()}{deload ? " · DELOAD" : ""}
                  </Text>
                </View>
                <Pressable onPress={() => setWeek(s.week + 1)} style={navBtnStyle}>
                  <ChevronRight size={18} color={T.ink} />
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Pressable onPress={newWeek} style={bigBtnStyle(T.solar, T.solarSoft)}>
                <ChevronRight size={16} color={T.solar} />
                <Text style={{ color: T.solar, fontSize: 13, fontWeight: "600" }}>Start next week (clears checkmarks)</Text>
              </Pressable>
              <Pressable onPress={resetWeek} style={bigBtnStyle(T.sub, "transparent")}>
                <RotateCcw size={15} color={T.sub} />
                <Text style={{ color: T.sub, fontSize: 13, fontWeight: "600" }}>Reset this week's checkmarks</Text>
              </Pressable>
              <Pressable onPress={resetAll} style={bigBtnStyle(T.faint, "transparent")}>
                <RotateCcw size={15} color={T.faint} />
                <Text style={{ color: T.faint, fontSize: 13, fontWeight: "600" }}>Reset everything</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 11.5, color: T.faint, lineHeight: 17, textAlign: "center", marginTop: 4 }}>
              Progress saves on this device. Phase advances automatically with the week — deloads fall on weeks 4, 8, and 12. Warm up first; ease off any hold, inversion, or breath practice if you feel pain or dizziness. Not medical advice.
            </Text>
          </View>
        )}
      </ScrollView>

      <DetailSheet
        visible={!!(detail && detailBlock)}
        block={detailBlock}
        logs={detailBlock ? getLogs(detail.dayKey, detailBlock.id) : []}
        onLogSet={(entry) => detailBlock && logSet(detail.dayKey, detailBlock.id, entry)}
        onDeleteLog={(ts) => detailBlock && deleteLog(detail.dayKey, detailBlock.id, ts)}
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const navBtnStyle = { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: T.line, backgroundColor: T.bg2, alignItems: "center", justifyContent: "center" };
const bigBtnStyle = (fg, bg) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: fg + "44", backgroundColor: bg });

/* ---------------------------------------------------------- subviews */
function SessionCard({ day, pIdx, done, onToggle, complete, onOpenDetail }) {
  const c = elcolor(day.element);
  const El = day.element === "lunar" || day.element === "rest" ? Moon : Sun;

  if (day.rest) {
    return (
      <View style={{ backgroundColor: T.card, ...border(T.line), borderRadius: 16, padding: 28, alignItems: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: T.lunarSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Moon size={22} color={T.lunar} />
        </View>
        <Text style={{ ...DISPLAY, fontSize: 20, fontWeight: "800", color: T.ink, marginBottom: 6 }}>Rest</Text>
        <Text style={{ fontSize: 13, color: T.sub, lineHeight: 19, textAlign: "center", maxWidth: 300 }}>
          Recover fully, or move gently — a short Tai Chi form, a walk, or restorative yoga. Rest is training too.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: T.card, ...border(complete ? T.done + "66" : T.line), borderRadius: 16, overflow: "hidden" }}>
      <View style={{ padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: esoft(day.element), alignItems: "center", justifyContent: "center" }}>
              <El size={16} color={c} />
            </View>
            <Text style={{ ...DISPLAY, fontSize: 18, fontWeight: "800", color: T.ink }}>{day.title}</Text>
          </View>
          {complete && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Check size={15} color={T.done} />
              <Text style={{ ...MONO, fontSize: 11, color: T.done }}>DONE</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          {day.goals.map((g) => (
            <Text key={g} style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: c, backgroundColor: esoft(day.element), paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>{g}</Text>
          ))}
        </View>
      </View>

      <View>
        {day.blocks.map((b, i) => {
          const Icon = ICONS[b.icon] || Activity;
          const on = !!done[i];
          return (
            <View key={b.id || i} style={{
              flexDirection: "row", alignItems: "flex-start", gap: 12,
              paddingVertical: 13, paddingHorizontal: 16,
              borderTopWidth: i ? 1 : 0, borderTopColor: T.line,
              backgroundColor: on ? T.cardHi : "transparent",
            }}>
              <Pressable onPress={() => onToggle(day.key, i)} style={{ marginTop: 1, width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: on ? T.done : T.line, backgroundColor: on ? T.done : "transparent", alignItems: "center", justifyContent: "center" }}>
                {on && <Check size={14} color={T.bg} strokeWidth={3} />}
              </Pressable>
              <Pressable onPress={() => onOpenDetail(i)} style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Icon size={13} color={on ? T.faint : c} />
                    <Text style={{ fontSize: 13.5, fontWeight: "600", color: on ? T.faint : T.ink, textDecorationLine: on ? "line-through" : "none" }}>{b.name}</Text>
                  </View>
                  {b.note && <Text style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{b.note}</Text>}
                </View>
                <Text style={{ ...MONO, fontSize: 12, color: on ? T.faint : c, textAlign: "right", maxWidth: 130 }}>{b.vol[pIdx]}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.card, ...border(T.line), borderRadius: 14, padding: 16 }}>
      <Text style={{ ...DISPLAY, fontSize: 30, fontWeight: "800", color: T.ink }}>{value}</Text>
      <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, color: T.faint, textTransform: "uppercase", marginTop: 6 }}>{label}</Text>
    </View>
  );
}
