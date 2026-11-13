import { useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { TextArea } from "@/shared/ui/Form";

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title?: string;
  placeholder?: string;
  confirmLabel?: string;
}

export const RejectReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Alasan Penolakan",
  placeholder = "Masukkan alasan penolakan (opsional)...",
  confirmLabel = "Tolak",
}: RejectReasonModalProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(reason);
      setReason("");
      onClose();
    } catch (err) {
      console.error("Reject reason submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", width: "100%" }}>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <TextArea
        placeholder={placeholder}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        autoFocus
      />
    </Modal>
  );
};
