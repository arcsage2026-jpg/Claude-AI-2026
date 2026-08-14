import React, { useState } from "react";
import { X } from "lucide-react";
import Modal from "./Modal.jsx";

export default function NewProjectModal({ channels, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        summary: summary.trim() || null,
        channel_id: channelId || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Capture a new idea</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-100">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Why nobody finishes their side projects"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="What's the angle? Why would someone click?"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Channel</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
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
            <label className="block text-xs text-stone-400 mb-1">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="productivity, tutorial"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-stone-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add idea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
