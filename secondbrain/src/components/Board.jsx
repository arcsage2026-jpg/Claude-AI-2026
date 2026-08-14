import React, { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { STAGES } from "../constants.js";
import ProjectCard from "./ProjectCard.jsx";
import NewProjectModal from "./NewProjectModal.jsx";
import ProjectDetail from "./ProjectDetail.jsx";

export default function Board() {
  const [projects, setProjects] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([api.listProjects(), api.listChannels()]);
      setProjects(p);
      setChannels(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const channelsById = Object.fromEntries(channels.map((c) => [c.id, c]));

  async function handleCreate(data) {
    await api.createProject(data);
    await load();
  }

  async function handleStageChange(id, stage) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));
    await api.setProjectStage(id, stage);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-400">
          {projects.length} idea{projects.length === 1 ? "" : "s"} in the pipeline
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-amber-300"
        >
          <Plus size={16} /> New idea
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGES.map((stage) => {
            const items = projects.filter((p) => p.stage === stage.id);
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {stage.label}
                  </h3>
                  <span className="text-xs text-stone-500">{items.length}</span>
                </div>
                <div
                  className="space-y-2 min-h-[4rem] rounded-lg"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = Number(e.dataTransfer.getData("text/project-id"));
                    if (id) handleStageChange(id, stage.id);
                  }}
                >
                  {items.map((project) => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/project-id", String(project.id))}
                    >
                      <ProjectCard
                        project={project}
                        channel={channelsById[project.channel_id]}
                        onOpen={() => setOpenProjectId(project.id)}
                      />
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-stone-500">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewProjectModal channels={channels} onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}

      {openProjectId && (
        <ProjectDetail
          projectId={openProjectId}
          channels={channels}
          onClose={() => setOpenProjectId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
