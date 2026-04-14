import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import type { Candidate, CandidateStatus } from "@/modules/hr/types";
import { CandidateCard } from "./recruitment-card";
import { cn } from "@/lib/utils";

// Culori accent per status
const STATUS_ACCENTS: Record<
  CandidateStatus,
  { bar: string; dot: string }
> = {
  applied: { bar: "bg-blue-500/70", dot: "bg-blue-500" },
  screening: { bar: "bg-amber-500/70", dot: "bg-amber-500" },
  interview: { bar: "bg-violet-500/70", dot: "bg-violet-500" },
  offer: { bar: "bg-cyan-500/70", dot: "bg-cyan-500" },
  hired: { bar: "bg-emerald-500/70", dot: "bg-emerald-500" },
  rejected: { bar: "bg-rose-500/70", dot: "bg-rose-500" },
};

interface Props {
  status: CandidateStatus;
  title: string;
  candidates: Candidate[];
  onEdit: (c: Candidate) => void;
  onDelete: (c: Candidate) => void;
  onCreateEmployee: (c: Candidate) => void;
}

export function CandidateColumn({
  status,
  title,
  candidates,
  onEdit,
  onDelete,
  onCreateEmployee,
}: Props) {
  const { t } = useTranslation();
  const accent = STATUS_ACCENTS[status];
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  });

  const ids = React.useMemo(() => candidates.map((c) => c.id), [candidates]);

  return (
    <div className="flex flex-col min-w-0 rounded-lg border bg-muted/20 overflow-hidden">
      <div className={cn("h-1 w-full", accent.bar)} />
      <div className="flex items-center justify-between px-2.5 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", accent.dot)} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5 min-w-[22px] text-center">
          {candidates.length}
        </span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-1.5 space-y-1.5 min-h-[120px] max-h-[calc(100vh-320px)] overflow-y-auto transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {candidates.length === 0 && (
            <div className="text-[10px] text-muted-foreground/60 text-center py-3 border border-dashed rounded-md">
              {t("recruitment.emptyColumn")}
            </div>
          )}
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateEmployee={onCreateEmployee}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
