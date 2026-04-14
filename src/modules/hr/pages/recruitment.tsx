// ──────────────────────────────────────────────────────────
// Pagina Recrutare — Pipeline Kanban pentru candidați
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getCollection,
  removeItem,
  setCollection,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  CANDIDATE_STATUSES,
  type Candidate,
  type CandidateStatus,
} from "@/modules/hr/types";
import { toast } from "sonner";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { CandidateDialog } from "./_components/recruitment-dialog";
import { CandidateToEmployeeDialog } from "./_components/recruitment-employee-dialog";
import { CandidateColumn } from "./_components/recruitment-column";
import { CandidateCard } from "./_components/recruitment-card";

const ALL_POSITIONS = "all";

export default function RecruitmentPage() {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const { pathname } = useLocation();

  const topNavLinks = [
    { title: t("hr.nav.employees"), href: "/hr/employees", isActive: false },
    { title: t("hr.nav.recruitment"), href: "/hr/recruitment", isActive: true },
    { title: t("hr.nav.leaves"), href: "/hr/leaves", isActive: false },
    { title: t("hr.nav.payroll"), href: "/hr/payroll", isActive: false },
    { title: t("hr.nav.attendance"), href: "/hr/attendance", isActive: false },
    { title: t("hr.nav.evaluations"), href: "/hr/evaluations", isActive: false },
    { title: t("hr.nav.trainings"), href: "/hr/trainings", isActive: false },
  ].map((l) => ({ ...l, isActive: pathname === l.href }));

  const [data, setData] = React.useState<Candidate[]>(() =>
    getCollection<Candidate>(STORAGE_KEYS.recruitment),
  );
  // Ref sincronizat cu data — folosit în handler-e DnD pentru a evita
  // side-effect-uri în functional updater (problematice în React 18 StrictMode)
  const dataRef = React.useRef(data);
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Filtre
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [positionFilter, setPositionFilter] = React.useState(ALL_POSITIONS);

  const positions = React.useMemo(() => {
    const s = new Set<string>();
    data.forEach((c) => c.position && s.add(c.position.trim()));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = React.useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = normalize(deferredSearch);
    return data.filter((c) => {
      if (
        positionFilter !== ALL_POSITIONS &&
        c.position.trim() !== positionFilter
      )
        return false;
      if (!q) return true;
      return (
        normalize(c.name).includes(q) ||
        normalize(c.email).includes(q) ||
        normalize(c.position).includes(q)
      );
    });
  }, [data, deferredSearch, positionFilter]);

  const byStatus = React.useMemo(() => {
    const map: Record<CandidateStatus, Candidate[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };
    filtered.forEach((c) => map[c.status].push(c));
    return map;
  }, [filtered]);

  // State dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editCandidate, setEditCandidate] = React.useState<
    Candidate | undefined
  >();

  const [deleteTarget, setDeleteTarget] = React.useState<Candidate | null>(null);

  const [empDialogOpen, setEmpDialogOpen] = React.useState(false);
  const [empCandidate, setEmpCandidate] = React.useState<Candidate | null>(null);

  // Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const dragSnapshotRef = React.useRef<Candidate[] | null>(null);
  const dragStartStatusRef = React.useRef<CandidateStatus | null>(null);
  const activeCandidate = React.useMemo(
    () => data.find((c) => c.id === activeId) ?? null,
    [data, activeId],
  );

  const findContainer = (
    id: string,
    list: Candidate[],
  ): CandidateStatus | null => {
    if (id.startsWith("col-")) {
      const s = id.slice(4) as CandidateStatus;
      return (CANDIDATE_STATUSES as readonly string[]).includes(s) ? s : null;
    }
    const c = list.find((x) => x.id === id);
    return c?.status ?? null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    dragSnapshotRef.current = data;
    dragStartStatusRef.current =
      data.find((c) => c.id === id)?.status ?? null;
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    setData((prev) => {
      const activeContainer = findContainer(activeIdStr, prev);
      const overContainer = findContainer(overIdStr, prev);
      if (!activeContainer || !overContainer) return prev;
      if (activeContainer === overContainer) return prev;

      const activeIndex = prev.findIndex((c) => c.id === activeIdStr);
      if (activeIndex === -1) return prev;
      const moved = { ...prev[activeIndex], status: overContainer };
      const next = [...prev];
      next.splice(activeIndex, 1);

      if (overIdStr.startsWith("col-")) {
        next.push(moved);
      } else {
        const overIndex = next.findIndex((c) => c.id === overIdStr);
        if (overIndex === -1) next.push(moved);
        else next.splice(overIndex, 0, moved);
      }
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      resetDrag();
      return;
    }
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const current = dataRef.current;
    const activeContainer = findContainer(activeIdStr, current);
    const overContainer = findContainer(overIdStr, current);

    let next = current;
    if (activeContainer && overContainer) {
      if (activeContainer === overContainer && activeIdStr !== overIdStr) {
        const activeIndex = current.findIndex((c) => c.id === activeIdStr);
        const overIndex = current.findIndex((c) => c.id === overIdStr);
        if (activeIndex !== -1 && overIndex !== -1) {
          next = arrayMove(current, activeIndex, overIndex);
        }
      }
    }

    setData(next);
    setCollection<Candidate>(STORAGE_KEYS.recruitment, next);

    const moved = next.find((c) => c.id === activeIdStr);
    const fromStatus = dragStartStatusRef.current;
    if (moved && fromStatus && fromStatus !== moved.status) {
      log({
        action: "update",
        entity: "candidate",
        entityId: moved.id,
        entityLabel: moved.name,
        details: `${t(`recruitment.status.${fromStatus}`)} → ${t(`recruitment.status.${moved.status}`)}`,
        oldValue: { status: fromStatus },
        newValue: { status: moved.status },
      });

      if (moved.status === "hired") {
        toast.success(
          t("recruitment.toast.movedToHired", { name: moved.name }),
        );
      }
    }

    dragSnapshotRef.current = null;
    dragStartStatusRef.current = null;
  };

  const resetDrag = () => {
    if (dragSnapshotRef.current) {
      setData(dragSnapshotRef.current);
      dragSnapshotRef.current = null;
    }
    dragStartStatusRef.current = null;
  };

  const handleDragCancel = () => {
    setActiveId(null);
    resetDrag();
  };

  // Handlers CRUD
  const openAdd = () => {
    setEditCandidate(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (c: Candidate) => {
    setEditCandidate(c);
    setDialogOpen(true);
  };

  const handleDelete = (c: Candidate) => {
    setDeleteTarget(c);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeItem<Candidate>(
      STORAGE_KEYS.recruitment,
      (c) => c.id === deleteTarget.id,
    );
    log({
      action: "delete",
      entity: "candidate",
      entityId: deleteTarget.id,
      entityLabel: deleteTarget.name,
      details: `${deleteTarget.position} — ${t(`recruitment.status.${deleteTarget.status}`)}`,
      oldValue: {
        name: deleteTarget.name,
        position: deleteTarget.position,
        status: deleteTarget.status,
      },
    });
    setData(getCollection<Candidate>(STORAGE_KEYS.recruitment));
    toast.success(t("recruitment.toast.deleted"));
    setDeleteTarget(null);
  };

  const handleCreateEmployee = (c: Candidate) => {
    setEmpCandidate(c);
    setEmpDialogOpen(true);
  };

  const refresh = () => {
    setData(getCollection<Candidate>(STORAGE_KEYS.recruitment));
  };

  const totalCount = filtered.length;

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t("recruitment.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("recruitment.subtitle")}
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("recruitment.actions.add")}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {t("recruitment.pipelineTitle")}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {t("recruitment.count", { count: totalCount })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                placeholder={t("recruitment.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select
                value={positionFilter}
                onValueChange={setPositionFilter}
              >
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={t("recruitment.filters.position")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_POSITIONS}>
                    {t("recruitment.filters.allPositions")}
                  </SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {CANDIDATE_STATUSES.map((status) => (
                  <CandidateColumn
                    key={status}
                    status={status}
                    title={t(`recruitment.status.${status}`)}
                    candidates={byStatus[status]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCreateEmployee={handleCreateEmployee}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeCandidate ? (
                  <div className="w-[240px]">
                    <CandidateCard
                      candidate={activeCandidate}
                      overlay
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onCreateEmployee={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </CardContent>
        </Card>
      </Main>

      <CandidateDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditCandidate(undefined);
        }}
        candidate={editCandidate}
        onSaved={refresh}
      />

      <CandidateToEmployeeDialog
        open={empDialogOpen}
        onOpenChange={(v) => {
          setEmpDialogOpen(v);
          if (!v) setEmpCandidate(null);
        }}
        candidate={empCandidate}
        onCreated={refresh}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("recruitment.actions.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("recruitment.actions.deleteDesc", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("recruitment.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("recruitment.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
