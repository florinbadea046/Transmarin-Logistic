import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Phone,
  Calendar,
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  GripVertical,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Candidate } from "@/modules/hr/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

interface Props {
  candidate: Candidate;
  overlay?: boolean;
  onEdit: (c: Candidate) => void;
  onDelete: (c: Candidate) => void;
  onCreateEmployee: (c: Candidate) => void;
}

export function CandidateCard({
  candidate,
  overlay,
  onEdit,
  onDelete,
  onCreateEmployee,
}: Props) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: { type: "candidate", candidate },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card shadow-sm",
        isDragging && !overlay && "opacity-40",
        overlay && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{candidate.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {candidate.position}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              aria-label={t("recruitment.actions.drag")}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={t("recruitment.actions.menu")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(candidate)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  {t("recruitment.actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(candidate)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {t("recruitment.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{candidate.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatDate(candidate.applicationDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 pt-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-3 w-3",
                n <= candidate.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40",
              )}
            />
          ))}
        </div>
        {candidate.status === "hired" && !candidate.employeeId && (
          <Button
            size="sm"
            variant="default"
            className="h-7 w-full text-[11px] mt-1"
            onClick={() => onCreateEmployee(candidate)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            {t("recruitment.actions.createEmployee")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
