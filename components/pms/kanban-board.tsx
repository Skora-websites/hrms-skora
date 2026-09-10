"use client";

import { useState } from "react";
import { Task, TaskStatus } from "@/lib/db/tasks";
import { KanbanCard } from "./kanban-card";
import { updateTaskStatusAction } from "@/lib/actions/pms-actions";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

interface KanbanBoardProps {
  initialTasks: Task[];
  onOpenTimer?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "TODO", title: "To Do", color: "border-slate-400 text-slate-700 dark:text-slate-300" },
  { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-500 text-blue-600 dark:text-blue-400" },
  { id: "REVIEW", title: "In Review", color: "border-yellow-500 text-yellow-700 dark:text-yellow-400" },
  { id: "DONE", title: "Done", color: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
];

export function KanbanBoard({ initialTasks, onOpenTimer, onAddTask }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t._id === activeId);
    if (!activeTask) return;

    // Check if dropped onto a column header or task
    let targetStatus: TaskStatus | null = null;

    if (COLUMNS.some((col) => col.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== activeTask.status) {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === activeId ? { ...t, status: targetStatus! } : t))
      );

      // Server update
      await updateTaskStatusAction(activeId, targetStatus);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          const taskIds = columnTasks.map((t) => t._id || "");

          return (
            <div
              key={column.id}
              className="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#070B14]/80 p-4 min-h-[500px] text-slate-900 dark:text-white"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${column.color}`}>{column.title}</span>
                  <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {columnTasks.length}
                  </span>
                </div>
                {onAddTask && (
                  <button
                    type="button"
                    onClick={() => onAddTask(column.id)}
                    className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Column Cards */}
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="flex-1 space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-32 border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-xs text-slate-500 dark:text-slate-500 font-medium">
                      No tasks in {column.title.toLowerCase()}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <KanbanCard key={task._id} task={task} onOpenTimer={onOpenTimer} />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
