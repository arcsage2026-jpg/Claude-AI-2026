import React from "react";

export default function Modal({ onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-xl border border-white/10 bg-[#211a15] p-5 my-8 shadow-xl`}
      >
        {children}
      </div>
    </div>
  );
}
