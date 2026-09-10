"use client";

import { useEffect, useRef } from "react";
import { Task } from "@/lib/db/tasks";
import Gantt from "frappe-gantt";

interface GanttChartProps {
  tasks: Task[];
}

export function GanttChart({ tasks }: GanttChartProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const formattedTasks = tasks.map((task, index) => {
      const start = task.createdAt
        ? new Date(task.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      let end = task.dueDate || start;
      if (end <= start) {
        const nextDay = new Date(start);
        nextDay.setDate(nextDay.getDate() + 3);
        end = nextDay.toISOString().split("T")[0];
      }

      return {
        id: task._id || `task-${index}`,
        name: task.title,
        start,
        end,
        progress: task.status === "DONE" ? 100 : task.status === "REVIEW" ? 75 : task.status === "IN_PROGRESS" ? 40 : 0,
        dependencies: "",
      };
    });

    try {
      new Gantt(containerRef.current, formattedTasks, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ["Quarter Day", "Half Day", "Day", "Week", "Month"],
        bar_height: 24,
        bar_corner_radius: 6,
        arrow_curve: 5,
        padding: 18,
        view_mode: "Day",
        custom_popup_html: null,
      });
    } catch {
      // Handle server-side hydration edge cases safely
    }
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-white/10 rounded-2xl text-slate-500 text-sm">
        No tasks available for Gantt timeline view.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#070B14]/90 p-4">
      <h4 className="font-bold text-white text-sm mb-4">Project Timeline & Milestones</h4>
      <div className="gantt-target">
        <svg ref={containerRef} className="w-full min-w-[700px]"></svg>
      </div>
    </div>
  );
}
