import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  addItem,
  updateItem,
  generateId,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type {
  Employee,
  PerformanceEvaluation,
  CriterionScore,
} from "@/modules/hr/types";
import { EVALUATION_CRITERIA } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";
import { calcAverage, getEmpName } from "./evaluations-types";
import { StarRating } from "./evaluations-star-rating";

// ── Evaluation Dialog ─────────────────────────────────────

interface EvalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  evaluation?: PerformanceEvaluation;
  onSave: () => void;
}

export function EvaluationDialog({
  open,
  onOpenChange,
  employees,
  evaluation,
  onSave,
}: EvalDialogProps) {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const isEdit = !!evaluation;

  const defaultCriteria = (): CriterionScore[] =>
    EVALUATION_CRITERIA.map((c) => ({ criterion: c, score: 0, comment: "" }));

  const [employeeId, setEmployeeId] = React.useState("");
  const [evaluatorId, setEvaluatorId] = React.useState("");
  const [period, setPeriod] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "final">("draft");
  const [criteria, setCriteria] = React.useState<CriterionScore[]>(defaultCriteria());
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setEmployeeId(evaluation?.employeeId ?? "");
      setEvaluatorId(evaluation?.evaluatorId ?? "");
      setPeriod(evaluation?.period ?? "");
      setStatus(evaluation?.status ?? "draft");
      setCriteria(
        evaluation?.criteria?.length
          ? evaluation.criteria.map((c) => ({ ...c }))
          : defaultCriteria(),
      );
      setErrors([]);
    }
  }, [open, evaluation]);

  const updateCriterion = (
    idx: number,
    field: "score" | "comment",
    value: number | string,
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  const avg = calcAverage(criteria);

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!employeeId) errs.push(t("evaluations.dialog.validation.employeeRequired"));
    if (!evaluatorId) errs.push(t("evaluations.dialog.validation.evaluatorRequired"));
    if (!period) errs.push(t("evaluations.dialog.validation.periodRequired"));
    if (criteria.some((c) => c.score < 1 || c.score > 5))
      errs.push(t("evaluations.dialog.validation.scoresRequired"));
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const payload: PerformanceEvaluation = {
      id: evaluation?.id ?? generateId(),
      employeeId,
      evaluatorId,
      period,
      criteria,
      averageScore: calcAverage(criteria),
      status,
      createdAt: evaluation?.createdAt ?? new Date().toISOString(),
    };

    const empName = getEmpName(employees, employeeId);

    if (isEdit) {
      updateItem<PerformanceEvaluation>(
        STORAGE_KEYS.evaluations,
        (e) => e.id === evaluation!.id,
        () => payload,
      );
      log({
        action: "update",
        entity: "evaluation",
        entityId: payload.id,
        entityLabel: empName,
        details: `Score: ${payload.averageScore}/5`,
      });
    } else {
      addItem<PerformanceEvaluation>(STORAGE_KEYS.evaluations, payload);
      log({
        action: "create",
        entity: "evaluation",
        entityId: payload.id,
        entityLabel: empName,
        details: `Score: ${payload.averageScore}/5`,
      });
    }

    toast.success(
      isEdit
        ? t("evaluations.dialog.updateSuccess")
        : t("evaluations.dialog.saveSuccess"),
    );
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEdit
              ? t("evaluations.dialog.editTitle")
              : t("evaluations.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setEvaluatorId(""); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={evaluatorId} onValueChange={setEvaluatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.selectEvaluator")} />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((e) => {
                    if (e.id === employeeId) return false;
                    const pos = e.position.toLowerCase();
                    return pos.includes("director") || pos.includes("manager");
                  })
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.position}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder={t("evaluations.dialog.periodPlaceholder")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "final")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("evaluations.status.draft")}</SelectItem>
                <SelectItem value="final">{t("evaluations.status.final")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-1">
            {criteria.map((c, idx) => (
              <div key={c.criterion} className="rounded-md border p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-medium">
                    {t(`evaluations.criteria.${c.criterion}`)}
                  </span>
                  <StarRating
                    value={c.score}
                    onChange={(v) => updateCriterion(idx, "score", v)}
                  />
                </div>
                <Input
                  placeholder={t("evaluations.dialog.commentPlaceholder")}
                  value={c.comment}
                  onChange={(e) => updateCriterion(idx, "comment", e.target.value)}
                  className="text-xs sm:text-sm h-8"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 rounded-md bg-muted/50 p-2">
            <span className="text-xs sm:text-sm font-medium">
              {t("evaluations.dialog.averageScore")}:
            </span>
            <StarRating value={Math.round(avg)} readonly />
            <span className="text-base sm:text-lg font-bold">{avg.toFixed(2)}</span>
            <span className="text-muted-foreground text-xs">/ 5</span>
          </div>

          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-red-500">{e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {t("evaluations.dialog.cancel")}
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} size="sm">{t("evaluations.dialog.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Radar Chart Dialog ────────────────────────────────────

export function RadarDialog({
  open,
  onOpenChange,
  evaluation,
  employees,
  allEvaluations,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evaluation: PerformanceEvaluation | null;
  employees: Employee[];
  allEvaluations: PerformanceEvaluation[];
}) {
  const { t } = useTranslation();
  if (!evaluation) return null;

  const radarData = evaluation.criteria.map((c) => ({
    criterion: t(`evaluations.criteria.${c.criterion}`),
    score: c.score,
    fullMark: 5,
  }));

  const history = allEvaluations
    .filter((e) => e.employeeId === evaluation.employeeId && e.id !== evaluation.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {t("evaluations.radarTitle")} — {getEmpName(employees, evaluation.employeeId)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-1.5 sm:gap-3 text-xs sm:text-sm">
            <span>
              <strong>{t("evaluations.columns.evaluator")}:</strong>{" "}
              {getEmpName(employees, evaluation.evaluatorId)}
            </span>
            <span>
              <strong>{t("evaluations.columns.period")}:</strong> {evaluation.period}
            </span>
            <Badge variant={evaluation.status === "final" ? "default" : "secondary"}>
              {t(`evaluations.status.${evaluation.status}`)}
            </Badge>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
              <PolarGrid />
              <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 8 }} />
              <Radar
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>

          <div className="space-y-1.5">
            {evaluation.criteria.map((c) => (
              <div key={c.criterion} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">
                    {t(`evaluations.criteria.${c.criterion}`)}
                  </span>
                  <StarRating value={c.score} readonly />
                </div>
                {c.comment && (
                  <p className="text-xs text-muted-foreground italic mt-1">{c.comment}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t("evaluations.dialog.averageScore")}:
            </span>
            <span className="text-lg font-bold">{evaluation.averageScore.toFixed(2)}</span>
            <span className="text-muted-foreground text-sm">/ 5</span>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold mb-2">{t("evaluations.history")}</h4>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("evaluations.noHistory")}</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 text-sm rounded-md border p-2"
                  >
                    <span className="font-medium">{h.period}</span>
                    <StarRating value={Math.round(h.averageScore)} readonly />
                    <span className="text-muted-foreground">
                      ({h.averageScore.toFixed(2)})
                    </span>
                    <Badge variant={h.status === "final" ? "default" : "secondary"}>
                      {t(`evaluations.status.${h.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
