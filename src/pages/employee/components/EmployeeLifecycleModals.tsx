import React from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";

interface EmployeeLifecycleModalsProps {
  activeActionModal: "onboarding_start" | "onboarding_complete" | "offboarding_start" | "offboarding_complete" | null;
  setActiveActionModal: (val: "onboarding_start" | "onboarding_complete" | "offboarding_start" | "offboarding_complete" | null) => void;
  onboardingDate: string;
  setOnboardingDate: (val: string) => void;
  offboardingDate: string;
  setOffboardingDate: (val: string) => void;
  offboardingReason: string;
  setOffboardingReason: (val: string) => void;
  handleLifecycleAction: () => void;
  loading: boolean;
}

const EmployeeLifecycleModals: React.FC<EmployeeLifecycleModalsProps> = ({
  activeActionModal,
  setActiveActionModal,
  onboardingDate,
  setOnboardingDate,
  offboardingDate,
  setOffboardingDate,
  offboardingReason,
  setOffboardingReason,
  handleLifecycleAction,
  loading,
}) => {
  return (
    <>
      <Modal isOpen={activeActionModal === "onboarding_start"} onClose={() => setActiveActionModal(null)} title="Mulai Onboarding">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Tanggal Akhir Percobaan (Probation)</label>
            <input type="date" className="form-input" value={onboardingDate} onChange={e => setOnboardingDate(e.target.value)} />
          </div>
          <div className="form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <Button variant="outline" size="sm" onClick={() => setActiveActionModal(null)}>Batal</Button>
            <Button variant="primary" size="sm" onClick={handleLifecycleAction} disabled={loading}>Mulai Onboarding</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeActionModal === "offboarding_start"} onClose={() => setActiveActionModal(null)} title="Mulai Offboarding">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Tanggal Berhenti</label>
            <input type="date" className="form-input" value={offboardingDate} onChange={e => setOffboardingDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Alasan Berhenti</label>
            <input type="text" className="form-input" placeholder="Pensiun, Resign, dll." value={offboardingReason} onChange={e => setOffboardingReason(e.target.value)} />
          </div>
          <div className="form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <Button variant="outline" size="sm" onClick={() => setActiveActionModal(null)}>Batal</Button>
            <Button variant="primary" size="sm" onClick={handleLifecycleAction} disabled={loading} style={{ backgroundColor: "#dc2626", color: "#fff", borderColor: "#dc2626" }}>Proses Offboarding</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EmployeeLifecycleModals;
