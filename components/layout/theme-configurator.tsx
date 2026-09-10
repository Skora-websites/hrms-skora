"use client";

import { useState } from "react";
import { Settings, X, Palette, Sidebar, Sun, Moon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const themeColors = [
  { name: "Primary", value: "#5e72e4" },
  { name: "Dark", value: "#344767" },
  { name: "Info", value: "#11cdef" },
  { name: "Success", value: "#2dce89" },
  { name: "Warning", value: "#fb6340" },
  { name: "Danger", value: "#f5365c" },
];

export function ThemeConfigurator() {
  const [isOpen, setIsOpen] = useState(false);    const {
    theme,
    toggleTheme,
    isSidebarMini,
    setSidebarMini,
    isNavbarFixed,
    setNavbarFixed,
    config,
    updateConfig,
  } = useTheme();

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="default"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-primary text-white"
        aria-label="Theme settings"
      >
        <Settings className="h-5 w-5 animate-spin-slow" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/30"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-[360px] bg-card shadow-xl border-l border-border"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-primary" />
                    <h5 className="text-dark dark:text-white font-bold">
                      Theme Configurator
                    </h5>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Theme Color */}
                  <div>
                    <h6 className="text-dark dark:text-white font-semibold mb-3">
                      Theme Color
                    </h6>
                    <div className="flex gap-2">
                      {themeColors.map((color) => {
                        const isActive = config.primaryColor === color.value;
                        return (
                          <button
                            key={color.value}
                            onClick={() => updateConfig({ primaryColor: color.value })}
                            className={cn(
                              "relative h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                              isActive
                                ? "scale-110 ring-2 ring-offset-2 ring-[var(--color-primary)]"
                                : ""
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {isActive && (
                              <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Dark/Light Mode */}
                  <div>
                    <h6 className="text-dark dark:text-white font-semibold mb-3">
                      Light / Dark Mode
                    </h6>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? (
                          <Moon className="h-5 w-5 text-primary" />
                        ) : (
                          <Sun className="h-5 w-5 text-warning" />
                        )}
                        <span className="text-sm text-muted">
                          {theme === "dark" ? "Dark Mode" : "Light Mode"}
                        </span>
                      </div>
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={toggleTheme}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Sidebar Mini */}
                  <div>
                    <h6 className="text-dark dark:text-white font-semibold mb-3">
                      <Sidebar className="h-4 w-4 inline mr-2" />
                      Sidebar Settings
                    </h6>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Mini Sidebar</span>
                        <Switch
                          checked={isSidebarMini}
                          onCheckedChange={setSidebarMini}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Fixed Navbar</span>
                        <Switch
                          checked={isNavbarFixed}
                          onCheckedChange={setNavbarFixed}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Sidebar Background */}
                  <div>
                    <h6 className="text-dark dark:text-white font-semibold mb-3">
                      Sidebar Background
                    </h6>
                    <div className="flex gap-3">
                      <button className="flex-1 rounded-lg border-2 border-primary p-3 bg-white text-center">
                        <div className="h-8 w-full rounded bg-white border border-gray-200 mx-auto mb-2" />
                        <span className="text-xs font-medium text-dark">Light</span>
                      </button>
                      <button className="flex-1 rounded-lg border-2 border-border p-3 bg-dark text-center">
                        <div className="h-8 w-full rounded bg-dark border border-gray-600 mx-auto mb-2" />
                        <span className="text-xs font-medium text-white">Dark</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 text-center">
                  <p className="text-xxs text-muted">
                    Settings are saved locally
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
