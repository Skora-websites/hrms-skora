"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Building2,
  Mail,
  Briefcase,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OrgEmployee {
  id: string;
  displayName: string;
  name?: string;
  email: string;
  department?: string;
  designation?: string;
  role?: string;
  reportingManager?: string;
  image?: string;
  children?: OrgEmployee[];
}

export function OrgChartTree() {
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [selectedEmp, setSelectedEmp] = useState<OrgEmployee | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch("/api/hrm/v2/employees?pageSize=200");
        if (res.ok) {
          const json = await res.json();
          setEmployees(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load employees for org chart:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Build hierarchical tree
  const treeData = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    const map = new Map<string, OrgEmployee>();
    employees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
      if (emp.displayName) {
        map.set(emp.displayName.toLowerCase().trim(), map.get(emp.id)!);
      }
    });

    const roots: OrgEmployee[] = [];

    employees.forEach((emp) => {
      const node = map.get(emp.id)!;
      const rm = emp.reportingManager?.trim();

      if (!rm || rm === emp.id || rm === emp.displayName) {
        // Top-level / Root node
        roots.push(node);
      } else {
        const parent = map.get(rm) || map.get(rm.toLowerCase());
        if (parent && parent.id !== node.id) {
          if (!parent.children) parent.children = [];
          if (!parent.children.some((c) => c.id === node.id)) {
            parent.children.push(node);
          }
        } else {
          // If manager not found in current set, treat as root
          roots.push(node);
        }
      }
    });

    return roots;
  }, [employees]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 1.5));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin motion-reduce:animate-none mb-3 text-primary" />
        <p className="text-sm font-medium">Generating organizational hierarchy tree…</p>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-60 text-muted-foreground" />
        <p className="font-semibold text-foreground">No Organizational Hierarchy Available</p>
        <p className="text-xs mt-1">Add employees with designated reporting managers to visualize the org chart.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member in hierarchy..."
              className="pl-9 h-9 w-64 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="text-xs py-1">
            {employees.length} Total Members
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground font-semibold px-2">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)} title="Reset Zoom">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Org Tree Canvas */}
      <div className="bg-card border border-border rounded-xl p-8 overflow-auto min-h-[500px] flex justify-center">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s ease-out" }}
          className="inline-flex flex-col items-center"
        >
          <div className="flex gap-12 justify-center">
            {treeData.map((root) => (
              <OrgNode
                key={root.id}
                employee={root}
                search={search}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={toggleCollapse}
                onSelect={setSelectedEmp}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected Employee Slide-over / Modal Details */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={selectedEmp.image} alt={selectedEmp.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {getInitials(selectedEmp.displayName || selectedEmp.name || "E")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {selectedEmp.displayName || selectedEmp.name}
                </h3>
                <p className="text-sm text-primary font-medium">{selectedEmp.designation || "Staff"}</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="outline" className="text-xs">
                    {selectedEmp.department || "General"}
                  </Badge>
                  {selectedEmp.role && (
                    <Badge variant="default" className="text-xs capitalize">
                      {selectedEmp.role.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-sm py-3 border-y border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-foreground font-mono text-xs">{selectedEmp.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Reports to: <strong className="text-foreground">{selectedEmp.reportingManager || "Executive Board / None"}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Direct Reports: <strong className="text-foreground">{selectedEmp.children?.length || 0} members</strong></span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={() => setSelectedEmp(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgNode({
  employee,
  search,
  collapsedNodes,
  onToggleCollapse,
  onSelect,
}: {
  employee: OrgEmployee;
  search: string;
  collapsedNodes: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSelect: (emp: OrgEmployee) => void;
}) {
  const isCollapsed = collapsedNodes.has(employee.id);
  const hasChildren = employee.children && employee.children.length > 0;
  const isMatchingSearch =
    search.trim() !== "" &&
    (employee.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      employee.designation?.toLowerCase().includes(search.toLowerCase()) ||
      employee.department?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        onClick={() => onSelect(employee)}
        className={`w-60 bg-card border rounded-xl p-3.5 shadow-sm transition-[box-shadow,border-color] duration-150 hover:shadow-md cursor-pointer relative ${
          isMatchingSearch
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
            <AvatarImage src={employee.image} alt={employee.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {getInitials(employee.displayName || employee.name || "E")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-bold text-xs text-foreground truncate">
              {employee.displayName || employee.name}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
              {employee.designation || "Staff"}
            </p>
            <p className="text-xs text-primary font-semibold truncate mt-0.5">
              {employee.department || "General"}
            </p>
          </div>
        </div>

        {/* Expand / Collapse Button if children exist */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(employee.id);
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-border shadow-xs rounded-full h-6 px-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{employee.children!.length}</span>
          </button>
        )}
      </div>

      {/* Connecting Lines and Children Tree */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center mt-3">
          {/* Vertical line from parent */}
          <div className="w-px h-6 bg-border" />

          {/* Horizontal line across children */}
          <div className="flex relative pt-6">
            {employee.children!.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "calc(50% / " + employee.children!.length + ")",
                  right: "calc(50% / " + employee.children!.length + ")",
                }}
              />
            )}

            {/* Child nodes */}
            <div className="flex gap-8 justify-center">
              {employee.children!.map((child) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Vertical line to child */}
                  <div className="absolute -top-6 w-px h-6 bg-border" />
                  <OrgNode
                    employee={child}
                    search={search}
                    collapsedNodes={collapsedNodes}
                    onToggleCollapse={onToggleCollapse}
                    onSelect={onSelect}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
