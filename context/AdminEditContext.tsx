"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AdminEditContextType {
  isAdminAuthenticated: boolean;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  textOverrides: Record<string, string>;
  draftOverrides: Record<string, string>;
  updateOverride: (id: string, newText: string) => void;
  publishChanges: () => Promise<boolean>;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
  saving: boolean;
}

const AdminEditContext = createContext<AdminEditContextType | undefined>(undefined);

export function AdminEditProvider({ children }: { children: React.ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Check admin session on mount
  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdminAuthenticated(true);
        }
      })
      .catch(() => {});

    // Fetch saved text overrides
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        if (data.content && data.content.textOverrides) {
          setTextOverrides(data.content.textOverrides);
        }
      })
      .catch(() => {});
  }, []);

  const updateOverride = (id: string, newText: string) => {
    setDraftOverrides((prev) => ({
      ...prev,
      [id]: newText,
    }));
  };

  const publishChanges = async (): Promise<boolean> => {
    if (Object.keys(draftOverrides).length === 0) return true;
    setSaving(true);

    const mergedOverrides = {
      ...textOverrides,
      ...draftOverrides,
    };

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textOverrides: mergedOverrides }),
      });

      if (res.ok) {
        setTextOverrides(mergedOverrides);
        setDraftOverrides({});
        setSaving(false);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
    return false;
  };

  const discardChanges = () => {
    setDraftOverrides({});
  };

  const hasUnsavedChanges = Object.keys(draftOverrides).length > 0;

  return (
    <AdminEditContext.Provider
      value={{
        isAdminAuthenticated,
        isEditMode,
        setIsEditMode,
        textOverrides,
        draftOverrides,
        updateOverride,
        publishChanges,
        discardChanges,
        hasUnsavedChanges,
        saving,
      }}
    >
      {children}
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit() {
  const context = useContext(AdminEditContext);
  if (!context) {
    throw new Error("useAdminEdit must be used within an AdminEditProvider");
  }
  return context;
}
