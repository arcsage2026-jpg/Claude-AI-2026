import React from "react";
import { Tv } from "lucide-react";

export default function ProjectCard({ project, channel, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg border border-white/10 bg-white/5 p-3 hover:border-amber-400/50 hover:bg-white/10 transition"
    >
      <div className="font-medium text-sm text-stone-100 line-clamp-2">{project.title}</div>
      {project.summary && (
        <div className="mt-1 text-xs text-stone-400 line-clamp-2">{project.summary}</div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {channel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-stone-300">
            <Tv size={10} /> {channel.name}
          </span>
        )}
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300"
          >
            #{tag}
          </span>
        ))}
      </div>
    </button>
  );
}
