"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAdminEdit } from "@/context/AdminEditContext";
import { Sparkles, Save, RotateCcw, LayoutDashboard, CheckCircle2, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminEditBar() {
  const {
    isAdminAuthenticated,
    isEditMode,
    setIsEditMode,
    hasUnsavedChanges,
    draftOverrides,
    publishChanges,
    discardChanges,
    saving,
  } = useAdminEdit();

  const [publishedNotice, setPublishedNotice] = useState(false);

  if (!isAdminAuthenticated) return null;

  const handlePublish = async () => {
    const success = await publishChanges();
    if (success) {
      setPublishedNotice(true);
      setTimeout(() => setPublishedNotice(false), 3000);
    }
  };

  const stagedCount = Object.keys(draftOverrides).length;

  return (
    <div className="fixed top-0 inset-x-0 z-[999999] pointer-events-none flex justify-center p-3 font-sans">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto bg-[#0B132B]/95 text-white border border-blue-500/40 rounded-full px-5 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-bold"
      >
        {/* Brand Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/15">
          <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black shadow-sm">
            SK
          </div>
          <span className="font-mono text-cyan-300 font-bold tracking-wider text-[11px]">VISUAL CMS</span>
        </div>

        {/* Live Edit Mode Toggle */}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer border ${
            isEditMode
              ? "bg-[#2563EB] text-white border-blue-400 shadow-md shadow-blue-500/30"
              : "bg-white/10 text-slate-300 border-white/10 hover:bg-white/20"
          }`}
        >
          {isEditMode ? <ToggleRight size={18} className="text-cyan-300" /> : <ToggleLeft size={18} />}
          <span>{isEditMode ? "EDIT MODE: ON" : "LIVE EDIT MODE: OFF"}</span>
        </button>

        {/* Unsaved Edits Counter & Publish Controls */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
              {stagedCount} Unsaved Edits
            </span>

            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={13} />
                  <span>Publish Live</span>
                </>
              )}
            </button>

            <button
              onClick={discardChanges}
              className="p-1.5 rounded-full bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-300 transition-colors cursor-pointer"
              title="Discard Staged Changes"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {publishedNotice && (
          <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1 animate-pulse">
            <CheckCircle2 size={14} /> Published Live!
          </span>
        )}
      </motion.div>
    </div>
  );
}
