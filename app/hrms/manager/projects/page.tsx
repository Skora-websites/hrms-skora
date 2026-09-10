import { AppShell } from "@/components/layout/app-shell";
import { getProjects } from "@/lib/db/projects";
import { getTasks } from "@/lib/db/tasks";
import { KanbanBoard } from "@/components/pms/kanban-board";
import { GanttChart } from "@/components/pms/gantt-chart";

export default async function ManagerProjectsPage() {
  const projects = await getProjects();
  const tasks = await getTasks();

  return (
    <AppShell title="Manager Projects & Task Execution">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Project Management System (PMS)</h2>
        <p className="text-xs text-slate-400 mt-1">Interactive Drag & Drop Kanban Board & Gantt Chart Timeline</p>
      </div>

      {/* Kanban Board Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">Team Kanban Board</h3>
        </div>
        <KanbanBoard initialTasks={tasks} />
      </div>

      {/* Gantt Timeline Section */}
      <div className="mb-8">
        <GanttChart tasks={tasks} />
      </div>
    </AppShell>
  );
}
