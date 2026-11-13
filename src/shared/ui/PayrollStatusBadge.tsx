import React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  HelpCircle,
  Wallet,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PayrollStatus } from "@/features/payroll/types/payroll.types";
import "./PayrollStatusBadge.css";

interface PayrollStatusBadgeProps {
  status: PayrollStatus;
  size?: "sm" | "md" | "lg";
}

type StatusConfig = {
  label: string;
  className: string;
  icon: LucideIcon;
};

const getStatusConfig = (status: PayrollStatus | string): StatusConfig => {
  switch (String(status || "").toLowerCase()) {
    case "draft":
      return { label: "Draft", className: "status-draft", icon: CircleDashed };
    case "pending_hr":
      return { label: "Menunggu HR", className: "status-pending-hr", icon: Clock3 };
    case "pending":
      return { label: "Pending", className: "status-pending", icon: Clock3 };
    case "approved":
      return { label: "Disetujui", className: "status-approved", icon: CheckCircle2 };
    case "paid":
      return { label: "Dibayar", className: "status-paid", icon: Wallet };
    case "rejected":
      return { label: "Ditolak", className: "status-rejected", icon: XCircle };
    default:
      return { label: String(status || "Unknown"), className: "status-default", icon: HelpCircle };
  }
};


/**
 * Reusable status badge component for payroll items.
 * Icon source is standardized to lucide-react for consistency across tables.
 */
export const PayrollStatusBadge: React.FC<PayrollStatusBadgeProps> = ({ status, size = "md" }) => {
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <span className={`payroll-status-badge ${config.className} size-${size}`}>
      <span className="status-icon" aria-hidden="true">
        <StatusIcon size={14} />
      </span>
      <span className="status-label">{config.label}</span>
    </span>
  );
};

export default PayrollStatusBadge;
