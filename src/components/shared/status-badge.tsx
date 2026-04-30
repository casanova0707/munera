import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus, ExpenseStatus, OvertimeStatus } from "@/types/database";
import {
  EXPENSE_STATUS_LABELS,
  OVERTIME_STATUS_LABELS,
} from "@/lib/constants";

type StatusType = ApprovalStatus | ExpenseStatus | OvertimeStatus;

const variantMap: Record<string, "alert" | "pending" | "success" | "default"> = {
  pending: "pending",
  submitted: "pending",
  pre_detected: "pending",
  acknowledged: "pending",
  approved: "success",
  paid: "success",
  rejected: "alert",
  on_hold: "default",
  draft: "default",
};

interface StatusBadgeProps {
  status: StatusType;
  type?: "expense" | "overtime" | "approval";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const variant = variantMap[status] ?? "default";
  let label = status.toUpperCase();

  if (type === "expense") {
    label = EXPENSE_STATUS_LABELS[status] ?? status;
  } else if (type === "overtime") {
    label = OVERTIME_STATUS_LABELS[status] ?? status;
  }

  return <Badge variant={variant}>{label}</Badge>;
}
