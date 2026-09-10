"use client";

import { Task, TaskPriority } from "@/lib/db/tasks";
import { Clock, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanCardProps {
  task: Task;
  onOpenTimer?: (task: Task) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function KanbanCard({ task, onOpenTimer }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id || "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white hover:border-primary/40 active:cursor-grabbing"
    >
      {/* Top row: Priority badge & Project tag */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
            priorityColors[task.priority] || priorityColors.MEDIUM
          }`}
        >
          {task.priority}
        </span>
        {task.projectName && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] font-medium">
            {task.projectName}
          </span>
        )}
      </div>

      {/* Task title */}
      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Task description */}
      {task.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Footer details */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {task.estimatedHours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              {task.loggedHours || 0}/{task.estimatedHours}h
            </span>
          )}
        </div>

        {/* Start timer action */}
        {onOpenTimer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTimer(task);
            }}
            className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            ▶ Timer
          </button>
        )}
      </div>
    </div>
  );
}
