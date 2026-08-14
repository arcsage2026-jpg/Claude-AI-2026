import React, { useState } from "react";
import { Brain, LayoutGrid, Tv } from "lucide-react";
import Board from "./components/Board.jsx";
import ChannelsPage from "./components/ChannelsPage.jsx";

const TABS = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "channels", label: "Channels", icon: Tv },
];

export default function SecondBrainApp() {
  const [tab, setTab] = useState("board");

  return (
    <div className="min-h-screen bg-[#191410] text-stone-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#191410]/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="text-amber-400" size={22} />
          <h1 className="text-lg font-semibold tracking-tight">Second Brain</h1>
          <span className="text-xs text-stone-400 hidden sm:inline">YouTube content studio</span>
        </div>
        <nav className="flex gap-1 rounded-lg bg-white/5 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === id ? "bg-amber-400 text-stone-900" : "text-stone-300 hover:bg-white/10"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {tab === "board" && <Board />}
        {tab === "channels" && <ChannelsPage />}
      </main>
    </div>
  );
}
