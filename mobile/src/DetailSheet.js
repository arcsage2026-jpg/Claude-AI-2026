import React, { useRef, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, ScrollView, Platform } from "react-native";
import { X, Play, Pause, RotateCcw, Trash2 } from "lucide-react-native";
import { T } from "../../shared/theme.js";
import { useRestTimer } from "../../shared/useRestTimer.js";
import { requestNotifyPermission, scheduleRestOverNotification, cancelNotification, hapticRestOver } from "./notify.js";

const REST_PRESETS = [60, 90, 120];
const MONO = { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) };

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const stepBtnStyle = { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: T.line, backgroundColor: T.bg2, alignItems: "center", justifyContent: "center" };

function Stepper({ label, value, onChange, step = 1, min = 0, suffix = "" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ fontSize: 12.5, color: T.sub }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))} style={stepBtnStyle}>
          <Text style={{ color: T.ink, fontSize: 16 }}>–</Text>
        </Pressable>
        <Text style={{ ...MONO, fontSize: 15, color: T.ink, minWidth: 44, textAlign: "center" }}>{value}{suffix}</Text>
        <Pressable onPress={() => onChange(value + step)} style={stepBtnStyle}>
          <Text style={{ color: T.ink, fontSize: 16 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DetailSheet({ visible, block, logs, onLogSet, onDeleteLog, onClose }) {
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [durationVal, setDurationVal] = useState(30);
  const [rounds, setRounds] = useState(1);
  const [note, setNote] = useState("");
  const notificationIdRef = useRef(null);

  const timer = useRestTimer(60, () => {
    hapticRestOver();
    cancelNotification(notificationIdRef.current);
    notificationIdRef.current = null;
  });

  if (!block) return null;
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
    const granted = await requestNotifyPermission();
    const d = seconds ?? timer.duration;
    if (granted) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = await scheduleRestOverNotification(d);
    }
    timer.start(d);
  };

  const pauseTimer = () => {
    timer.pause();
    cancelNotification(notificationIdRef.current);
    notificationIdRef.current = null;
  };

  const resetTimer = () => {
    timer.reset();
    cancelNotification(notificationIdRef.current);
    notificationIdRef.current = null;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(10,8,6,0.7)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation && e.stopPropagation()} style={{ backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%" }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: T.ink, flex: 1, paddingRight: 12 }}>{block.name}</Text>
              <Pressable onPress={onClose} style={{ ...stepBtnStyle, width: 32, height: 32 }}>
                <X size={16} color={T.sub} />
              </Pressable>
            </View>
            {block.note && <Text style={{ fontSize: 12, color: T.faint, marginBottom: 16 }}>{block.note}</Text>}

            {/* quick log */}
            <View style={{ backgroundColor: T.bg2, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14, gap: 12, marginBottom: 16 }}>
              <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint }}>Log a set</Text>
              {logType === "reps" && <Stepper label="Reps" value={reps} onChange={setReps} />}
              {logType === "reps+weight" && (
                <>
                  <Stepper label="Reps" value={reps} onChange={setReps} />
                  <Stepper label="Weight" value={weight} onChange={setWeight} suffix=" kg" />
                </>
              )}
              {logType === "duration" && <Stepper label="Duration" value={durationVal} onChange={setDurationVal} step={5} suffix="s" />}
              {logType === "rounds" && <Stepper label="Rounds" value={rounds} onChange={setRounds} />}
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Note (optional)"
                placeholderTextColor={T.faint}
                style={{ backgroundColor: T.bg, borderWidth: 1, borderColor: T.line, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, color: T.ink, fontSize: 12.5 }}
              />
              <Pressable onPress={submitLog} style={{ backgroundColor: T.solarSoft, borderWidth: 1, borderColor: T.solar + "44", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: T.solar, fontSize: 13, fontWeight: "600" }}>Log set</Text>
              </Pressable>
            </View>

            {/* rest timer */}
            <View style={{ backgroundColor: T.bg2, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint, marginBottom: 10 }}>Rest timer</Text>
              <Text style={{ textAlign: "center", fontSize: 34, fontWeight: "800", color: timer.remaining === 0 && !timer.isRunning ? T.done : T.ink, ...MONO, marginBottom: 10 }}>
                {fmtTime(timer.remaining)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 10 }}>
                {REST_PRESETS.map((sec) => (
                  <Pressable key={sec} onPress={() => startTimer(sec)} style={{ ...stepBtnStyle, width: "auto", paddingHorizontal: 12 }}>
                    <Text style={{ color: T.ink, fontSize: 12 }}>{sec}s</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
                {!timer.isRunning ? (
                  <Pressable onPress={() => startTimer()} style={{ ...stepBtnStyle, width: 40 }}><Play size={15} color={T.ink} /></Pressable>
                ) : (
                  <Pressable onPress={pauseTimer} style={{ ...stepBtnStyle, width: 40 }}><Pause size={15} color={T.ink} /></Pressable>
                )}
                <Pressable onPress={resetTimer} style={{ ...stepBtnStyle, width: 40 }}><RotateCcw size={15} color={T.ink} /></Pressable>
              </View>
            </View>

            {/* history */}
            {logs.length > 0 && (
              <View>
                <Text style={{ ...MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint, marginBottom: 8 }}>History</Text>
                <View style={{ gap: 6 }}>
                  {[...logs].reverse().map((l) => (
                    <View key={l.ts} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: T.bg2, borderWidth: 1, borderColor: T.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 }}>
                      <Text style={{ fontSize: 12, color: T.sub, flex: 1 }}>
                        <Text style={{ color: T.ink, fontWeight: "600" }}>W{l.week}</Text>{" "}
                        {l.reps != null && `${l.reps} reps `}
                        {l.weight != null && l.weight > 0 && `@ ${l.weight}kg `}
                        {l.duration != null && `${l.duration}s `}
                        {l.rounds != null && `${l.rounds} rounds `}
                        {l.note && <Text style={{ color: T.faint }}>— {l.note}</Text>}
                      </Text>
                      <Pressable onPress={() => onDeleteLog(l.ts)} style={{ padding: 4 }}>
                        <Trash2 size={13} color={T.faint} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
