import React, { useEffect, useState } from "react";
import { Plus, Trash2, Tv, Users } from "lucide-react";
import { api } from "../api.js";

function formatSubs(n) {
  if (n === null || n === undefined || n === "") return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [subs, setSubs] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setChannels(await api.listChannels());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createChannel({
        name: name.trim(),
        handle: handle.trim() || null,
        url: url.trim() || null,
        subscriber_count: subs ? Number(subs) : null,
        notes: notes.trim() || null,
      });
      setName("");
      setHandle("");
      setUrl("");
      setSubs("");
      setNotes("");
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this channel? Projects assigned to it will become unassigned.")) return;
    await api.deleteChannel(id);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-400">
          {channels.length} channel{channels.length === 1 ? "" : "s"} tracked
        </p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-amber-300"
        >
          <Plus size={16} /> New channel
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="mb-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-4 max-w-lg"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Channel name"
              className="rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
              className="rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/@handle"
            className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <input
            value={subs}
            onChange={(e) => setSubs(e.target.value)}
            type="number"
            min="0"
            placeholder="Subscriber count"
            className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Niche, posting cadence, notes…"
            rows={2}
            className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-3 py-1.5 text-sm text-stone-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-amber-300 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add channel"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : channels.length === 0 ? (
        <p className="text-sm text-stone-500">No channels yet. Add one to start assigning ideas to it.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  <Tv size={14} className="text-amber-400" /> {c.name}
                </div>
                <button onClick={() => remove(c.id)} className="text-stone-500 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
              {c.handle && <div className="mt-1 text-xs text-stone-400">{c.handle}</div>}
              {c.subscriber_count !== null && (
                <div className="mt-1 flex items-center gap-1 text-xs text-stone-300">
                  <Users size={11} /> {formatSubs(c.subscriber_count)} subscribers
                </div>
              )}
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs text-amber-300 hover:underline truncate"
                >
                  {c.url}
                </a>
              )}
              {c.notes && <p className="mt-2 text-xs text-stone-400">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
