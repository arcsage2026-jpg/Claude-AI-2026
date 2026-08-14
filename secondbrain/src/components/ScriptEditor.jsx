import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const FIELDS = [
  { key: "hook", label: "Hook", placeholder: "First 5-10 seconds — the reason someone keeps watching." },
  { key: "body", label: "Body", placeholder: "The main content, beats, or talking points." },
  { key: "cta", label: "Call to action", placeholder: "What should the viewer do next?" },
];

export default function ScriptEditor({ projectId, script }) {
  const [values, setValues] = useState({ hook: "", body: "", cta: "" });
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setValues({ hook: script?.hook || "", body: script?.body || "", cta: script?.cta || "" });
  }, [script, projectId]);

  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(async () => {
      setStatus("saving");
      try {
        await api.saveScript(projectId, values);
        setStatus("saved");
      } catch {
        setStatus("dirty");
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, status]);

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("dirty");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Script</h3>
        <span className="text-xs text-stone-500">
          {status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved changes" : status === "saved" ? "Saved" : ""}
        </span>
      </div>
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-xs text-stone-400 mb-1">{label}</label>
          <textarea
            value={values[key]}
            onChange={(e) => update(key, e.target.value)}
            placeholder={placeholder}
            rows={key === "body" ? 6 : 3}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
      ))}
    </div>
  );
}
