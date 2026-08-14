import React, { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { STAGES } from "../constants.js";
import Modal from "./Modal.jsx";
import ScriptEditor from "./ScriptEditor.jsx";
import SourceList from "./SourceList.jsx";

export default function ProjectDetail({ projectId, channels, onClose, onChanged }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [channelId, setChannelId] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.getProject(projectId);
      setProject(p);
      setTitle(p.title);
      setSummary(p.summary || "");
      setTags(p.tags.join(", "));
      setChannelId(p.channel_id || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMeta() {
    await api.updateProject(projectId, {
      title: title.trim() || project.title,
      summary: summary.trim() || null,
      channel_id: channelId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onChanged();
  }

  async function changeStage(stage) {
    await api.setProjectStage(projectId, stage);
    setProject((p) => ({ ...p, stage }));
    onChanged();
  }

  async function remove() {
    if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    await api.deleteProject(projectId);
    onChanged();
    onClose();
  }

  return (
    <Modal onClose={onClose} wide>
      {loading || !project ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div>
          <div className="flex items-start justify-between mb-4 gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveMeta}
              className="flex-1 bg-transparent text-lg font-semibold outline-none border-b border-transparent focus:border-amber-400"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={remove} className="text-stone-500 hover:text-red-400" title="Delete idea">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-100">
                <X size={18} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <div className="flex flex-wrap gap-1.5 mb-4">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => changeStage(s.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  project.stage === s.id
                    ? "bg-amber-400 text-stone-900"
                    : "bg-white/5 text-stone-300 hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Channel</label>
              <select
                value={channelId}
                onChange={(e) => {
                  setChannelId(e.target.value);
                }}
                onBlur={saveMeta}
                className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
              >
                <option value="">Unassigned</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onBlur={saveMeta}
                placeholder="comma, separated"
                className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-stone-400 mb-1">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={saveMeta}
              rows={2}
              className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/10">
            <div className="pt-4">
              <ScriptEditor projectId={projectId} script={project.script} />
            </div>
            <div className="pt-4">
              <SourceList projectId={projectId} sources={project.sources} onChanged={load} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
