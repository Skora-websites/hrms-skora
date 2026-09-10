import { AppShell } from "@/components/layout/app-shell";
import { getTasks } from "@/lib/db/tasks";
import { getProjects } from "@/lib/db/projects";
import { getTimesheets } from "@/lib/db/timesheets";
import { TimesheetForm } from "@/components/pms/timesheet-form";
import { Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default async function EmployeeTimesheetPage() {
  const tasks = await getTasks();
  const projects = await getProjects();
  const timesheets = await getTimesheets();

  return (
    <AppShell title="My Timesheet & Work Hours">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Timesheet & Hours Log</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Log project task work hours and track Manager approval statuses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Log Timesheet Form */}
        <div className="lg:col-span-1">
          <TimesheetForm tasks={tasks} projects={projects} isPunchedIn={true} />
        </div>

        {/* Right 2 Cols: Timesheet Log History */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Submitted Timesheet History
            </h3>

            {timesheets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No timesheet entries logged yet. Use the form on the left to submit your hours.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Task</th>
                      <th className="pb-3 font-semibold">Project</th>
                      <th className="pb-3 font-semibold">Hours</th>
                      <th className="pb-3 font-semibold">Billable</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                    {timesheets.map((ts) => (
                      <tr key={ts._id}>
                        <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">{ts.date}</td>
                        <td className="py-3 font-semibold text-slate-900 dark:text-white">{ts.taskTitle || "Task Work"}</td>
                        <td className="py-3 text-primary font-medium">{ts.projectName || "Project"}</td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{ts.hours}h</td>
                        <td className="py-3">
                          {ts.billable ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="py-3">
                          {ts.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : ts.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 font-bold border border-red-500/20">
                              <AlertCircle className="h-3 w-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-600 dark:text-yellow-400 font-bold border border-yellow-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
