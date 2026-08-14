import React, { useState } from "react";
import { Link2, FileText, Captions, Plus, Trash2, ExternalLink } from "lucide-react";
import { api } from "../api.js";

const TYPES = [
  { id: "link", label: "Link", icon: Link2 },
  { id: "note", label: "Note", icon: FileText },
  { id: "transcript", label: "Transcript", icon: Captions },
];

function TypeIcon({ type, size = 12 }) {
  const found = TYPES.find((t) => t.id === type) || TYPES[1];
  const Icon = found.icon;
  return <Icon size={size} />;
}

export default function SourceList({ projectId, sources, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() && !url.trim() && !content.trim()) return;
    setSaving(true);
    try {
      await api.addSource(projectId, {
        type,
        title: title.trim() || null,
        url: url.trim() || null,
        content: content.trim() || null,
      });
      setTitle("");
      setUrl("");
      setContent("");
      setAdding(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await api.deleteSource(id);
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-200">Research &amp; sources</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200"
        >
          <Plus size={13} /> Add source
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-3 space-y-2 rounded-md border border-white/10 bg-white/5 p-3">
          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  type === t.id ? "bg-amber-400 text-stone-900" : "bg-white/5 text-stone-300"
                }`}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          {type === "link" && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          )}
          {type !== "link" && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === "transcript" ? "Paste transcript text…" : "Note content…"}
              rows={3}
              className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber-400 px-2 py-1 text-xs font-medium text-stone-900 hover:bg-amber-300 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {sources.length === 0 && !adding && (
        <p className="text-xs text-stone-500">No sources yet — links, notes, or transcripts you're pulling from.</p>
      )}

      <ul className="space-y-1.5">
        {sources.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <TypeIcon type={s.type} />
                <span className="font-medium truncate">{s.title || "(untitled)"}</span>
              </div>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-300 hover:underline truncate"
                >
                  <ExternalLink size={10} /> {s.url}
                </a>
              )}
              {s.content && <p className="mt-0.5 text-[11px] text-stone-400 line-clamp-2">{s.content}</p>}
            </div>
            <button onClick={() => remove(s.id)} className="text-stone-500 hover:text-red-400 shrink-0">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
