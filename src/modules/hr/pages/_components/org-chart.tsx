import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Employee } from "@/modules/hr/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0]?.toUpperCase() || "")
      .join("");
  }

  // Expand/collapse logic
  function OrgNode({ emp, all, onClick, expanded, toggle }: {
    emp: Employee;
    all: Employee[];
    onClick: (e: Employee) => void;
    expanded: Record<string, boolean>;
    toggle: (id: string) => void;
  }) {
    const children = all.filter((e) => e.managerId === emp.id);
    const isExpanded = expanded[emp.id] ?? true;
    return (
      <div className="flex flex-col items-center min-w-[140px]">
        <div
          className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card shadow cursor-pointer hover:bg-accent transition relative"
          onClick={() => onClick(emp)}
        >
          <Avatar className="mb-1">
            <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
          </Avatar>
          <div className="font-medium text-sm text-center">{emp.name}</div>
          <div className="text-xs text-muted-foreground text-center">{emp.position}</div>
          <Badge variant="secondary" className="mt-1">{emp.department}</Badge>
          {children.length > 0 && (
            <button
              type="button"
              className="absolute top-2 right-2 text-xs px-1 py-0.5 rounded bg-muted border hover:bg-accent"
              onClick={e => { e.stopPropagation(); toggle(emp.id); }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "−" : "+"}
            </button>
          )}
        </div>
        {children.length > 0 && isExpanded && (
          <div className="flex flex-row gap-4 mt-3">
            {children.map((child) => (
              <OrgNode key={child.id} emp={child} all={all} onClick={onClick} expanded={expanded} toggle={toggle} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const OrgChart: React.FC = () => {
    const [selected, setSelected] = React.useState<Employee | null>(null);
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const [zoom, setZoom] = React.useState(1);
    const employees = React.useMemo(() => getCollection<Employee>(STORAGE_KEYS.employees), []);
    const ceo = employees.find((e) => !e.managerId);
    if (!ceo) return <div className="text-muted-foreground">Nu există CEO definit în date.</div>;

    const handleToggle = (id: string) => {
      setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
    };

    return (
      <div>
        <div className="flex gap-2 mb-2 items-center">
          <span className="font-medium">Zoom:</span>
          <button className="px-2 py-1 rounded border bg-muted hover:bg-accent" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>-</button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button className="px-2 py-1 rounded border bg-muted hover:bg-accent" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
        </div>
        <div className="overflow-x-auto py-4">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s" }}>
            <OrgNode emp={ceo} all={employees} onClick={setSelected} expanded={expanded} toggle={handleToggle} />
          </div>
        </div>
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>{selected.name}</DialogTitle>
                  <DialogDescription>
                    {selected.position} &mdash; {selected.department}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-2 mt-2">
                  <Avatar className="size-16">
                    <AvatarFallback className="text-2xl">{getInitials(selected.name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm text-muted-foreground">Email: {selected.email}</div>
                  <div className="text-sm text-muted-foreground">Telefon: {selected.phone}</div>
                  <div className="text-sm text-muted-foreground">Data angajării: {selected.hireDate}</div>
                  <div className="text-sm text-muted-foreground">Salariu: {(selected.salary ?? 0).toLocaleString("ro-RO")} RON</div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

export default OrgChart;
