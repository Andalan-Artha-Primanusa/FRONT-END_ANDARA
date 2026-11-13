import React from "react";
import { Building2 } from "lucide-react";
import { useAuthStore } from "@/app/store/auth.store";
import "./CompanyScopeBadge.css";

const CompanyScopeBadge: React.FC<{ className?: string }> = ({ className }) => {
  const selectedCompanyId = useAuthStore((state) => state.selectedCompanyId);
  const companyContext = useAuthStore((state) => state.companyContext);

  let label = "Scope company aktif";

  if (selectedCompanyId === "all") {
    label = "HO / Semua Company";
  } else if (typeof selectedCompanyId === "number") {
    const matched = companyContext?.companies.find((company) => company.id === selectedCompanyId);
    label = matched ? matched.name : `Company #${selectedCompanyId}`;
  } else if (selectedCompanyId === null && companyContext?.can_view_all) {
    label = "HO / Semua Company";
  } else if (selectedCompanyId === null && companyContext?.selected_company_id) {
    const matched = companyContext.companies.find((company) => company.id === companyContext.selected_company_id);
    label = matched ? matched.name : `Company #${companyContext.selected_company_id}`;
  }

  return (
    <span className={`company-scope-badge ${className ?? ""}`} title={label}>
      <Building2 size={13} aria-hidden="true" />
      <span className="company-scope-badge-label">Scope:&nbsp;</span>
      <strong>{label}</strong>
    </span>
  );
};

export default CompanyScopeBadge;