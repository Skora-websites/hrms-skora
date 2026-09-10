"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAdminEdit } from "@/context/AdminEditContext";
import { Edit3, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EditableTextProps {
  id: string;
  defaultText: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
  multiline?: boolean;
}

export default function EditableText({
  id,
  defaultText,
  className = "",
  as: Component = "span",
  multiline = false,
}: EditableTextProps) {
  const { isEditMode, textOverrides, draftOverrides, updateOverride } = useAdminEdit();
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentText = draftOverrides[id] ?? textOverrides[id] ?? defaultText;
  const [tempText, setTempText] = useState(currentText);

  if (!isEditMode) {
    return <Component className={className}>{currentText}</Component>;
  }

  const handleSaveInline = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateOverride(id, tempText);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempText(currentText);
    setEditing(false);
  };

  const modalContent = (
    <AnimatePresence>
      {editing && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-white border border-[#E1E6DF] rounded-3xl p-6 shadow-2xl space-y-4 text-[#0B1310] font-sans"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E6DF]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold text-xs">
                  ✦ EDIT ELEMENT ✦
                </div>
                <span className="text-xs font-mono text-slate-500 font-bold">ID: {id}</span>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg bg-[#F4F6F1] hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveInline} className="space-y-4">
              {multiline ? (
                <textarea
                  rows={4}
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="w-full bg-[#F4F6F1] border border-[#E1E6DF] rounded-xl p-3.5 text-sm text-[#0B1310] font-medium focus:outline-none focus:border-[#2563EB]"
                />
              ) : (
                <input
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="w-full bg-[#F4F6F1] border border-[#E1E6DF] rounded-xl p-3.5 text-sm text-[#0B1310] font-bold focus:outline-none focus:border-[#2563EB]"
                />
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Apply Staged Change</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Component
        onClick={() => {
          setTempText(currentText);
          setEditing(true);
        }}
        className={`${className} outline-dashed outline-2 outline-[#2563EB]/60 hover:outline-[#2563EB] bg-blue-50/50 hover:bg-blue-100/50 rounded px-1 cursor-pointer transition-all relative group`}
        title="Click to edit text directly on page"
      >
        {currentText}
        <span className="inline-flex items-center ml-1 text-[#2563EB] opacity-70 group-hover:opacity-100 transition-opacity">
          <Edit3 size={13} className="inline ml-1 -mt-0.5" />
        </span>
      </Component>

      {mounted && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}
