import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import "./ConfirmDialog.css";

type ConfirmDialogVariant = "danger" | "warning";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title = "Konfirmasi Hapus",
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const Icon = variant === "danger" ? Trash2 : AlertTriangle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "warning"}
            size="md"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={`confirm-dialog confirm-dialog--${variant}`}>
        <div className="confirm-dialog__icon">
          <Icon size={24} />
        </div>
        <p className="confirm-dialog__message">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
