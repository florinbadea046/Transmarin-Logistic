import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/modules/hr/types";
import { getInitials } from "../utils/get-initials";
import { InfoTab } from "./employee-info-tab";
import { LeavesTab, DocsTabWrapper, BonusesTab, StatsTab } from "./employee-profile-tabs";

// ── Stats Dialog (standalone) ────────────────────────────────

interface StatsDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EmployeeStatsDialog({ employee, open, onOpenChange }: StatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">Statistici — {employee.name}</DialogTitle>
              <p className="text-sm text-muted-foreground truncate">
                {employee.position} · {employee.department}
              </p>
            </div>
          </div>
        </DialogHeader>
        <StatsTab employeeId={employee.id} />
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dialog ──────────────────────────────────────────────

interface Props {
  employee: Employee;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (employee: Employee) => void;
}

export function EmployeeProfileDialog({ employee, open, onOpenChange, onUpdate }: Props) {
  const [current, setCurrent] = React.useState(employee);

  React.useEffect(() => {
    setCurrent(employee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const handleUpdate = (updated: Employee) => {
    setCurrent(updated);
    onUpdate(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[480px] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                {getInitials(current.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight">{current.name}</DialogTitle>
              <p className="text-sm text-muted-foreground truncate">
                {current.position} · {current.department}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto shrink-0">
            <TabsList className="w-full min-w-[300px] grid grid-cols-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="leaves">Concedii</TabsTrigger>
              <TabsTrigger value="docs">Documente</TabsTrigger>
              <TabsTrigger value="bonuses">Bonusuri</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 min-h-0">
            <TabsContent value="info" className="mt-0">
              <InfoTab employee={current} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="leaves" className="mt-0">
              <LeavesTab employeeId={current.id} />
            </TabsContent>
            <TabsContent value="docs" className="mt-0">
              <DocsTabWrapper employee={current} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="bonuses" className="mt-0">
              <BonusesTab employeeId={current.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
